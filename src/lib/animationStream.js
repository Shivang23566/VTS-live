export const LANDMARK_SCHEMA = "mediapipe-image-75-v1";
export const MAX_REQUEST_FRAMES = 2400;

export function validFrame(frame) {
  return Array.isArray(frame) && frame.length === 75 && frame.every((point) =>
    Array.isArray(point) && point.length === 4 && point.every(Number.isFinite) &&
    point.slice(0, 3).every((value) => Math.abs(value) <= 10) && point[3] >= 0 && point[3] <= 1);
}

/** Reassemble ordered chunks and reject incomplete or incompatible motion. */
export class AnimationAssembler {
  constructor() { this.requests = new Map(); }
  begin(id) {
    if (this.requests.size >= 8) throw new Error("Animation queue is full. Please pause briefly.");
    this.requests.set(id, { next: 0, count: null, frames: 0, clip: null });
  }
  clear() { this.requests.clear(); }
  discard(id) { this.requests.delete(id); }
  accept(message) {
    const request = this.requests.get(message.request_id);
    if (!request) return null; // Cancelled sessions and old sockets cannot replay.
    if (message.version !== 1) throw new Error("Incompatible animation server.");
    switch (message.type) {
      case "translation":
        if (request.count !== null || message.sign_language !== "asl" || !Array.isArray(message.glosses) ||
            !Number.isInteger(message.clip_count) || message.clip_count < 1 || message.clip_count > 32 ||
            message.glosses.length !== message.clip_count || !message.glosses.every((g) => typeof g === "string")) {
          throw new Error("Invalid ASL translation response.");
        }
        request.count = message.clip_count;
        request.glosses = message.glosses;
        return { type: "translation", glosses: message.glosses };
      case "clip_start":
        if (request.count === null || request.clip || message.clip_index !== request.next ||
            request.next >= request.count || message.schema !== LANDMARK_SCHEMA ||
            !Number.isInteger(message.frame_count) || message.frame_count < 2 || message.frame_count > 1200 ||
            !Number.isFinite(message.fps) || message.fps < 1 || message.fps > 60 ||
            message.gloss !== request.glosses[request.next]) throw new Error("Invalid animation clip.");
        request.clip = { ...message, frames: [], playbackId: `${message.request_id}:${message.clip_index}` };
        return null;
      case "frames": {
        const clip = request.clip;
        if (!clip || message.clip_index !== request.next || message.offset !== clip.frames.length ||
            !Array.isArray(message.frames) || !message.frames.length || message.frames.length > 12 ||
            clip.frames.length + message.frames.length > clip.frame_count ||
            request.frames + message.frames.length > MAX_REQUEST_FRAMES || !message.frames.every(validFrame)) {
          throw new Error("Invalid or out-of-order animation frames.");
        }
        clip.frames.push(...message.frames);
        request.frames += message.frames.length;
        return null;
      }
      case "clip_end": {
        const clip = request.clip;
        if (!clip || message.clip_index !== request.next || clip.frames.length !== clip.frame_count) {
          throw new Error("Incomplete animation clip.");
        }
        request.clip = null;
        request.next += 1;
        return { type: "clip", clip };
      }
      case "complete":
        if (request.count === null || request.clip || request.next !== request.count) throw new Error("Incomplete animation response.");
        this.discard(message.request_id);
        return { type: "complete" };
      case "error":
        this.discard(message.request_id);
        return { type: "error", message: typeof message.message === "string" ? message.message : "Animation unavailable." };
      default:
        throw new Error("Unknown animation message.");
    }
  }
}

export function animationSocketUrl(location, override = "") {
  const url = new URL(override || "/ws/animation", location.href);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (!["ws:", "wss:"].includes(url.protocol)) throw new Error("Invalid animation server URL.");
  return url.href;
}

export function sampleFrame(clip, elapsedMs) {
  const position = Math.max(0, elapsedMs) * clip.fps / 1000;
  const index = Math.min(clip.frames.length - 1, Math.floor(position));
  const next = clip.frames[Math.min(index + 1, clip.frames.length - 1)];
  const amount = Math.min(1, position - index);
  return clip.frames[index].map((point, landmark) => point.map((value, axis) =>
    axis === 3 ? Math.min(value, next[landmark][axis]) : value + (next[landmark][axis] - value) * amount));
}
