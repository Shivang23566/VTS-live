export default function LiveCaptions({ finalTranscript, interimTranscript }) {
  return (
    <section className="captions-panel" aria-live="polite">
      <p className="eyebrow">Live captions</p>
      <p className="caption-final">{finalTranscript || "Your lesson captions will appear here."}</p>
      {interimTranscript && <p className="caption-interim">{interimTranscript}</p>}
    </section>
  );
}
