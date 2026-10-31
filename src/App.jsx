import { useCallback, useRef, useState } from "react";
import ClassroomMode from "./components/ClassroomMode";
import ISLPlayer from "./components/ISLPlayer";
import LiveCaptions from "./components/LiveCaptions";
import Microphone from "./components/Microphone";
import LandingPage from "./components/LandingPage";
import AnimationView from "./components/AnimationView";
import TranscriptTester from "./components/TranscriptTester";
import AnimationTester from "./components/AnimationTester";
import CustomCursor from "./components/CustomCursor";
import dictionary from "./data/signDictionary.json";
import { createTranscriptParser, findConceptMatches, getLessonVideos } from "./lib/conceptMatcher";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSignPlayback } from "./hooks/useSignPlayback";
import { useLiveAnimation } from "./hooks/useLiveAnimation";

const LESSON_ID = "science-plants";
const LESSON_VIDEOS = getLessonVideos(dictionary, LESSON_ID);

export default function App() {
  const [showClassroom, setShowClassroom] = useState(false);
  const [viewMode, setViewMode] = useState("animation");
  const [language, setLanguage] = useState("en-IN");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [matchStatus, setMatchStatus] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [parser] = useState(() => createTranscriptParser(dictionary, LESSON_ID));
  const { current, queuedCount, enqueue, advance, clear } = useSignPlayback();
  const animation = useLiveAnimation(showClassroom && viewMode === "animation");
  const sessionSettings = useRef({ viewMode, language });
  sessionSettings.current = { viewMode, language };

  const queueMatches = useCallback((matches) => {
    enqueue(matches);
    setMatchStatus(matches.length
      ? `Matched ${matches.length} video${matches.length === 1 ? "" : "s"}: ${matches.map((match) => match.phrase).join("; ")}`
      : "No complete video title matched. Captions continue while you speak.");
    if (matches.length) setPlaybackError("");
  }, [enqueue]);

  const handleFinalTranscript = useCallback((transcript) => {
    setFinalTranscript(transcript);
    if (sessionSettings.current.viewMode === "animation") {
      animation.submit(transcript, sessionSettings.current.language);
    } else queueMatches(parser.push(transcript));
  }, [parser, queueMatches, animation.submit]);

  const speech = useSpeechRecognition({ language, onFinalTranscript: handleFinalTranscript });

  const handleTestTranscript = (transcript) => {
    setFinalTranscript(transcript);
    setPlaybackError("");
    if (viewMode === "animation") animation.submit(transcript, language);
    else queueMatches(findConceptMatches(transcript, dictionary, LESSON_ID));
  };

  const handleStart = () => {
    parser.reset();
    clear();
    animation.cancel();
    setPlaybackError("");
    speech.start();
  };
  const handleStop = () => {
    speech.stop();
    parser.reset();
    clear();
    animation.cancel();
  };
  const handlePlaybackFailure = useCallback((clip) => {
    setPlaybackError(`Could not load or decode "${clip.phrase}". This video was skipped; captions remain available.`);
    advance(clip.playbackId);
  }, [advance]);
  const handleAnimationFailure = useCallback((message) => {
    animation.cancel();
    setPlaybackError(message);
  }, [animation.cancel]);

  const changeMode = () => {
    animation.cancel();
    clear();
    parser.reset();
    setPlaybackError("");
    setViewMode((mode) => mode === "animation" ? "captions" : "animation");
  };

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
            <select value={language} onChange={(event) => { parser.reset(); animation.cancel(); setLanguage(event.target.value); }} disabled={speech.isRecording}>
              <option value="en-IN">English</option>
              <option value="hi-IN">हिन्दी</option>
            </select>
          </label>
          <span className="lesson-label">{isAnimationMode ? "American Sign Language · Experimental avatar" : "Indian Sign Language · Plants video library"}</span>

          {/* Mode Toggle Button */}
          <button
            className={`button ${isAnimationMode ? "mode-btn-caption" : "mode-btn-anim"}`}
            onClick={changeMode}
          >
            {isAnimationMode ? "Switch to ISL video library" : "Switch to live ASL avatar"}
          </button>

          <Microphone {...speech} onStart={handleStart} onStop={handleStop} />
        </section>

        {isAnimationMode
          ? <AnimationTester language={language} catalog={animation.catalog} onTest={handleTestTranscript} status={animation.status} />
          : <TranscriptTester videos={LESSON_VIDEOS} onTest={handleTestTranscript} status={matchStatus} />}
        {playbackError && <p className="video-error" role="alert">{playbackError}</p>}

        <section className="classroom-grid">
          {isAnimationMode ? (
            <>
              <AnimationView animation={animation} onFailure={handleAnimationFailure} />
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
