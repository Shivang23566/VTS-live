import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_FRAMES = 70;

// Build the list of image paths once
const framePaths = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const num = String(i + 1).padStart(3, "0");
  return `/animation/ezgif-frame-${num}.png`;
});

export default function ScrollAnimation() {
  const wrapperRef = useRef(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  // Preload all images
  useEffect(() => {
    let count = 0;
    let cancelled = false;

    framePaths.forEach((src) => {
      const img = new Image();
      img.src = src;
      const done = () => {
        count++;
        if (!cancelled && count >= TOTAL_FRAMES) setLoaded(true);
      };
      img.onload = done;
      img.onerror = done;
    });

    return () => { cancelled = true; };
  }, []);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const scrollableHeight = rect.height - window.innerHeight;
        if (scrollableHeight <= 0) return;

        const scrolled = -rect.top;
        const pct = Math.min(1, Math.max(0, scrolled / scrollableHeight));
        const idx = Math.min(TOTAL_FRAMES - 1, Math.floor(pct * TOTAL_FRAMES));

        setProgress(pct);
        setCurrentFrame(idx);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const frameNumber = String(currentFrame + 1).padStart(3, "0");
  const src = `/animation/ezgif-frame-${frameNumber}.png`;

  return (
    <div ref={wrapperRef} className="scroll-anim-wrapper">
      <div className="scroll-anim-sticky">
        {!loaded && (
          <div className="scroll-anim-loader">
            <p>Loading animation frames…</p>
          </div>
        )}

        <img
          src={src}
          alt={`Animation frame ${currentFrame + 1}`}
          className="scroll-anim-img"
        />

        {/* Progress bar */}
        <div className="scroll-anim-progress">
          <div
            className="scroll-anim-progress-bar"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Scroll hint */}
        {progress < 0.03 && (
          <p className="scroll-anim-hint">↓ Scroll to explore</p>
        )}
      </div>
    </div>
  );
}
