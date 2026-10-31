import { useCallback, useState } from "react";
import ClassroomMode from "./components/ClassroomMode";
import ISLPlayer from "./components/ISLPlayer";
import LiveCaptions from "./components/LiveCaptions";
import Microphone from "./components/Microphone";
import LandingPage from "./components/LandingPage";
import AnimationView from "./components/AnimationView";
import TranscriptTester from "./components/TranscriptTester";
import CustomCursor from "./components/CustomCursor";
import dictionary from "./data/signDictionary.json";
import { createTranscriptParser, findConceptMatches, getLessonVideos } from "./lib/conceptMatcher";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSignPlayback } from "./hooks/useSignPlayback";

const LESSON_ID = "science-plants";
const LESSON_VIDEOS = getLessonVideos(dictionary, LESSON_ID);

export default function App() {
  const [showClassroom, setShowClassroom] = useState(false);
  const [viewMode, setViewMode] = useState("animation"); // Default to animation mode so user can see it right away!
  const [language, setLanguage] = useState("en-IN");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [matchStatus, setMatchStatus] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [parser] = useState(() => createTranscriptParser(dictionary, LESSON_ID));
  const { current, queuedCount, enqueue, advance, clear } = useSignPlayback();

  const queueMatches = useCallback((matches) => {
    enqueue(matches);
    setMatchStatus(matches.length
      ? `Matched ${matches.length} video${matches.length === 1 ? "" : "s"}: ${matches.map((match) => match.phrase).join("; ")}`
      : "No complete video title matched. Captions continue while you speak.");
    if (matches.length) setPlaybackError("");
  }, [enqueue]);

  const handleFinalTranscript = useCallback((transcript) => {
    setFinalTranscript(transcript);
    queueMatches(parser.push(transcript));
  }, [parser, queueMatches]);

  const speech = useSpeechRecognition({ language, onFinalTranscript: handleFinalTranscript });

  const handleTestTranscript = (transcript) => {
    setFinalTranscript(transcript);
    queueMatches(findConceptMatches(transcript, dictionary, LESSON_ID));
  };

  const handleStart = () => {
    parser.reset();
    clear();
    setPlaybackError("");
    speech.start();
  };
  const handleStop = () => {
    speech.stop();
    parser.reset();
    clear();
  };
  const handlePlaybackFailure = useCallback((clip) => {
    setPlaybackError(`Could not load or decode "${clip.phrase}". This video was skipped; captions remain available.`);
    advance(clip.playbackId);
  }, [advance]);

  const playerProps = {
    current,
    queuedCount,
    onComplete: advance,
    onFailure: handlePlaybackFailure,
    onClear: clear,
  };

  // ---------- Landing page (scroll animation) ----------
  if (!showClassroom) {
    return <LandingPage onEnter={() => setShowClassroom(true)} />;
  }

  const isAnimationMode = viewMode === "animation";

  // ---------- Classroom ----------
  return (
    <>
      <CustomCursor />
      <ClassroomMode>
        <section className="controls" aria-label="Lecture controls">
          <label>
            Speech language
            <select value={language} onChange={(event) => { parser.reset(); setLanguage(event.target.value); }} disabled={speech.isRecording}>
              <option value="en-IN">English</option>
              <option value="hi-IN">हिन्दी</option>
            </select>
          </label>
          <span className="lesson-label">Science · Lesson 01 · Plants</span>

          {/* Mode Toggle Button */}
          <button
            className={`button ${isAnimationMode ? "mode-btn-caption" : "mode-btn-anim"}`}
            onClick={() => setViewMode(isAnimationMode ? "captions" : "animation")}
          >
            {isAnimationMode ? "Switch to Video / Captions" : "Switch to 2D Animation"}
          </button>

          <Microphone {...speech} onStart={handleStart} onStop={handleStop} />
        </section>

        <TranscriptTester videos={LESSON_VIDEOS} onTest={handleTestTranscript} status={matchStatus} />
        {playbackError && <p className="video-error" role="alert">{playbackError}</p>}

        <section className="classroom-grid">
          {isAnimationMode ? (
            <>
              <AnimationView
                finalTranscript={finalTranscript}
                interimTranscript={speech.interimTranscript}
                {...playerProps}
              />
              <LiveCaptions finalTranscript={finalTranscript} interimTranscript={speech.interimTranscript} />
            </>
          ) : (
            <>
              <ISLPlayer {...playerProps} />
              <LiveCaptions finalTranscript={finalTranscript} interimTranscript={speech.interimTranscript} />
            </>
          )}
        </section>
      </ClassroomMode>
    </>
  );
}
