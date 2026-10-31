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

## Repository map

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for boundaries, data flow, safety
rules, extension points, and the optional backend contract.
