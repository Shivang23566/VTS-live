export function playbackQueueReducer(queue, action) {
  switch (action.type) {
    case "enqueue":
      return [...queue, ...action.items];
    case "advance":
      // A delayed ended/error event from an old video must not skip the next one.
      return queue.length && queue[0].playbackId === action.playbackId ? queue.slice(1) : queue;
    case "clear":
      return [];
    default:
      return queue;
  }
}
