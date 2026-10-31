import { useState, useEffect, useRef } from "react";
import ScrollAnimation from "./ScrollAnimation";
import Wordmark from "./Wordmark";
import Nav from "./Nav";

/**
 * Landing / hero section shown before the classroom.
 * Contains the scroll-driven frame animation and a CTA.
 * VISUAL REBRAND ONLY — scroll animation logic untouched.
 */
export default function LandingPage({ onEnter }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const wrapperRef = useRef(null);

  // Track scroll progress for copy fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(scrollY / docHeight);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
    <section className="landing" ref={wrapperRef}>
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
        <ScrollAnimation />

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
