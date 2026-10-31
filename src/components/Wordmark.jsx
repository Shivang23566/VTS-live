/**
 * Wordmark — Londrina Solid + Outline pairing (Woblen lookalike).
 * Purely visual. No logic.
 */
export default function Wordmark() {
  const letters = 'ShikshaSign'.split('');

  return (
    <div className="wordmark-container">
      {/* Brush-stroke shape behind */}
      <div className="wordmark-brush" aria-hidden="true" />

      {/* Solid layer */}
      <span className="wordmark-solid" aria-label="ShikshaSign">
        {letters.map((ch, i) => (
          <span key={i} className="wordmark-letter" aria-hidden="true">{ch}</span>
        ))}
        <span className="wordmark-star" aria-hidden="true">✦</span>
      </span>

      {/* Outline layer (offset) */}
      <span className="wordmark-outline" aria-hidden="true">
        {letters.map((ch, i) => (
          <span key={i} className="wordmark-letter">{ch}</span>
        ))}
      </span>

      {/* Hand-drawn underline */}
      <span className="wordmark-underline" aria-hidden="true">
        <svg viewBox="0 0 200 6" preserveAspectRatio="none" fill="none">
          <path
            d="M2 4 C30 2, 70 5, 100 3 S170 4, 198 2"
            stroke="#026670"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      </span>

      {/* "live" tag */}
      <span className="wordmark-live">
        <span className="wordmark-live-dot" aria-hidden="true" />
        live
      </span>
    </div>
  );
}

