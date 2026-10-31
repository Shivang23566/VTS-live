import { useEffect, useRef, useState } from "react";
import { landingChapters } from "../data/landingChapters";

/**
 * Text-only navigation. Anchors seek to the matching moment in the animation.
 */
export default function Nav({ activeId, onEnter }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setMobileOpen(false);
    };
    const onWideScreen = (event) => {
      if (event.matches) setMobileOpen(false);
    };
    const wideScreen = window.matchMedia("(min-width: 1001px)");

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    wideScreen.addEventListener("change", onWideScreen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      wideScreen.removeEventListener("change", onWideScreen);
    };
  }, [mobileOpen]);

  const renderLinks = () => landingChapters.map((chapter) => (
    <a
      key={chapter.id}
      href={`#${chapter.id}`}
      className="project-nav-link"
      aria-current={activeId === chapter.id ? "location" : undefined}
      onClick={() => setMobileOpen(false)}
    >
      {chapter.navLabel}
    </a>
  ));

  return (
    <header className="project-header" ref={headerRef}>
      <div className="project-header-row">
        <a className="project-wordmark" href="#about" onClick={() => setMobileOpen(false)}>
          ShikhsaSign
        </a>
        <nav className="project-nav-desktop" aria-label="Main navigation">
          {renderLinks()}
        </nav>
        <button className="project-nav-enter" onClick={onEnter}>Enter classroom</button>
        <button
          ref={toggleRef}
          className="project-menu-toggle"
          type="button"
          aria-controls="project-mobile-nav"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>
      <nav
        className="project-nav-mobile"
        id="project-mobile-nav"
        aria-label="Mobile navigation"
        hidden={!mobileOpen}
      >
        {renderLinks()}
        <button className="project-mobile-enter" onClick={onEnter}>Enter classroom</button>
      </nav>
    </header>
  );
}

