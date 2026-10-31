import { useState, useEffect, useRef } from "react";

/**
 * Animation view — shows the 2D Teacher model (Asha from the video).
 * - When idle / waiting: displays the clean static model pose extracted from the video.
 * - When the phrase "hello today we will learn about sign language" is detected (or test button clicked):
 *   seamlessly transitions into playing the actual animated sign language video in place!
 * - When video finishes, seamlessly returns to static pose.
 */
export default function AnimationView({
  finalTranscript,
  interimTranscript,
  pendingVideo,
  onResetVideo,
}) {
  const videoRef = useRef(null);
  const [isPlayingAnim, setIsPlayingAnim] = useState(false);

  // When a concept video is matched, play the animation
  useEffect(() => {
    if (pendingVideo?.video) {
      setIsPlayingAnim(true);
    }
  }, [pendingVideo]);

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlayingAnim(false);
    if (onResetVideo) {
      onResetVideo();
    }
  };

  const displayText = finalTranscript || "Your lesson captions will appear here.";
  const matchedSign = pendingVideo?.phrase;

  return (
    <section className="player-panel animation-view">
      <div className="animation-view-header">
        <p className="eyebrow">2D Teacher Animation Preview</p>
        <span className={`anim-badge ${isPlayingAnim ? "active" : "idle"}`}>
          {isPlayingAnim ? "⚡ Signing Animation Active" : "⏸ Idle (Static Pose)"}
        </span>
      </div>

      <div className="anim-stage">
        {/* Speech Bubble */}
        <div className="speech-bubble">
          <p className="speech-text">{displayText}</p>
          {interimTranscript && (
            <p className="speech-interim">{interimTranscript}</p>
          )}
          {matchedSign && (
            <p className="speech-sign">
              🤟 Detected: <strong>{matchedSign}</strong>
            </p>
          )}
        </div>

        {/* Character / Animation Container */}
        <div className="character-display-box">
          {isPlayingAnim && pendingVideo?.video ? (
            <div className="video-player-wrapper">
              <video
                ref={videoRef}
                className="asha-live-video"
                src={pendingVideo.video}
                autoPlay
                playsInline
                onEnded={handleVideoEnded}
              />
              <button
                className="exit-anim-btn"
                onClick={handleVideoEnded}
                title="Return to static model"
              >
                ✕ Return to Static Model
              </button>
            </div>
          ) : (
            <div className="static-model-wrapper">
              <img
                src="/asha-model-static.png"
                alt="2D Sign Language Model"
                className="asha-model-img"
              />
              <div className="static-model-overlay">
                <span className="static-model-tag">Asha 2D Model (Ready)</span>
              </div>
            </div>
          )}
        </div>

        {/* Status / Instructions */}
        <div className="anim-footer-note">
          <span className={`anim-dot ${isPlayingAnim ? "active" : ""}`} />
          {isPlayingAnim
            ? "Playing animated sign language translation..."
            : "Listening for sign concepts"}
        </div>
      </div>
    </section>
  );
}
