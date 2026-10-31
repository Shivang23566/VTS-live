import SignVideo from "./SignVideo";

export default function AnimationView({
  finalTranscript,
  interimTranscript,
  current,
  queuedCount,
  onComplete,
  onFailure,
  onClear,
}) {
  return (
    <section className="player-panel animation-view">
      <div className="animation-view-header">
        <p className="eyebrow">2D Teacher Animation</p>
        <span className={`anim-badge ${current ? "active" : "idle"}`}>
          {current ? "Sign matched" : "Ready"}
        </span>
      </div>

      <div className="anim-stage">
        <div className="speech-bubble">
          <p className="speech-text">{finalTranscript || "Speak a video title to see its animation."}</p>
          {interimTranscript && <p className="speech-interim">{interimTranscript}</p>}
          {current && (
            <p className="speech-sign">Now showing: <strong>{current.phrase}</strong></p>
          )}
        </div>

        <div className="character-display-box">
          {current ? (
            <SignVideo
              key={current.playbackId}
              clip={current}
              className="asha-live-video"
              onComplete={onComplete}
              onFailure={onFailure}
            />
          ) : (
            <div className="static-model-wrapper">
              <img src="/asha-model-static.png" alt="2D sign language teacher, ready" className="asha-model-img" />
              <div className="static-model-overlay">
                <span className="static-model-tag">Ready for the next phrase</span>
              </div>
            </div>
          )}
        </div>

        <div className="sign-playback-actions">
          {current && (
            <button className="button secondary" onClick={() => onComplete(current.playbackId)}>
              {queuedCount ? "Skip to next video" : "Return to static model"}
            </button>
          )}
          {queuedCount > 0 && <button className="button secondary" onClick={onClear}>Stop playback</button>}
        </div>
        <p className="queue-status" role="status">
          {current
            ? `${queuedCount} more video${queuedCount === 1 ? "" : "s"} queued. Videos start muted.`
            : "A matching video will appear here. Unmatched speech stays in captions."}
        </p>
      </div>
    </section>
  );
}
