import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { playbackQueueReducer as reduce } from "../src/lib/playbackQueue.js";
import { createTranscriptParser } from "../src/lib/conceptMatcher.js";

const first = { id: "GOOD MORNING", playbackId: 1 };
const second = { id: "SIT DOWN", playbackId: 2 };

test("new matches append without interrupting the current clip", () => {
  const queue = reduce([first], { type: "enqueue", items: [second] });
  assert.deepEqual(queue, [first, second]);
  assert.equal(queue[0], first);
});

test("completion and skip advance one clip, then return to idle", () => {
  const next = reduce([first, second], { type: "advance", playbackId: 1 });
  assert.deepEqual(next, [second]);
  assert.deepEqual(reduce(next, { type: "advance", playbackId: 2 }), []);
});

test("late ended/error callbacks cannot skip a different active video", () => {
  const queue = [second];
  assert.equal(reduce(queue, { type: "advance", playbackId: 1 }), queue);
});

test("the same title can replay with a distinct playback identity", () => {
  const repeat = { ...first, playbackId: 3 };
  assert.deepEqual(reduce([first, repeat], { type: "advance", playbackId: 1 }), [repeat]);
});

test("stop clears the current video and every pending video", () => {
  assert.deepEqual(reduce([first, second], { type: "clear" }), []);
});

test("speech parser and queue retain every match across rapid final results", () => {
  const dictionary = JSON.parse(readFileSync(new URL("../src/data/signDictionary.json", import.meta.url), "utf8"));
  const parser = createTranscriptParser(dictionary, "science-plants");
  let queue = [];
  let playbackId = 0;
  for (const transcript of ["Good morning. Sit down.", "Today we will learn", "about plants."]) {
    const items = parser.push(transcript).map((entry) => ({ ...entry, playbackId: ++playbackId }));
    queue = reduce(queue, { type: "enqueue", items });
  }
  assert.deepEqual(queue.map(({ id }) => id), ["GOOD MORNING", "SIT DOWN", "Today we will learn about plants"]);
  while (queue.length) queue = reduce(queue, { type: "advance", playbackId: queue[0].playbackId });
  assert.deepEqual(queue, []);
});
