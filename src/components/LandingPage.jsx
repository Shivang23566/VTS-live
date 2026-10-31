import ScrollAnimation from "./ScrollAnimation";

/**
 * Landing / hero section shown before the classroom.
 * Contains the scroll-driven frame animation and a CTA.
 */
export default function LandingPage({ onEnter }) {
  return (
    <section className="landing">
      {/* Hero text overlay */}
      <div className="landing-hero">
        <p className="eyebrow">ShikshaSign Live</p>
        <h1 className="landing-title">
          Making every classroom <span className="highlight">accessible</span>
        </h1>
        <p className="landing-subtitle">
          Real-time Indian Sign Language interpretation powered by AI.
          <br />Scroll down to see it in action.
        </p>
      </div>

      {/* Scroll-driven animation */}
      <ScrollAnimation />

      {/* CTA after the animation finishes */}
      <div className="landing-cta">
        <h2 className="landing-cta-heading">Ready to experience it?</h2>
        <button className="button primary" onClick={onEnter}>
          Enter Classroom →
        </button>
      </div>
    </section>
  );
}
