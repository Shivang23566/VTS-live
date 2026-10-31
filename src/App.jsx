import { useCallback, useState } from "react";
import ClassroomMode from "./components/ClassroomMode";
import ISLPlayer from "./components/ISLPlayer";
import LiveCaptions from "./components/LiveCaptions";
import Microphone from "./components/Microphone";
import dictionary from "./data/signDictionary.json";
import { findConceptMatch } from "./lib/conceptMatcher";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";

const LESSON_ID = "science-plants";

export default function App() {
  const [language, setLanguage] = useState("en-IN");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [pendingVideo, setPendingVideo] = useState(null);

  const handleFinalTranscript = useCallback((transcript) => {
    setFinalTranscript(transcript);
    const match = findConceptMatch(transcript, dictionary, LESSON_ID);
    if (match) setPendingVideo({ ...match, queuedAt: Date.now() });
  }, []);

  const speech = useSpeechRecognition({ language, onFinalTranscript: handleFinalTranscript });

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
        <span className="lesson-label">Science · Lesson 01 · Plants</span>
        <Microphone {...speech} onStart={speech.start} onStop={speech.stop} />
      </section>
      <section className="classroom-grid">
        <ISLPlayer pendingVideo={pendingVideo} />
        <LiveCaptions finalTranscript={finalTranscript} interimTranscript={speech.interimTranscript} />
      </section>
    </ClassroomMode>
  );
}
