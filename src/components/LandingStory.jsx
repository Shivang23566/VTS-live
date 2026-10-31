import { landingChapters, getChapterMotion, getActiveChapter } from "../data/landingChapters";

export default function LandingStory({ progress, onEnter }) {
  const active = getActiveChapter(progress);
  const activeIndex = landingChapters.indexOf(active);

  return (
    <div className="landing-story">
      {landingChapters.map((chapter, index) => {
        const motion = getChapterMotion(progress, chapter);
        const isVisible = motion.opacity > 0.01;
        const isReadable = motion.opacity > 0.5;
        const Heading = index === 0 ? "h1" : "h2";

        return (
          <section
            key={chapter.id}
            className={`story-chapter story-chapter--${chapter.position} story-chapter--${chapter.theme}`}
            aria-labelledby={`${chapter.id}-heading`}
            aria-hidden={!isReadable}
            inert={isReadable ? undefined : ""}
            style={{
              "--chapter-opacity": motion.opacity,
              "--chapter-offset": `${motion.offset}px`,
              visibility: isVisible ? "visible" : "hidden",
            }}
          >
            <p className="story-eyebrow">{chapter.eyebrow}</p>
            <Heading id={`${chapter.id}-heading`} className="story-heading">
              {chapter.lines.map((line, lineIndex) => {
                const lineMotion = getChapterMotion(progress, chapter, index === 0 ? 0 : lineIndex * 0.008);
                return (
                  <span className="story-line-mask" key={line}>
                    <span
                      className="story-line"
                      style={{
                        opacity: lineMotion.opacity,
                        transform: `translate3d(0, ${lineMotion.offset}px, 0)`,
                        clipPath: lineMotion.clip,
                      }}
                    >
                      {line}
                    </span>
                  </span>
                );
              })}
            </Heading>
            <p className="story-body">{chapter.body}</p>
            {chapter.action && (
              <button className="story-enter" onClick={onEnter} tabIndex={isReadable ? 0 : -1}>
                Enter classroom
              </button>
            )}
            <p className="story-detail">{chapter.detail}</p>
          </section>
        );
      })}

      <div className={`story-footer story-footer--${active.theme}`} aria-hidden="true">
        <span>{progress > 0.97 ? "Your classroom is ready" : "Scroll to explore"}</span>
        <span className="story-page-number">
          {String(activeIndex + 1).padStart(2, "0")}
          <span> / {String(landingChapters.length).padStart(2, "0")}</span>
        </span>
      </div>
    </div>
  );
}
