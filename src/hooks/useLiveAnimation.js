import { useCallback, useEffect, useRef, useState } from "react";
import { AnimationAssembler, animationSocketUrl } from "../lib/animationStream";
import { connectAnimation } from "../lib/animationConnection";

export function useLiveAnimation(enabled) {
  const [connection, setConnection] = useState("offline");
  const [catalog, setCatalog] = useState(null);
  const [status, setStatus] = useState("");
  const [queue, setQueue] = useState([]);
  const [glosses, setGlosses] = useState([]);
  const [pending, setPending] = useState(0);
  const session = useRef(null);
  const nextId = useRef(0);
  const queuedFrames = useRef(0);
  const queueRef = useRef([]);

  const cancel = useCallback(() => {
    const live = session.current;
    if (live) {
      live.assembler.clear();
      for (const timer of live.timers.values()) clearTimeout(timer);
      live.timers.clear();
      if (live.socket.readyState === WebSocket.OPEN) live.socket.send(JSON.stringify({ type: "cancel", version: 1 }));
    }
    queuedFrames.current = 0;
    queueRef.current = [];
    setQueue([]);
    setPending(0);
    setGlosses([]);
    setStatus("");
  }, []);

  useEffect(() => {
    if (!enabled) { setConnection("offline"); return undefined; }
    let url;
    try { url = animationSocketUrl(window.location, import.meta.env.VITE_ANIMATION_WS_URL); }
    catch { setConnection("error"); setStatus("The animation server address is invalid. Check VITE_ANIMATION_WS_URL."); return undefined; }
    const stop = connectAnimation({ url, onDisconnect: () => {
      cancel();
      session.current = null;
      setCatalog(null);
      setConnection("connecting");
      setStatus("Waiting for the local animation service. Recovery is automatic. Keep npm run dev running.");
    }, onSocket: (socket, markReady, retry) => {
      const live = { socket, assembler: new AnimationAssembler(), timers: new Map(), ready: false };
      session.current = live;
      setConnection("connecting");
      setCatalog(null);
      const isCurrent = () => session.current === live;
      const fail = (message) => {
        if (!isCurrent()) return;
        cancel();
        setStatus(message);
      };
      socket.onmessage = (event) => {
        if (!isCurrent()) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready") {
            if (message.version !== 1 || message.sign_language !== "asl") throw new Error("An ASL animation server is required.");
            markReady();
            live.ready = message.ready === true;
            setConnection("connected");
            setCatalog(message);
            setStatus(live.ready ? "Ready for an English or Hindi example." : "ASL landmark data has not been prepared. Captions remain available.");
            return;
          }
          if (message.type === "cancelled") return;
          const result = live.assembler.accept(message);
          if (!result) return;
          if (result.type === "translation") { setGlosses(result.glosses); setStatus("ASL vocabulary sequence received."); }
          if (result.type === "clip") {
            if (queuedFrames.current + result.clip.frames.length > 4800) throw new Error("Animation queue is full. Please pause briefly.");
            queuedFrames.current += result.clip.frames.length;
            queueRef.current = [...queueRef.current, result.clip];
            setQueue(queueRef.current);
          }
          if (result.type === "error") {
            setStatus(result.message);
            // Preparation errors are sent before any clips; protocol errors clear all.
          }
          if (result.type === "complete" || result.type === "error") {
            clearTimeout(live.timers.get(message.request_id));
            live.timers.delete(message.request_id);
          }
          setPending(live.assembler.requests.size);
        } catch (error) {
          fail(error.message || "Invalid animation response. Captions continue.");
          retry();
        }
      };
    } });
    return () => {
      stop();
      const live = session.current;
      if (live) {
        for (const timer of live.timers.values()) clearTimeout(timer);
        live.assembler.clear();
      }
      session.current = null;
      queuedFrames.current = 0;
      queueRef.current = [];
      setQueue([]); setPending(0); setGlosses([]);
    };
  }, [enabled, cancel]);

  const submit = useCallback((text, language) => {
    const live = session.current;
    if (!live?.ready || live.socket.readyState !== WebSocket.OPEN) {
      setStatus("The local animation service is starting or recovering. Please try this phrase again when ready.");
      return false;
    }
    if (!text.trim() || text.length > 1200) { setStatus("Use a transcript of 1–1200 characters."); return false; }
    const id = `utterance-${++nextId.current}`;
    try {
      live.assembler.begin(id);
      live.socket.send(JSON.stringify({ type: "translate", version: 1, request_id: id, text, language }));
      live.timers.set(id, setTimeout(() => {
        if (session.current !== live || !live.assembler.requests.has(id)) return;
        cancel();
        setStatus("Animation timed out. Captions continue.");
      }, 30000));
      setPending(live.assembler.requests.size);
      setStatus("Preparing ASL motion…");
      return true;
    } catch (error) {
      live.assembler.discard(id);
      setStatus(error.message);
      return false;
    }
  }, [cancel]);

  const advance = useCallback((id) => {
    if (queueRef.current[0]?.playbackId !== id) return;
    queuedFrames.current -= queueRef.current[0].frames.length;
    queueRef.current = queueRef.current.slice(1);
    setQueue(queueRef.current);
  }, []);

  return { connection, catalog, status, glosses, pending, current: queue[0] ?? null,
    queuedCount: Math.max(0, queue.length - 1), submit, cancel, advance };
}
