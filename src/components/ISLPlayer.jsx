import SignVideo from "./SignVideo";

export default function ISLPlayer({ current, queuedCount, onComplete, onFailure, onClear }) {
  return (
    <section className="player-panel">
      <p className="eyebrow">Lesson sign video</p>
      {current ? (
        <>
          <p className="speech-sign">Now showing: <strong>{current.phrase}</strong></p>
          <SignVideo
            key={current.playbackId}
            clip={current}
            className="isl-video"
            onComplete={onComplete}
            onFailure={onFailure}
          />
          <div className="sign-playback-actions">
            <button className="button secondary" onClick={() => onComplete(current.playbackId)}>Skip video</button>
            {queuedCount > 0 && <button className="button secondary" onClick={onClear}>Stop playback</button>}
          </div>
        </>
      ) : (
        <div className="video-placeholder">
          <p>Captions-only mode</p>
          <small>A video appears when you speak a supported title.</small>
        </div>
      )}
      {queuedCount > 0 && <p className="queue-status" role="status">{queuedCount} more videos queued</p>}
    </section>
  );
}
