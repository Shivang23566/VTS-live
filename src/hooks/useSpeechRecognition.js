import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ language, onFinalTranscript }) {
  const recognitionRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Speech recognition is not supported. Use the latest Chrome or Edge.");
      return undefined;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) onFinalTranscript(result[0].transcript.trim());
        else interim += result[0].transcript;
      }
      setInterimTranscript(interim.trim());
    };
    recognition.onerror = (event) => setError(`Microphone error: ${event.error}`);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [language, onFinalTranscript]);

  const start = useCallback(() => {
    setError("");
    recognitionRef.current?.start();
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  return { isRecording, interimTranscript, error, start, stop };
}
