import { useEffect, useRef, useState } from "react";

export default function ISLPlayer({ pendingVideo }) {
  const videoRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (pendingVideo) setQueue((items) => [...items, pendingVideo]);
  }, [pendingVideo]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((items) => items.slice(1));
    }
  }, [current, queue]);

  useEffect(() => {
    if (current) videoRef.current?.play().catch(() => undefined);
  }, [current]);

  return (
    <section className="player-panel">
      <p className="eyebrow">Verified ISL concept</p>
      {current ? (
        <video
          ref={videoRef}
          className="isl-video"
          src={current.video}
          controls
          onEnded={() => setCurrent(null)}
          aria-label={`Indian Sign Language: ${current.phrase}`}
        />
      ) : (
        <div className="video-placeholder">
          <span aria-hidden="true">◎</span>
          <p>Captions-only mode</p>
          <small>A verified sign will appear here when a supported concept is spoken.</small>
        </div>
      )}
      {queue.length > 0 && <p className="queue-status">{queue.length} sign{queue.length === 1 ? "" : "s"} queued</p>}
    </section>
  );
}
