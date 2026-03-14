import React from 'react';

// Gus mascot — Gemini-generated images via BellForge-style AI bridge
// Variants: mascot (default), happy, wrong, thinking, wild, winner
export default function GusMascot({ size = 80, className = '', variant = 'mascot' }) {
  const validVariants = ['mascot', 'happy', 'wrong', 'thinking', 'wild', 'winner'];
  const v = validVariants.includes(variant) ? variant : 'mascot';
  const src = '/images/gus-' + v + '.png';

  return (
    <img
      src={src}
      alt={'Gus the Goldendoodle (' + v + ')'}
      className={className}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}
