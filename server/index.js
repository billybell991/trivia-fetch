// Trivia Fetch! — Express + Socket.IO Server
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createRoom, getRoom, getRoomByPlayer, getRoomByPlayerId, deleteRoom } from './game.js';
import { CATEGORIES, WHEEL_SEGMENTS, getGusReaction } from './trivia.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', `http://localhost:${PORT}`],
    methods: ['GET', 'POST'],
  },
});

// Serve built client
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// ─── Socket Handlers ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🐕 Player connected: ${socket.id}`);

  // Send categories/segments data to client
  socket.on('get-categories', (callback) => {
    callback({ categories: CATEGORIES, segments: WHEEL_SEGMENTS });
  });

  // ── Reconnection ────────────────────────────────────────
  socket.on('reconnect-attempt', ({ playerId }, callback) => {
    if (!playerId) return callback({ error: 'No player ID' });
    const room = getRoomByPlayerId(playerId);
    if (!room) return callback({ error: 'No active game' });

    const player = room.reconnectPlayer(playerId, socket.id);
    if (!player) return callback({ error: 'Could not reconnect' });

    socket.join(room.roomCode);
    const fullState = room.getFullState(socket.id);
    callback({ success: true, ...fullState });

    socket.to(room.roomCode).emit('player-rejoined', {
      playerName: player.name,
      players: room.getPlayerList(),
    });
    console.log(`🐕 ${player.name} reconnected to room ${room.roomCode}`);
  });

  // ── Create Room ─────────────────────────────────────────
  socket.on('create-room', ({ playerName, playerId }, callback) => {
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return callback({ error: 'Name is required' });
    }
    const name = playerName.trim().substring(0, 20);
    const room = createRoom(socket.id, name);

    if (playerId) {
      const player = room.players.get(socket.id);
      if (player) player.playerId = playerId;
      room.playerIdMap.set(playerId, socket.id);
    }

    socket.join(room.roomCode);
    callback({ roomCode: room.roomCode, players: room.getPlayerList() });
    console.log(`🏠 Room ${room.roomCode} created by ${name}`);
  });

  // ── Join Room ───────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName, playerId }, callback) => {
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return callback({ error: 'Name is required' });
    }
    if (!roomCode || typeof roomCode !== 'string') {
      return callback({ error: 'Room code is required' });
    }

    const name = playerName.trim().substring(0, 20);
    const code = roomCode.trim().toUpperCase();
    const room = getRoom(code);

    if (!room) return callback({ error: 'Room not found 🐾' });
    if (room.players.size >= 6) return callback({ error: 'Room is full! (max 6)' });

    const result = room.addPlayer(socket.id, name, playerId);
    if (result.error) return callback(result);

    socket.join(code);
    const players = room.getPlayerList();
    callback({ roomCode: code, players });
    socket.to(code).emit('player-joined', { players });
    console.log(`🐾 ${name} joined room ${code}`);
  });

  // ── Start Game ──────────────────────────────────────────
  socket.on('start-game', (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback({ error: 'Only the host can start' });

    const result = room.startGame();
    if (result.error) return callback(result);

    callback({ success: true });

    io.to(room.roomCode).emit('game-started', {
      players: room.getPlayerList(),
      activePlayerId: room.getActivePlayerId(),
      categories: CATEGORIES,
    });

    // Send Gus greeting
    sendGusReaction(room, 'game_start', {
      detail: `Game starting with ${room.playerOrder.length} players!`,
    });

    console.log(`🎮 Game started in room ${room.roomCode}`);
  });

  // ── Spin Wheel ──────────────────────────────────────────
  socket.on('spin-wheel', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (socket.id !== room.getActivePlayerId()) return callback({ error: 'Not your turn' });

    const result = room.spinWheel();
    if (result.error) return callback(result);

    callback({ success: true, ...result });

    // Broadcast spin to all players
    io.to(room.roomCode).emit('wheel-result', {
      segmentIndex: result.segmentIndex,
      segment: result.segment,
      categoryId: result.categoryId,
      spinnerName: room.getActivePlayer().name,
    });

    // Send Gus reaction for special segments
    if (result.categoryId === 'crown') {
      sendGusReaction(room, 'crown_attempt', { playerName: room.getActivePlayer().name });
    } else if (result.categoryId === 'crown_not_ready') {
      sendGusReaction(room, 'crown_not_ready', { playerName: room.getActivePlayer().name });
    } else if (result.categoryId === 'wild') {
      sendGusReaction(room, 'wild', { playerName: room.getActivePlayer().name });
    }
  });

  // ── Request Question (after wheel animation) ────────────
  socket.on('request-question', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });

    try {
      const question = await room.fetchQuestion();
      callback({ success: true, ...question });

      // Broadcast question to all players (so spectators can see)
      io.to(room.roomCode).emit('question-show', {
        question: question.question,
        options: question.options,
        timeLimit: question.timeLimit,
        activePlayerId: room.getActivePlayerId(),
      });

      // Server-side timeout backup
      room.answerTimer = setTimeout(() => {
        const result = room.handleTimeout(room.getActivePlayerId());
        if (result) {
          io.to(room.roomCode).emit('answer-result', result);
          sendGusReaction(room, 'timeout', { playerName: room.getActivePlayer()?.name });
          io.to(room.roomCode).emit('turn-update', {
            activePlayerId: room.getActivePlayerId(),
            state: room.state,
          });
        }
      }, (question.timeLimit + 1) * 1000);
    } catch (e) {
      callback({ error: 'Failed to generate question' });
    }
  });

  // ── Submit Answer ───────────────────────────────────────
  socket.on('submit-answer', async ({ answerIndex }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });

    const result = room.submitAnswer(socket.id, answerIndex);
    if (result.error) return callback(result);

    callback({ success: true, ...result });

    // Broadcast result to all
    io.to(room.roomCode).emit('answer-result', result);

    // Gus reacts
    const player = room.players.get(socket.id);
    const playerName = player?.name || 'someone';

    if (result.gameWon) {
      sendGusReaction(room, 'win', { playerName });
      io.to(room.roomCode).emit('game-over', {
        winnerName: result.winnerName,
        scores: result.scores,
      });
    } else if (result.correct) {
      if (result.stampEarned) {
        sendGusReaction(room, 'stamp', { playerName, detail: `earned the ${result.stampEarned} stamp` });
      } else if (result.streakCount >= 3) {
        sendGusReaction(room, 'streak', { playerName, detail: `${result.streakCount} in a row!` });
      } else {
        sendGusReaction(room, 'correct', { playerName });
      }
    } else {
      sendGusReaction(room, 'wrong', { playerName });
    }

    // Notify about turn/state change
    io.to(room.roomCode).emit('turn-update', {
      activePlayerId: room.getActivePlayerId(),
      state: room.state,
      choosingStamp: result.choosingStamp,
    });
  });

  // ── Choose Stamp (Gus's Wild reward) ────────────────────
  socket.on('choose-stamp', ({ categoryId }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });

    const result = room.chooseStamp(socket.id, categoryId);
    if (result.error) return callback(result);

    callback({ success: true, ...result });

    const player = room.players.get(socket.id);
    io.to(room.roomCode).emit('stamp-chosen', {
      playerName: player?.name,
      stampEarned: result.stampEarned,
      pawStamps: result.pawStamps,
    });

    sendGusReaction(room, 'stamp', {
      playerName: player?.name,
      detail: `chose the ${result.stampEarned} stamp from Gus's Wild!`,
    });

    io.to(room.roomCode).emit('turn-update', {
      activePlayerId: room.getActivePlayerId(),
      state: room.state,
    });
  });

  // ── Timeout (client-reported) ───────────────────────────
  socket.on('answer-timeout', (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });

    const result = room.handleTimeout(socket.id);
    if (!result) return callback?.({ error: 'Not in question phase' });

    callback?.({ success: true, ...result });

    io.to(room.roomCode).emit('answer-result', result);
    sendGusReaction(room, 'timeout', { playerName: room.players.get(socket.id)?.name });

    io.to(room.roomCode).emit('turn-update', {
      activePlayerId: room.getActivePlayerId(),
      state: room.state,
    });
  });

  // ── Play Again ──────────────────────────────────────────
  socket.on('play-again', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    if (socket.id !== room.hostId) return;

    room.resetToLobby();
    io.to(room.roomCode).emit('back-to-lobby', {
      players: room.getPlayerList(),
    });
  });

  // ── Disconnect ──────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const player = room.players.get(socket.id);
    const playerName = player?.name || 'Unknown';
    const playerId = player?.playerId;

    if (playerId && room.state !== 'LOBBY') {
      // Give them 60s to reconnect during a game
      room.disconnectTimers.set(playerId, setTimeout(() => {
        room.removePlayer(socket.id);
        room.disconnectTimers.delete(playerId);

        if (room.players.size === 0) {
          deleteRoom(room.roomCode);
          console.log(`🗑️  Room ${room.roomCode} deleted (empty)`);
        } else {
          io.to(room.roomCode).emit('player-left', {
            playerName,
            players: room.getPlayerList(),
          });
        }
      }, 60000));
      console.log(`⏸️  ${playerName} disconnected from ${room.roomCode} (60s grace)`);
    } else {
      room.removePlayer(socket.id);

      if (room.players.size === 0) {
        deleteRoom(room.roomCode);
        console.log(`🗑️  Room ${room.roomCode} deleted (empty)`);
      } else {
        io.to(room.roomCode).emit('player-left', {
          playerName,
          players: room.getPlayerList(),
        });
        if (room.state === 'GAME_OVER') {
          io.to(room.roomCode).emit('game-over', {
            winnerName: null,
            reason: 'Not enough players',
            scores: room.getScores(),
          });
        }
      }
      console.log(`👋 ${playerName} left room ${room.roomCode}`);
    }
  });
});

// ─── Gus Reaction Helper (non-blocking) ───────────────────────
async function sendGusReaction(room, event, context = {}) {
  try {
    const msg = await getGusReaction(event, context);
    io.to(room.roomCode).emit('gus-says', { message: msg });
  } catch {
    // Non-critical — skip silently
  }
}

// ─── Start Server ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  🐕 ═══════════════════════════════════════ 🐕
  ║                                           ║
  ║    TRIVIA FETCH! by Gus the Goldendoodle  ║
  ║    Server running on port ${PORT}             ║
  ║    "Let's fetch some knowledge!" 🎾       ║
  ║                                           ║
  🐕 ═══════════════════════════════════════ 🐕
  `);
});
