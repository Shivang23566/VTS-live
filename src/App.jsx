import { useCallback, useState } from "react";
import ClassroomMode from "./components/ClassroomMode";
import ISLPlayer from "./components/ISLPlayer";
import LiveCaptions from "./components/LiveCaptions";
import Microphone from "./components/Microphone";
import LandingPage from "./components/LandingPage";
import AnimationView from "./components/AnimationView";
import dictionary from "./data/signDictionary.json";
import { findConceptMatch } from "./lib/conceptMatcher";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";

const LESSON_ID = "science-plants";

export default function App() {
  const [showClassroom, setShowClassroom] = useState(false);
  const [viewMode, setViewMode] = useState("animation"); // Default to animation mode so user can see it right away!
  const [language, setLanguage] = useState("en-IN");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [pendingVideo, setPendingVideo] = useState(null);

  const handleFinalTranscript = useCallback((transcript) => {
    setFinalTranscript(transcript);
    const match = findConceptMatch(transcript, dictionary, LESSON_ID);
    if (match) setPendingVideo({ ...match, queuedAt: Date.now() });
  }, []);

  const speech = useSpeechRecognition({ language, onFinalTranscript: handleFinalTranscript });

  const handleResetVideo = () => {
    setPendingVideo(null);
  };

  // ---------- Landing page (scroll animation) ----------
  if (!showClassroom) {
    return <LandingPage onEnter={() => setShowClassroom(true)} />;
  }

  const isAnimationMode = viewMode === "animation";

  // ---------- Classroom ----------
  return (
    <ClassroomMode>
      <section className="controls" aria-label="Lecture controls">
        <label>
          Speech language
          <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={speech.isRecording}>
            <option value="en-IN">English</option>
            <option value="hi-IN">हिन्दी</option>
          </select>
        </label>

        {/* Mode Toggle Button */}
        <button
          className={`button ${isAnimationMode ? "mode-btn-caption" : "mode-btn-anim"}`}
          onClick={() => setViewMode(isAnimationMode ? "captions" : "animation")}
        >
          {isAnimationMode ? "Switch to Video / Captions" : "Switch to 2D Animation"}
        </button>

        <Microphone {...speech} onStart={speech.start} onStop={speech.stop} />
      </section>

      <section className="classroom-grid">
        {isAnimationMode ? (
          <>
            <AnimationView
              finalTranscript={finalTranscript}
              interimTranscript={speech.interimTranscript}
              pendingVideo={pendingVideo}
              onResetVideo={handleResetVideo}
            />
            <LiveCaptions finalTranscript={finalTranscript} interimTranscript={speech.interimTranscript} />
          </>
        ) : (
          <>
            <ISLPlayer pendingVideo={pendingVideo} />
            <LiveCaptions finalTranscript={finalTranscript} interimTranscript={speech.interimTranscript} />
          </>
        )}
      </section>
    </ClassroomMode>
  );
}
