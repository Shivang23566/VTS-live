import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createTranscriptParser,
  findConceptMatch,
  findConceptMatches,
  normalizeTranscript,
} from "../src/lib/conceptMatcher.js";

const dictionary = JSON.parse(readFileSync(new URL("../src/data/signDictionary.json", import.meta.url), "utf8"));
const lesson = "science-plants";
const titles = [
  "GOOD MORNING",
  "SIT DOWN",
  "Today we will learn about plants",
  "Leaves take in sunlight and roots take in water",
  "Plants make food because they have sunlight and water.",
];
const ids = (matches) => matches.map(({ id }) => id);

for (const title of titles) {
  test(`finds the supplied video by its exact title: ${title}`, () => {
    const match = findConceptMatch(title, dictionary, lesson);
    assert.equal(match?.id, title);
    assert.equal(match?.video, `/signs/${title}.mp4`);
  });
}

test("capitalization, punctuation, and whitespace do not affect title matching", () => {
  const matches = findConceptMatches("  GOOD, morning!\nSit   down. Today we will learn about plants!!!", dictionary, lesson);
  assert.deepEqual(ids(matches), titles.slice(0, 3));
  assert.equal(findConceptMatch("Plants make food because they have sunlight and water", dictionary, lesson)?.id, titles[4]);
});

test("full titles inside a longer transcript are returned in spoken order", () => {
  const transcript = `Class, ${titles[1]}. ${titles[0]} everyone. ${titles[3]}. ${titles[2]}.`;
  assert.deepEqual(ids(findConceptMatches(transcript, dictionary, lesson)), [titles[1], titles[0], titles[3], titles[2]]);
});

test("does not treat fragments, substrings, or unsupported words as a title", () => {
  for (const input of ["", "!", "sit", "plants", "water", "morning", "good mornington", "Today we will learn", "I visit downtown", "photosynthesis"]) {
    assert.equal(findConceptMatch(input, dictionary, lesson), null, input);
  }
});

test("repeating a complete title creates two playback requests", () => {
  assert.deepEqual(ids(findConceptMatches("Sit down. Sit down.", dictionary, lesson)), [titles[1], titles[1]]);
});

test("general titles work across lessons but plant lessons stay scoped", () => {
  assert.deepEqual(ids(findConceptMatches("Good morning. Sit down. Today we will learn about plants.", dictionary, "math")), titles.slice(0, 2));
});

test("only enabled, reviewed local clips are eligible", () => {
  const entries = [
    { id: "hidden", phrase: "good morning", lessonId: lesson, reviewed: false, video: "/signs/hidden.mp4" },
    { id: "remote", phrase: "sit down", lessonId: lesson, reviewed: true, video: "https://example.com/remote.mp4" },
  ];
  assert.deepEqual(findConceptMatches("Good morning. Sit down.", entries, lesson), []);
});

test("prefers the longest complete phrase without double-playing its shorter overlap", () => {
  const entries = [
    { id: "short", phrase: "plants", reviewed: true, video: "/signs/short.mp4" },
    { id: "long", phrase: titles[2], reviewed: true, video: "/signs/long.mp4" },
  ];
  assert.deepEqual(ids(findConceptMatches(titles[2], entries, lesson)), ["long"]);
});

test("keeps the original hello clip and its configured aliases working", () => {
  assert.equal(findConceptMatch("Hello today we will learn sign language", dictionary, lesson)?.id, "hello-today-learn-sign-language");
});

test("joins a complete title split across consecutive final recognition results", () => {
  const parser = createTranscriptParser(dictionary, lesson);
  assert.deepEqual(parser.push("Leaves take in sunlight", 100), []);
  assert.deepEqual(parser.push("and roots take in", 200), []);
  assert.deepEqual(ids(parser.push("water", 300)), [titles[3]]);
  assert.deepEqual(parser.push("Now look at this picture", 400), []);
});

test("matches several results without replaying already consumed text", () => {
  const parser = createTranscriptParser(dictionary, lesson);
  assert.deepEqual(ids(parser.push("Good morning. Sit", 100)), [titles[0]]);
  assert.deepEqual(ids(parser.push("down. Today we will", 200)), [titles[1]]);
  assert.deepEqual(ids(parser.push("learn about plants", 300)), [titles[2]]);
  assert.deepEqual(parser.push("and flowers", 400), []);
});

test("unrelated words break a pending title", () => {
  const parser = createTranscriptParser(dictionary, lesson);
  parser.push("Today we will learn", 100);
  assert.deepEqual(parser.push("something else about plants", 200), []);
});

test("reset and timeout prevent stale speech fragments from matching later", () => {
  const parser = createTranscriptParser(dictionary, lesson);
  parser.push("Good", 100);
  parser.reset();
  assert.deepEqual(parser.push("morning", 200), []);
  parser.push("Sit", 300);
  assert.deepEqual(parser.push("down", 13000), []);
});

test("retains non-Latin text for captions but does not invent English-title translations", () => {
  assert.equal(normalizeTranscript("पौधे पानी"), "पौधे पानी");
  assert.deepEqual(findConceptMatches("पौधे पानी", dictionary, lesson), []);
});
