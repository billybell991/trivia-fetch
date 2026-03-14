import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

const SEGMENTS = [
  { id: 'disney',      name: 'Disney',       emoji: '🏰', color: '#9B59B6' },
  { id: 'harrypotter', name: 'Harry Potter',  emoji: '⚡', color: '#AE1438' },
  { id: 'horror',      name: 'Horror',        emoji: '🎃', color: '#34495E' },
  { id: 'animals',     name: 'Animals',       emoji: '🐾', color: '#27AE60' },
  { id: 'tv',          name: 'TV Shows',      emoji: '📺', color: '#3498DB' },
  { id: 'movies',      name: 'Movies',        emoji: '🎬', color: '#E67E22' },
  { id: 'music',       name: 'Music',         emoji: '🎵', color: '#E91E63' },
  { id: 'science',     name: 'Science',       emoji: '🔬', color: '#00BCD4' },
  { id: 'crown',       name: 'Crown',         emoji: '👑', color: '#F1C40F' },
  { id: 'wild',        name: "Gus's Wild",    emoji: '🐕', color: '#FF9800' },
];

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

const WHEEL_SIZE = 290;

const Wheel = forwardRef(({ onSpinComplete, disabled }, ref) => {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);

  const drawWheel = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = WHEEL_SIZE;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 8;
    const segCount = SEGMENTS.length;
    const segAngle = (2 * Math.PI) / segCount;

    ctx.clearRect(0, 0, size, size);

    // Outer glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 179, 71, 0.15)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw segments
    for (let i = 0; i < segCount; i++) {
      const seg = SEGMENTS[i];
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Gradient fill for each segment
      const midAngle = startAngle + segAngle / 2;
      const gx = Math.cos(midAngle) * radius * 0.5;
      const gy = Math.sin(midAngle) * radius * 0.5;
      const grad = ctx.createRadialGradient(0, 0, radius * 0.2, gx, gy, radius);
      grad.addColorStop(0, lightenColor(seg.color, 30));
      grad.addColorStop(1, seg.color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Emoji
      ctx.save();
      ctx.rotate(midAngle);
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.emoji, radius * 0.62, 0);

      // Short name
      ctx.font = 'bold 8px Fredoka, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(seg.name.length > 10 ? seg.name.substring(0, 9) + '…' : seg.name, radius * 0.38, 0);
      ctx.restore();
    }

    ctx.restore();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 28);
    centerGrad.addColorStop(0, '#FFD580');
    centerGrad.addColorStop(1, '#FFB347');
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.strokeStyle = '#F0A500';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Gus emoji in center
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐕', cx, cy);

    // Pointer triangle at top (pointing DOWN into the wheel)
    ctx.beginPath();
    ctx.moveTo(cx, 24);
    ctx.lineTo(cx - 14, 2);
    ctx.lineTo(cx + 14, 2);
    ctx.closePath();
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
    ctx.strokeStyle = '#E55A5A';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  useImperativeHandle(ref, () => ({
    spinTo(segmentIndex) {
      setSpinning(true);

      const segAngle = 360 / SEGMENTS.length;
      const targetStopAngle = segmentIndex * segAngle + segAngle / 2;
      const currentAngle = rotationRef.current;
      const currentMod = ((currentAngle % 360) + 360) % 360;

      let delta = targetStopAngle - currentMod;
      if (delta < 0) delta += 360;

      const fullSpins = (3 + Math.floor(Math.random() * 3)) * 360;
      const totalDelta = fullSpins + delta;

      const startAngle = currentAngle;
      const duration = 3500;
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        rotationRef.current = startAngle + totalDelta * eased;
        drawWheel(rotationRef.current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setSpinning(false);
          onSpinComplete?.(segmentIndex);
        }
      };

      requestAnimationFrame(animate);
    },
  }));

  return (
    <div className="wheel-container">
      <canvas
        ref={canvasRef}
        style={{ borderRadius: '50%', display: 'block' }}
      />
    </div>
  );
});

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
  const b = Math.min(255, (num & 0xFF) + amount);
  return `rgb(${r},${g},${b})`;
}

export default Wheel;
