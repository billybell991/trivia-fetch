import React, { useState, useEffect, useRef, useCallback } from 'react';
import Wheel from './Wheel';

const CATEGORIES = [
  { id: 'disney',      name: 'Disney',       emoji: '🏰', color: '#9B59B6' },
  { id: 'harrypotter', name: 'Harry Potter',  emoji: '⚡', color: '#AE1438' },
  { id: 'horror',      name: 'Horror',        emoji: '🎃', color: '#34495E' },
  { id: 'animals',     name: 'Animals',       emoji: '🐾', color: '#27AE60' },
  { id: 'tv',          name: 'TV Shows',      emoji: '📺', color: '#3498DB' },
  { id: 'movies',      name: 'Movies',        emoji: '🎬', color: '#E67E22' },
  { id: 'music',       name: 'Music',         emoji: '🎵', color: '#E91E63' },
  { id: 'science',     name: 'Science',       emoji: '🔬', color: '#00BCD4' },
];

const SEGMENT_MAP = {
  disney: { name: 'Disney', emoji: '🏰', color: '#9B59B6' },
  harrypotter: { name: 'Harry Potter', emoji: '⚡', color: '#AE1438' },
  horror: { name: 'Horror', emoji: '🎃', color: '#34495E' },
  animals: { name: 'Animals', emoji: '🐾', color: '#27AE60' },
  tv: { name: 'TV Shows', emoji: '📺', color: '#3498DB' },
  movies: { name: 'Movies', emoji: '🎬', color: '#E67E22' },
  music: { name: 'Music', emoji: '🎵', color: '#E91E63' },
  science: { name: 'Science', emoji: '🔬', color: '#00BCD4' },
  crown: { name: 'Crown Challenge', emoji: '👑', color: '#F1C40F' },
  wild: { name: "Gus's Wild", emoji: '🐕', color: '#FF9800' },
};

export default function Game({ socket, playerName, roomCode, gameState, setGameState, gusMessage, showToast }) {
  const wheelRef = useRef(null);
  const [phase, setPhase] = useState(gameState?.phase || 'spinning');
  const [activePlayerId, setActivePlayerId] = useState(gameState?.activePlayerId || null);
  const [scores, setScores] = useState(gameState?.scores || []);
  const [myStamps, setMyStamps] = useState([]);
  const [streakCount, setStreakCount] = useState(0);

  // Question state
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // { correct, correctIndex, funFact, stampEarned }
  const [timeLeft, setTimeLeft] = useState(20);
  const [loading, setLoading] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(null);

  // Stamp chooser
  const [choosingStamp, setChoosingStamp] = useState(false);

  const timerRef = useRef(null);
  const isMyTurn = activePlayerId === socket.id;

  // Find my stamps from scores
  useEffect(() => {
    const me = scores.find(s => s.socketId === socket.id);
    if (me) setMyStamps(me.pawStamps || []);
  }, [scores, socket.id]);

  // ── Socket Listeners ───────────────────────────────────
  useEffect(() => {
    const onWheelResult = ({ segmentIndex, segment, categoryId, spinnerName }) => {
      setCurrentSegment({ ...segment, categoryId });
      // Animate wheel for all players
      wheelRef.current?.spinTo(segmentIndex);
    };

    const onQuestionShow = ({ question: q, options: opts, timeLimit, activePlayerId: apId }) => {
      setQuestion(q);
      setOptions(opts);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(timeLimit);
      setPhase('question');
      setLoading(false);

      // Start timer
      clearInterval(timerRef.current);
      let t = timeLimit;
      timerRef.current = setInterval(() => {
        t--;
        setTimeLeft(t);
        if (t <= 0) {
          clearInterval(timerRef.current);
        }
      }, 1000);
    };

    const onAnswerResult = (result) => {
      clearInterval(timerRef.current);
      setAnswerResult(result);
      setPhase('result');

      if (result.scores) setScores(result.scores);
      if (typeof result.streakCount === 'number') setStreakCount(result.streakCount);
    };

    const onTurnUpdate = ({ activePlayerId: apId, state, choosingStamp: cs }) => {
      setActivePlayerId(apId);
      if (cs) {
        setChoosingStamp(true);
        setPhase('choosing');
      } else if (state === 'SPINNING' || state === 'spinning') {
        // Brief delay before showing next spin
        setTimeout(() => {
          setPhase('spinning');
          setQuestion(null);
          setOptions([]);
          setSelectedAnswer(null);
          setAnswerResult(null);
          setChoosingStamp(false);
          setCurrentSegment(null);
        }, state === 'SPINNING' && answerResult ? 2500 : 100);
      }
    };

    const onStampChosen = ({ playerName: pn, stampEarned, pawStamps }) => {
      setChoosingStamp(false);
      showToast(`${pn} chose the ${SEGMENT_MAP[stampEarned]?.name || stampEarned} stamp! 🐾`);
    };

    socket.on('wheel-result', onWheelResult);
    socket.on('question-show', onQuestionShow);
    socket.on('answer-result', onAnswerResult);
    socket.on('turn-update', onTurnUpdate);
    socket.on('stamp-chosen', onStampChosen);

    return () => {
      socket.off('wheel-result', onWheelResult);
      socket.off('question-show', onQuestionShow);
      socket.off('answer-result', onAnswerResult);
      socket.off('turn-update', onTurnUpdate);
      socket.off('stamp-chosen', onStampChosen);
      clearInterval(timerRef.current);
    };
  }, [socket, showToast]);

  // ── Handle timeout ─────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0 && phase === 'question' && isMyTurn && !answerResult) {
      socket.emit('answer-timeout', (res) => {});
    }
  }, [timeLeft, phase, isMyTurn, answerResult, socket]);

  // ── Actions ────────────────────────────────────────────
  const handleSpin = () => {
    if (!isMyTurn || phase !== 'spinning') return;
    socket.emit('spin-wheel', (res) => {
      if (res.error) return showToast(res.error);
      // Wheel animation triggered by wheel-result event
      // After animation, request question
      setTimeout(() => {
        setLoading(true);
        socket.emit('request-question', (qRes) => {
          if (qRes.error) {
            showToast(qRes.error);
            setLoading(false);
          }
          // Question will come via question-show event
        });
      }, 3800); // Wait for wheel animation
    });
  };

  const handleAnswer = (index) => {
    if (!isMyTurn || selectedAnswer !== null || phase !== 'question') return;
    setSelectedAnswer(index);
    clearInterval(timerRef.current);

    socket.emit('submit-answer', { answerIndex: index }, (res) => {
      if (res.error) showToast(res.error);
    });
  };

  const handleChooseStamp = (categoryId) => {
    socket.emit('choose-stamp', { categoryId }, (res) => {
      if (res.error) showToast(res.error);
    });
  };

  // ── Helpers ────────────────────────────────────────────
  const getActivePlayerName = () => {
    const p = scores.find(s => s.socketId === activePlayerId);
    return p?.name || '???';
  };

  const getTimerColor = () => {
    if (timeLeft > 10) return 'var(--secondary)';
    if (timeLeft > 5) return 'var(--accent-gold)';
    return 'var(--error)';
  };

  const getOptionClass = (index) => {
    if (!answerResult) {
      return selectedAnswer === index ? 'option-btn selected' : 'option-btn';
    }
    if (index === answerResult.correctIndex) return 'option-btn correct';
    if (selectedAnswer === index && !answerResult.correct) return 'option-btn wrong';
    return 'option-btn';
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="game-screen">
      {/* Header */}
      <div className="game-header">
        <div className="game-room-code">🐾 {roomCode}</div>
        <div className="game-turn-info">
          {isMyTurn ? "✨ Your Turn!" : `${getActivePlayerName()}'s turn`}
        </div>
      </div>

      {/* Gus Speech */}
      <div className="gus-bubble-area">
        <span className="gus-icon">🐕</span>
        <div className="gus-bubble" key={gusMessage}>{gusMessage}</div>
      </div>

      {/* ── SPINNING PHASE ── */}
      {phase === 'spinning' && (
        <div className="wheel-area">
          <Wheel ref={wheelRef} disabled={!isMyTurn} />
          {isMyTurn ? (
            <button className="btn btn-primary spin-btn" onClick={handleSpin}>
              🎾 Spin!
            </button>
          ) : (
            <div className="waiting-spin-text">
              Waiting for {getActivePlayerName()} to spin...
            </div>
          )}
        </div>
      )}

      {/* ── LOADING QUESTION ── */}
      {loading && phase === 'spinning' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {currentSegment && (
            <div
              className="question-category-badge bounce-in"
              style={{ background: SEGMENT_MAP[currentSegment.categoryId]?.color || currentSegment.color, display: 'inline-block', marginBottom: 12 }}
            >
              {SEGMENT_MAP[currentSegment.categoryId]?.emoji} {SEGMENT_MAP[currentSegment.categoryId]?.name || currentSegment.name}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <span className="gus-icon" style={{ fontSize: 28 }}>🐕</span>
            <p style={{ color: 'var(--text-light)', fontWeight: 600, marginTop: 4 }}>
              Gus is fetching your question
              <span className="loading-dots">
                <span></span><span></span><span></span>
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── QUESTION PHASE ── */}
      {phase === 'question' && question && (
        <div className="question-area">
          {currentSegment && (
            <div
              className="question-category-badge"
              style={{ background: SEGMENT_MAP[currentSegment.categoryId]?.color || '#999' }}
            >
              {SEGMENT_MAP[currentSegment.categoryId]?.emoji} {SEGMENT_MAP[currentSegment.categoryId]?.name}
            </div>
          )}

          <div className="question-card">
            <div className="question-text">{question}</div>
            <div className="timer-bar-container">
              <div
                className="timer-bar"
                style={{
                  width: `${(timeLeft / 20) * 100}%`,
                  backgroundColor: getTimerColor(),
                }}
              />
            </div>
            <div className="timer-text" style={{ color: timeLeft <= 5 ? 'var(--error)' : 'var(--text-light)' }}>
              {timeLeft > 0 ? `⏰ ${timeLeft}s` : "⏰ Time's up!"}
            </div>
          </div>

          <div className="options-grid">
            {options.map((opt, i) => (
              <button
                key={i}
                className={getOptionClass(i)}
                onClick={() => handleAnswer(i)}
                disabled={!isMyTurn || selectedAnswer !== null || timeLeft <= 0}
              >
                <span className="option-letter">{letters[i]}</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── RESULT PHASE ── */}
      {phase === 'result' && answerResult && (
        <div className="result-area">
          <div className={answerResult.correct ? 'bounce-in' : 'shake'}>
            <div className="result-icon">
              {answerResult.timedOut ? '⏰' : answerResult.correct ? '🎉' : '😅'}
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', color: answerResult.correct ? 'var(--success)' : 'var(--error)' }}>
            {answerResult.timedOut ? "Time's Up!" : answerResult.correct ? 'Correct!' : 'Oops!'}
          </h2>

          {!answerResult.correct && (
            <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>
              The answer was: <strong>{options[answerResult.correctIndex]}</strong>
            </p>
          )}

          {answerResult.stampEarned && (
            <div className="stamp-earned-banner">
              🐾 {SEGMENT_MAP[answerResult.stampEarned]?.emoji} {SEGMENT_MAP[answerResult.stampEarned]?.name} Stamp Earned!
            </div>
          )}

          {answerResult.funFact && (
            <div className="fun-fact">
              <span className="fun-fact-label">🐕 Gus's Fun Fact: </span>
              {answerResult.funFact}
            </div>
          )}

          {answerResult.correct && !answerResult.gameWon && isMyTurn && (
            <p style={{ color: 'var(--secondary)', fontFamily: 'var(--font-heading)', marginTop: 12, fontSize: 16 }}>
              🔥 Spin again!
            </p>
          )}
        </div>
      )}

      {/* ── CHOOSING STAMP (Gus's Wild reward) ── */}
      {phase === 'choosing' && choosingStamp && isMyTurn && (
        <div className="stamp-chooser">
          <h3>🐕 Pick a Paw Stamp!</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 12 }}>
            Gus's Wild reward — choose any stamp you need!
          </p>
          <div className="stamp-chooser-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="stamp-choose-btn"
                onClick={() => handleChooseStamp(cat.id)}
                disabled={myStamps.includes(cat.id)}
                style={myStamps.includes(cat.id) ? {} : { borderColor: cat.color }}
              >
                {cat.emoji} {cat.name}
                {myStamps.includes(cat.id) && ' ✓'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── My Paw Stamps ── */}
      <div className="paw-stamps-area">
        <div className="paw-stamps-title">Your Paw Stamps ({myStamps.length}/8)</div>
        <div className="paw-stamps-grid">
          {CATEGORIES.map(cat => {
            const earned = myStamps.includes(cat.id);
            return (
              <div
                key={cat.id}
                className={`paw-stamp ${earned ? 'earned' : 'empty'}`}
                style={earned ? { background: cat.color } : {}}
                title={cat.name}
              >
                {cat.emoji}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scoreboard ── */}
      <div className="scoreboard">
        <div className="scoreboard-title">Scoreboard</div>
        {scores.map((s, i) => {
          const isActive = s.socketId === activePlayerId;
          const isMe = s.socketId === socket.id;
          return (
            <div
              key={i}
              className={`score-item ${isActive ? 'active' : ''} ${isMe ? 'is-me' : ''}`}
            >
              <div className="player-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                {s.name[0].toUpperCase()}
              </div>
              <span className="score-name">
                {s.name} {isMe ? '(you)' : ''}
                {isActive && ' 🎯'}
              </span>
              <div className="score-stamps">
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    className={`score-mini-stamp ${s.pawStamps.includes(cat.id) ? '' : 'empty'}`}
                    style={s.pawStamps.includes(cat.id) ? { background: cat.color } : {}}
                    title={cat.name}
                  >
                    {s.pawStamps.includes(cat.id) ? '✓' : ''}
                  </div>
                ))}
              </div>
              <span className="score-points">{s.score}</span>
              {isActive && streakCount >= 2 && (
                <span className="streak-badge">🔥{streakCount}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
