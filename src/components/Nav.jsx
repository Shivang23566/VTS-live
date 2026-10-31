import { useState, useCallback } from "react";

/**
 * Atticus Finch–style transparent navigation.
 * Centre logo with rule, 3 links left, 3 right.
 * Purely visual — link handlers and destinations preserved from original.
 */
export default function Nav({ onEnter }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen((v) => !v);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const links = [
    { label: "About", href: "#about" },
    { label: "How It Works", href: "#how" },
    { label: "Features", href: "#features" },
    { label: "Demo", href: "#demo" },
    { label: "Research", href: "#research" },
    { label: "Classroom", href: "#classroom", onClick: onEnter },
  ];

  const leftLinks = links.slice(0, 3);
  const rightLinks = links.slice(3);

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        <div className="nav-inner">
          {/* Left links */}
          {leftLinks.map((link) => (
            <a
              key={link.label}
              className="nav-link"
              href={link.href}
              onClick={link.onClick ? (e) => { e.preventDefault(); link.onClick(); } : undefined}
            >
              {link.label}
            </a>
          ))}

          {/* Centre logo */}
          <div className="nav-logo-wrapper">
            <span className="nav-logo-text">ShikshaSign</span>
            <span className="nav-rule">
              <span className="nav-rule-star">✦</span>
              <span className="nav-rule-line" />
              <span className="nav-rule-star">✦</span>
            </span>
          </div>

          {/* Right links */}
          {rightLinks.map((link) => (
            <a
              key={link.label}
              className="nav-link"
              href={link.href}
              onClick={link.onClick ? (e) => { e.preventDefault(); link.onClick(); } : undefined}
            >
              {link.label}
            </a>
          ))}

          {/* Mobile toggle */}
          <button
            className="nav-mobile-toggle"
            onClick={toggleMobile}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`nav-mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Mobile slide-in panel */}
      <div className={`nav-mobile-panel ${mobileOpen ? "open" : ""}`}>
        <button className="nav-mobile-close" onClick={closeMobile} aria-label="Close menu">✕</button>
        {links.map((link) => (
          <a
            key={link.label}
            className="nav-link"
            href={link.href}
            onClick={(e) => {
              closeMobile();
              if (link.onClick) {
                e.preventDefault();
                link.onClick();
              }
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}

