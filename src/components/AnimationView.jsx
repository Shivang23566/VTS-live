import AvatarCanvas from "./AvatarCanvas";
import { useState } from "react";

export default function AnimationView({ animation, onFailure }) {
  const { current, queuedCount, connection, glosses, pending, catalog } = animation;
  const [speed, setSpeed] = useState(0.75);
  return (
    <section className="player-panel animation-view">
      <div className="animation-view-header">
        <p className="eyebrow">Live ASL avatar</p>
        <span className={`anim-badge ${current ? "active" : "idle"}`}>
          {current ? "Signing" : connection === "connected" ? "Connected" : "Offline"}
        </span>
      </div>
      <AvatarCanvas clip={current} speed={speed} onComplete={animation.advance} onFailure={onFailure} />
      <div className="animation-glosses" aria-label="ASL vocabulary sequence">
        {glosses.map((gloss, index) => <span key={`${index}-${gloss}`}>{gloss}</span>)}
      </div>
      <div className="sign-playback-actions">
        <label className="animation-speed">Motion speed
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value={0.5}>Slow · 0.5×</option><option value={0.75}>Comfortable · 0.75×</option><option value={1}>Normal · 1×</option>
          </select>
        </label>
        {(current || pending > 0) && <button className="button secondary" onClick={animation.cancel}>Stop animation</button>}
        {connection !== "connected" && <button className="button secondary" onClick={animation.reconnect}>Reconnect animation</button>}
      </div>
      <p className="queue-status" role="status">{current ? `${queuedCount} signs queued` : pending ? "Preparing motion…" : "Choose an example or speak a supported phrase."}</p>
      <p className="animation-disclosure">{catalog?.notice || "Experimental American Sign Language avatar. Captions remain the primary transcript."}</p>
    </section>
  );
}
