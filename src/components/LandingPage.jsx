import Nav from "./Nav";
import LandingStory from "./LandingStory";
import ScrollAnimation from "./ScrollAnimation";
import { landingChapters, getActiveChapter } from "../data/landingChapters";

/**
 * Navigation and copy share the animation's scroll progress. All overlays
 * stay inside the pinned viewport, preserving the original frame pacing.
 */
export default function LandingPage({ onEnter }) {
  return (
    <main className="landing landing-with-story" aria-label="ShikhsaSign classroom introduction">
      <ScrollAnimation anchors={landingChapters}>
        {(progress) => (
          <>
            <Nav activeId={getActiveChapter(progress).id} onEnter={onEnter} />
            <LandingStory progress={progress} onEnter={onEnter} />
          </>
        )}
      </ScrollAnimation>
    </main>
  );
}
