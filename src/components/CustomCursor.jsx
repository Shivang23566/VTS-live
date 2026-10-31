import { useEffect, useRef, useCallback } from "react";

/**
 * Custom cursor — SVG arrow (default) and target icon (hovering interactive elements).
 * Eased smoothing: f = 1 − exp(−dt·22), dt capped at 0.05s.
 * Ping effect on click.
 * Only active on fine pointers.
 */

const CURSOR_COLOR = "#026670";
const OUTLINE_COLOR = "#FEF9C7";

// SVG B — Arrow (default cursor)
const ArrowSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path
      d="M8,13.75L9.98,11h4.25L8,6.1v7.65ZM13.78,22l-3.63-7.8L6,20V2L20,13H12.9l3.6,7.73L13.78,22ZM9.98,11Z"
      fill={CURSOR_COLOR}
      stroke={OUTLINE_COLOR}
      strokeWidth="0.5"
    />
  </svg>
);

// SVG A — Target icon (hover/click cursor)
const TargetSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path
      d="M12,18q-2.42,0-4.15-1.65T6,12.3l2.1,0.63q0.33,1.35 1.4,2.21T12,16q1.65,0 2.83-1.18T16,12q0-1.43-0.86-2.5q-0.86-1.08-2.21-1.4L12.3,6q2.4,0.13 4.05,1.85T18,12q0,2.5-1.75,4.25T12,18ZM8.1,21.21q-1.82-0.79-3.17-2.14Q3.58,17.73 2.79,15.9T2,12q0-0.23 0-0.45T2.05,11.1L4,11.7V12q0,3.35 2.33,5.68T12,20t5.68-2.32T20,12T17.68,6.32T12,4q-0.07,0-0.15,0T11.7,4L11.1,2.05Q11.33,2 11.55,2T12,2q2.08,0 3.9,0.79t3.17,2.14q1.35,1.35 2.14,3.17Q22,9.92 22,12t-0.79,3.9t-2.14,3.17q-1.35,1.35-3.17,2.14T12,22q-2.07,0-3.9-0.79Zm2.43-8.71L6.25,8.23L5,12L2,2L12,5L8.23,6.25l4.28,4.27L10.53,12.5Z"
      fill={CURSOR_COLOR}
      stroke={OUTLINE_COLOR}
      strokeWidth="0.3"
    />
  </svg>
);

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const hoveringRef = useRef(false);
  const pressingRef = useRef(false);
  const isFinePointer = useRef(false);

  // Check if fine pointer
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    isFinePointer.current = mq.matches;
    const handler = (e) => { isFinePointer.current = e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Ping effect on click
  const spawnPing = useCallback((x, y) => {
    const ping = document.createElement("div");
    ping.className = "cursor-ping";
    ping.style.left = x + "px";
    ping.style.top = y + "px";
    ping.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12,18q-2.42,0-4.15-1.65T6,12.3l2.1,0.63q0.33,1.35 1.4,2.21T12,16q1.65,0 2.83-1.18T16,12q0-1.43-0.86-2.5q-0.86-1.08-2.21-1.4L12.3,6q2.4,0.13 4.05,1.85T18,12q0,2.5-1.75,4.25T12,18ZM8.1,21.21q-1.82-0.79-3.17-2.14Q3.58,17.73 2.79,15.9T2,12q0-0.23 0-0.45T2.05,11.1L4,11.7V12q0,3.35 2.33,5.68T12,20t5.68-2.32T20,12T17.68,6.32T12,4q-0.07,0-0.15,0T11.7,4L11.1,2.05Q11.33,2 11.55,2T12,2q2.08,0 3.9,0.79t3.17,2.14q1.35,1.35 2.14,3.17Q22,9.92 22,12t-0.79,3.9t-2.14,3.17q-1.35,1.35-3.17,2.14T12,22q-2.07,0-3.9-0.79Zm2.43-8.71L6.25,8.23L5,12L2,2L12,5L8.23,6.25l4.28,4.27L10.53,12.5Z" fill="${CURSOR_COLOR}" stroke="${OUTLINE_COLOR}" stroke-width="0.3" /></svg>`;
    document.body.appendChild(ping);
    ping.addEventListener("animationend", () => ping.remove());
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const onMouseMove = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseOver = (e) => {
      const el = e.target.closest("a, button, [role='button'], select, input, label[for]");
      hoveringRef.current = !!el;
      if (cursor) {
        cursor.classList.toggle("hovering", !!el);
      }
    };

    const onMouseDown = (e) => {
      pressingRef.current = true;
      if (cursor) cursor.classList.add("pressing");
      spawnPing(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      pressingRef.current = false;
      if (cursor) cursor.classList.remove("pressing");
    };

    // Animation loop
    const tick = (now) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const f = 1 - Math.exp(-dt * 22);
      posRef.current.x += (targetRef.current.x - posRef.current.x) * f;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * f;

      cursor.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;

      rafRef.current = requestAnimationFrame(tick);
    };

    // Pause when hidden
    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } else {
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [spawnPing]);

  // Check for fine pointer support at render — hide on touch
  const isFine = typeof window !== 'undefined' && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!isFine) return null;

  return (
    <div ref={cursorRef} className="custom-cursor">
      {/* We swap SVGs via CSS class; default is arrow */}
      <div className="cursor-arrow"><ArrowSVG /></div>
      <div className="cursor-target"><TargetSVG /></div>
    </div>
  );
}
