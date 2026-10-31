import { useState, useCallback } from "react";
import ScrollAnimation from "./ScrollAnimation";
import Wordmark from "./Wordmark";
import Nav from "./Nav";

/**
 * Landing / hero section shown before the classroom.
 * Contains the scroll-driven frame animation and a CTA.
 * The animation owns its local scroll progress so copy and frames stay in sync.
 */
export default function LandingPage({ onEnter }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const handleAnimationProgress = useCallback((progress) => {
    setScrollProgress(progress);
  }, []);

  // Compute copy visibility
  const stage1Opacity = scrollProgress < 0.05 ? 1 : scrollProgress < 0.15 ? 1 - (scrollProgress - 0.05) / 0.1 : 0;
  const stage1Y = scrollProgress < 0.05 ? 0 : -(scrollProgress - 0.05) * 200;

  const stage2Opacity = scrollProgress > 0.3 && scrollProgress < 0.6
    ? Math.min(1, (scrollProgress - 0.3) / 0.1)
    : scrollProgress >= 0.6 && scrollProgress < 0.75
      ? 1 - (scrollProgress - 0.6) / 0.15
      : 0;
  const stage2Y = scrollProgress > 0.3 ? Math.max(0, (0.4 - scrollProgress) * 100) : 20;

  return (
    <section className="landing">
      <Nav onEnter={onEnter} />

      {/* Hero with wordmark */}
      <div className="landing-hero">
        <Wordmark />
        <p className="landing-subtitle">
          Real-time sign language interpretation for every classroom.
        </p>
      </div>

      {/* Scroll-driven animation — core logic untouched */}
      <div className="scroll-scene-container">
        <ScrollAnimation onProgress={handleAnimationProgress} />

        {/* Sticky overlay for scroll-linked copy */}
        <div className="scroll-copy-sticky">
          {/* Stage 1 copy — scroll linked */}
          <div
            className="landing-scroll-copy stage-1"
            style={{
              opacity: stage1Opacity,
              transform: `translateY(${stage1Y}px)`,
            }}
          >
            <p className="eyebrow">Speech to sign, live</p>
            <p>
              ShikshaSign turns a teacher's spoken words into sign-language animation,
              so every deaf student can follow the lesson.
            </p>
          </div>

          {/* Stage 2 copy — scroll linked */}
          <div
            className="landing-scroll-copy stage-2"
            style={{
              opacity: stage2Opacity,
              transform: `translateY(${stage2Y}px)`,
            }}
          >
            <h2>Speak. We translate.</h2>
            <p>
              Students see each word signed on screen as the lesson unfolds.
            </p>
          </div>
        </div>

        <div
          className="landing-scroll-copy stage-3"
          style={{
            opacity: scrollProgress > 0.72 ? Math.min(1, (scrollProgress - 0.72) / 0.1) : 0,
            transform: `translateY(${scrollProgress > 0.72 ? Math.max(0, (0.82 - scrollProgress) * 100) : 24}px)`,
          }}
        >
          <p className="eyebrow">Every learner included</p>
          <p>
            One shared classroom, with communication that keeps moving at the
            pace of the lesson.
          </p>
        </div>
      </div>

      {/* CTA after the animation finishes */}
      <div className="landing-cta">
        <h2 className="landing-cta-heading">Ready to experience it?</h2>
        <button className="button primary" onClick={onEnter}>
          Enter Classroom
        </button>
      </div>
    </section>
  );
}
