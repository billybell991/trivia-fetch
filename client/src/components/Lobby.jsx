import React, { useState } from 'react';

export default function Lobby({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('menu'); // menu | join
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return setError('Enter your name first, pupper!');
    onCreateRoom(name.trim());
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Enter your name first!');
    if (!code.trim() || code.trim().length < 4) return setError('Enter a valid room code!');
    onJoinRoom(name.trim(), code.trim().toUpperCase());
  };

  return (
    <div className="lobby">
      <div className="logo-area">
        <span className="gus-mascot">🐕</span>
        <h1 className="game-title">Trivia Fetch!</h1>
        <p className="game-subtitle">Hosted by Gus the Goldendoodle 🎾</p>
      </div>

      <div className="lobby-card">
        <h2>🐾 What's your name?</h2>
        <div className="input-group">
          <input
            className="input-field"
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            maxLength={20}
            autoComplete="off"
          />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {mode === 'menu' && (
        <>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>
            🏠 Create Room
          </button>

          <div className="divider">or</div>

          <button className="btn btn-secondary" onClick={() => setMode('join')} disabled={!name.trim()}>
            🔗 Join a Room
          </button>
        </>
      )}

      {mode === 'join' && (
        <div className="lobby-card">
          <h2>Enter Room Code</h2>
          <div className="input-group">
            <input
              className="input-field room-code-input"
              type="text"
              placeholder="ABCD"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4));
                setError('');
              }}
              maxLength={4}
              autoComplete="off"
            />
            <button className="btn btn-secondary" onClick={handleJoin}>
              🐾 Join Game!
            </button>
            <button
              className="btn btn-small"
              style={{ background: 'transparent', color: 'var(--text-light)' }}
              onClick={() => setMode('menu')}
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
