// Scroll positions are fractions of the existing animation's travel, not time.
export const landingChapters = [
  {
    id: "about",
    navLabel: "About",
    eyebrow: "A more accessible classroom",
    lines: ["Every lesson.", "Every learner."],
    body: "Bring a teacher's English or Hindi speech into view with live captions and reviewed Indian Sign Language concepts.",
    detail: "Built for deaf and hard-of-hearing learners.",
    position: "opening",
    theme: "light",
    enter: [0, 0],
    leave: [0.13, 0.205],
    target: 0,
  },
  {
    id: "captions",
    navLabel: "Live captions",
    eyebrow: "01 / Live captions",
    lines: ["Spoken words.", "Shared in the moment."],
    body: "Follow the lesson as it happens. Live captions make the teacher's words visible while they speak in English or Hindi.",
    detail: "Two speech languages. One shared conversation.",
    position: "right",
    theme: "dark",
    enter: [0.23, 0.29],
    leave: [0.365, 0.425],
    target: 0.32,
  },
  {
    id: "signs",
    navLabel: "Reviewed ISL",
    eyebrow: "02 / Indian Sign Language",
    lines: ["A familiar concept.", "A reviewed sign."],
    body: "Supported lesson phrases connect to pre-approved ISL clips. When a phrase is outside the library, captions keep the conversation visible.",
    detail: "Lesson-based concepts. Reviewed sign media.",
    position: "left-low",
    theme: "dark",
    enter: [0.45, 0.51],
    leave: [0.605, 0.665],
    target: 0.55,
  },
  {
    id: "classroom",
    navLabel: "Classroom",
    eyebrow: "03 / A shared classroom",
    lines: ["One lesson.", "One shared view."],
    body: "Bring captions and sign videos to the classroom screen. A focused, fullscreen view keeps the lesson at the center of attention.",
    detail: "Made for classroom screens and projectors.",
    position: "right-high",
    theme: "light",
    enter: [0.69, 0.745],
    leave: [0.815, 0.87],
    target: 0.77,
  },
  {
    id: "start",
    navLabel: "Get started",
    eyebrow: "04 / Your next lesson",
    lines: ["A little more access.", "A world of possibility."],
    body: "Open the classroom, choose a speech language, and start your lecture. Let the lesson come into view.",
    detail: "Works with speech recognition in Chrome and Edge.",
    position: "closing",
    theme: "light",
    enter: [0.89, 0.95],
    leave: null,
    target: 1,
    action: true,
  },
];

const clamp = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

function transition(progress, [start, end]) {
  if (start === end) return progress >= start ? 1 : 0;
  return smoothstep(clamp((progress - start) / (end - start)));
}

export function getChapterMotion(progress, chapter, stagger = 0) {
  const enter = transition(progress, chapter.enter.map((point) => point + stagger));
  const leave = chapter.leave ? transition(progress, chapter.leave) : 0;

  return {
    opacity: enter * (1 - leave),
    offset: (1 - enter) * 24 - leave * 18,
    // Reveal from below and erase upward as the scroll passes each chapter.
    clip: `inset(${leave * 100}% 0 ${(1 - enter) * 100}% 0)`,
  };
}

export function getActiveChapter(progress) {
  let active = landingChapters[0];
  for (const chapter of landingChapters) {
    if (progress >= chapter.enter[0]) active = chapter;
  }
  return active;
}
