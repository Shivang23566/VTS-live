import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dictionary = JSON.parse(readFileSync(new URL("../src/data/signDictionary.json", import.meta.url), "utf8"));
const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));

test("every enabled dictionary entry has a unique ID and a nonempty local MP4", () => {
  const ids = new Set();
  for (const entry of dictionary.filter((entry) => entry.reviewed)) {
    assert.ok(!ids.has(entry.id), `Duplicate ID: ${entry.id}`);
    ids.add(entry.id);
    const filename = path.resolve(publicRoot, `.${decodeURIComponent(entry.video)}`);
    assert.ok(filename.startsWith(publicRoot), `Asset outside public: ${entry.video}`);
    assert.ok(statSync(filename).size > 0, entry.video);
    const bytes = readFileSync(filename);
    assert.equal(bytes.toString("ascii", 4, 8), "ftyp", `Not an MP4 container: ${entry.video}`);
  }
});

test("all five supplied IDs preserve the exact source filename without its extension", () => {
  const supplied = dictionary.filter(({ id }) => id !== "hello-today-learn-sign-language");
  assert.equal(supplied.length, 5);
  for (const entry of supplied) {
    assert.equal(path.basename(entry.video, ".mp4"), entry.id);
    assert.equal(entry.phrase, entry.id);
  }
});
