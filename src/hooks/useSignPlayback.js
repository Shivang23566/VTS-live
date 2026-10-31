import { useCallback, useReducer, useRef } from "react";
import { playbackQueueReducer } from "../lib/playbackQueue";

export function useSignPlayback() {
  const [queue, dispatch] = useReducer(playbackQueueReducer, []);
  const nextPlaybackId = useRef(0);

  const enqueue = useCallback((matches) => {
    if (!matches.length) return;
    const items = matches.map((entry) => ({ ...entry, playbackId: ++nextPlaybackId.current }));
    dispatch({ type: "enqueue", items });
  }, []);
  const advance = useCallback((playbackId) => dispatch({ type: "advance", playbackId }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  return { current: queue[0] ?? null, queuedCount: Math.max(0, queue.length - 1), enqueue, advance, clear };
}
