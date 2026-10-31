import { useCallback, useEffect, useRef, useState } from "react";

/** The same media handling is used by the 2D pane and video/captions view. */
export default function SignVideo({ clip, className, onComplete, onFailure }) {
  const videoRef = useRef(null);
  const failedRef = useRef(false);
  const [needsPlay, setNeedsPlay] = useState(false);

  const reportFailure = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    onFailure(clip);
  }, [clip, onFailure]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const request = video.play();
    request?.catch((error) => {
      if (videoRef.current !== video || error.name === "AbortError") return;
      if (error.name === "NotAllowedError") setNeedsPlay(true);
      else reportFailure();
    });
  }, [reportFailure]);

  useEffect(() => { play(); }, [play]);

  return (
    <div className="sign-video-content">
      <video
        ref={videoRef}
        className={className}
        src={clip.video}
        autoPlay
        muted
        playsInline
        controls
        preload="auto"
        aria-label={`Sign video: ${clip.phrase}`}
        onPlaying={() => setNeedsPlay(false)}
        onEnded={() => onComplete(clip.playbackId)}
        onError={reportFailure}
      />
      {needsPlay && (
        <div className="sign-play-prompt" role="status">
          <p>Your browser paused autoplay.</p>
          <button type="button" className="button primary" onClick={play}>Play animation</button>
        </div>
      )}
    </div>
  );
}
