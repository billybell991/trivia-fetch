import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import Lobby from './components/Lobby';
import Game from './components/Game';

function getPlayerId() {
  let id = sessionStorage.getItem('tf-player-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('tf-player-id', id);
  }
  return id;
}

const playerId = getPlayerId();

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | waiting | game | gameover
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [toast, setToast] = useState(null);
  const [gusMessage, setGusMessage] = useState("Woof! I'm Gus, your host! Let's play! 🎾");
  const [winner, setWinner] = useState(null);

  const showToast = useCallback((msg, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => {
    const tryReconnect = () => {
      socket.emit('reconnect-attempt', { playerId }, (res) => {
        if (res.error) return;
        setPlayerName(res.playerName);
        setRoomCode(res.roomCode);
        setPlayers(res.players);
        setIsHost(res.isHost);
        if (res.gameState) {
          setGameState(res.gameState);
          setScreen('game');
        } else {
          setScreen('waiting');
        }
        showToast('Reconnected! 🐕');
      });
    };

    if (socket.connected) tryReconnect();
    socket.on('connect', tryReconnect);

    socket.on('player-joined', ({ players }) => {
      setPlayers(players);
      showToast(`${players[players.length - 1].name} joined! 🐾`);
    });

    socket.on('player-rejoined', ({ playerName: pn, players: pl }) => {
      setPlayers(pl);
      showToast(`${pn} is back! 🐕`);
    });

    socket.on('player-left', ({ playerName: pn, players: pl }) => {
      setPlayers(pl);
      showToast(`${pn} left 😢`);
    });

    socket.on('game-started', ({ players: pl, activePlayerId, categories }) => {
      setPlayers(pl);
      setGameState({
        phase: 'spinning',
        activePlayerId,
        categories,
        scores: pl.map(p => ({ socketId: p.socketId, name: p.name, score: p.score, pawStamps: p.pawStamps })),
        pawStamps: {},
        streakCount: 0,
      });
      setScreen('game');
    });

    socket.on('gus-says', ({ message }) => {
      setGusMessage(message);
    });

    socket.on('game-over', ({ winnerName, scores, reason }) => {
      setWinner({ name: winnerName, scores, reason });
      setScreen('gameover');
    });

    socket.on('back-to-lobby', ({ players: pl }) => {
      setPlayers(pl);
      setGameState(null);
      setWinner(null);
      setScreen('waiting');
      setGusMessage("Ready for another round? Let's fetch more trivia! 🎾");
    });

    return () => {
      socket.off('connect');
      socket.off('player-joined');
      socket.off('player-rejoined');
      socket.off('player-left');
      socket.off('game-started');
      socket.off('gus-says');
      socket.off('game-over');
      socket.off('back-to-lobby');
    };
  }, [showToast]);

  const handleCreate = (name) => {
    socket.emit('create-room', { playerName: name, playerId }, (res) => {
      if (res.error) return showToast(res.error);
      setPlayerName(name);
      setRoomCode(res.roomCode);
      setPlayers(res.players);
      setIsHost(true);
      setScreen('waiting');
    });
  };

  const handleJoin = (name, code) => {
    socket.emit('join-room', { roomCode: code, playerName: name, playerId }, (res) => {
      if (res.error) return showToast(res.error);
      setPlayerName(name);
      setRoomCode(res.roomCode);
      setPlayers(res.players);
      setIsHost(false);
      setScreen('waiting');
    });
  };

  const handleStart = () => {
    socket.emit('start-game', (res) => {
      if (res.error) showToast(res.error);
    });
  };

  const handlePlayAgain = () => {
    socket.emit('play-again');
  };

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}

      {screen === 'lobby' && (
        <Lobby onCreateRoom={handleCreate} onJoinRoom={handleJoin} />
      )}

      {screen === 'waiting' && (
        <div className="waiting-room">
          <div className="logo-area">
            <span className="gus-mascot">🐕</span>
            <h1 className="game-title">Trivia Fetch!</h1>
          </div>

          <div className="room-code-display">
            <div className="room-code-label">Share this code</div>
            <div className="room-code-value">{roomCode}</div>
          </div>

          <div className="player-list">
            <h3>🐾 Players ({players.length}/6)</h3>
            {players.map((p, i) => (
              <div className="player-item" key={i}>
                <div className="player-avatar">{p.name[0].toUpperCase()}</div>
                <span className="player-name">{p.name}</span>
                {p.isHost && <span className="host-badge">HOST</span>}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={players.length < 2}
            >
              🎾 Start Game! {players.length < 2 ? '(Need 2+ players)' : ''}
            </button>
          ) : (
            <div className="waiting-gus">
              🐕 Gus says: "Waiting for the host to throw the ball... I mean start the game!"
            </div>
          )}
        </div>
      )}

      {screen === 'game' && gameState && (
        <Game
          socket={socket}
          playerName={playerName}
          roomCode={roomCode}
          gameState={gameState}
          setGameState={setGameState}
          gusMessage={gusMessage}
          showToast={showToast}
        />
      )}

      {screen === 'gameover' && winner && (
        <div className="game-over-screen">
          <div className="winner-crown">👑</div>
          <div className="winner-title">
            {winner.reason ? 'Game Over' : 'The Crown Goes To...'}
          </div>
          <div className="winner-name">
            {winner.name || winner.reason || 'Nobody'}
          </div>

          <div className="gus-bubble-area">
            <span className="gus-icon">🐕</span>
            <div className="gus-bubble">{gusMessage}</div>
          </div>

          {winner.scores && (
            <div className="final-scores">
              <h3>Final Scores</h3>
              {[...winner.scores]
                .sort((a, b) => b.score - a.score)
                .map((s, i) => (
                  <div className="final-score-item" key={i}>
                    <span className="final-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <span className="final-name">{s.name}</span>
                    <span className="final-score-val">{s.pawStamps.length} 🐾</span>
                  </div>
                ))}
            </div>
          )}

          {isHost && (
            <button className="btn btn-gold" onClick={handlePlayAgain}>
              🔄 Play Again!
            </button>
          )}
        </div>
      )}
    </div>
  );
}
