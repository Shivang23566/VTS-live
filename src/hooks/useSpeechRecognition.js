import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ language, onFinalTranscript }) {
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setIsSupported(false);
      setError("Speech recognition is not supported. Use the latest Chrome or Edge.");
      return undefined;
    }

    const recognition = new Recognition();
    const deliveredFinalResults = new Set();
    setIsSupported(true);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onstart = () => {
      deliveredFinalResults.clear();
      activeRef.current = true;
      setIsRecording(true);
    };
    recognition.onresult = (event) => {
      if (!activeRef.current) return;
      const interim = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          if (!deliveredFinalResults.has(index)) {
            deliveredFinalResults.add(index);
            const transcript = result[0].transcript.trim();
            if (transcript) onFinalTranscript(transcript);
          }
        } else interim.push(result[0].transcript);
      }
      setInterimTranscript(interim.join(" ").trim());
    };
    recognition.onerror = (event) => setError(`Microphone error: ${event.error}`);
    recognition.onend = () => {
      activeRef.current = false;
      setIsRecording(false);
      setInterimTranscript("");
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
      activeRef.current = false;
    };
  }, [language, onFinalTranscript]);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported. Use Chrome or Edge, or try the text test.");
      return false;
    }
    if (activeRef.current) return false;
    setError("");
    setInterimTranscript("");
    try {
      recognitionRef.current.start();
      activeRef.current = true;
      setIsRecording(true);
      return true;
    } catch (error) {
      setError(`Could not start the microphone: ${error.message}`);
      setIsRecording(false);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    // Abort rather than flush a late final result after the lecture has stopped.
    recognitionRef.current?.abort();
    activeRef.current = false;
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  return { isSupported, isRecording, interimTranscript, error, start, stop };
}
