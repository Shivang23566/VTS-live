# VTS-live

ShikshaSign Live is a browser-based classroom accessibility tool for the
GRAVITON 2026 Problem Statement #30. It converts a teacher's English or Hindi
speech into live captions and plays only pre-approved Indian Sign Language
(ISL) clips for concepts in the selected lesson.

## MVP starter

The starter is intentionally local-first:

- React + Vite frontend
- Browser Web Speech API for transcription
- A versioned local sign dictionary for safe phrase matching
- A queued HTML5 video player
- Captions-only fallback for unsupported speech
- Optional FastAPI matching service documented in
  [`ARCHITECTURE.md`](./ARCHITECTURE.md)

### Run the frontend

```bash
npm install
npm run dev
```

### Install optional backend dependencies

From the repository root:

```bash
python -m pip install -r requirements.txt
```

The root requirements file delegates to
[`backend/requirements.txt`](./backend/requirements.txt). The FastAPI service
is optional for the local-first MVP.

Open the printed local URL in Chrome or Edge, allow microphone access, select
English or Hindi, and start the lecture. The browser Speech Recognition API is
not available in every browser.

Place approved `.mp4` files in [`public/signs/`](./public/signs/) using the
paths in [`src/data/signDictionary.json`](./src/data/signDictionary.json).

## Try the supplied video dataset

Open **Enter classroom**, leave **2D Animation** selected, choose **English**,
then click **Start lecture** and allow microphone access. Speak any of these
complete titles:

- GOOD MORNING
- SIT DOWN
- Today we will learn about plants
- Leaves take in sunlight and roots take in water
- Plants make food because they have sunlight and water.

The original filenames are preserved under `public/signs/`. Each new dictionary
ID is its filename without `.mp4`; the extra full stop in the last filename is
preserved in its ID but ignored during matching. The existing hello/sign-language
demo clip is also retained. Old plant placeholders without video files have been
replaced with this supplied dataset.

Open **Video library and text test** to click a title or type a transcript and
select **Match and play**. This uses the same matching rules without requiring
microphone access. For example, `Good morning. Sit down. Today we will learn about
plants.` queues three clips in that order.

Matching ignores case, punctuation, and repeated whitespace, but requires a
complete title or explicitly configured alias on whole-word boundaries. It does
not guess semantic matches: `plants`, `sunlight`, or `sit` alone will not play a
longer video. A title split across consecutive final speech results is assembled
for up to 12 seconds between results. Start/stop and language changes reset these
unfinished fragments. The supplied titles are English; Hindi transcription still
works for captions, but no Hindi title aliases have been added.

Both display modes share a playback queue. New matches wait for the current clip
to finish; repeated titles can play again. Videos start muted, preserve their
full aspect ratio, and expose playback controls. A blocked autoplay request shows
a **Play animation** button; a failed media file is reported and skipped. **Stop
lecture** also clears playback. Switching display modes retains queued clips but
restarts the current clip in the newly selected view.

### Validate the core

```bash
npm test
npm run build
```

The tests cover title matching, split speech results, missing/invalid assets,
playback order, repeated titles, and stale completion events.

## Repository map

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for boundaries, data flow, safety
rules, extension points, and the optional backend contract.
