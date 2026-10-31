# VTS-live

ShikshaSign Live is a browser-based classroom accessibility tool for the
GRAVITON 2026 Problem Statement #30. It converts a teacher's English or Hindi
speech into live captions. The default view now streams skeletal coordinates
from Python into a WebGL ASL avatar. A separately labeled legacy mode plays
the existing Indian Sign Language (ISL) lesson clips.

## Live ASL avatar

The avatar supports **101 distinct daily-use signs**, **117 English aliases**
and **135 Hindi aliases**. Search its vocabulary for greetings, food/drinks,
family, feelings, objects, actions, places, questions and time. Try `I want water`,
`I want a pencil`, `मुझे दूध चाहिए`, or individual words such as `mother` and `coffee`.

The decoupled pipeline is: final transcript → sltAI-compatible ASL gloss adapter
→ SQLite landmark library → WebSocket frame chunks → articulated WebGL avatar.
Adaptive filtering, interpolation and short transitions smooth motion; the UI
provides playback speed controls. The avatar has individual finger bones.

This is an **experimental vocabulary composer**, not a trained general ASL
translation model. Unknown words remain captions-only. Sentence grammar and
facial expressions need further model/expert work. No PSL data or provider is used.

See [ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md) for module boundaries,
protocol, configuration and limitations; [data provenance](./backend/data/README.md)
identifies the actual ASLLVD source and provisional playback timing.

### Start the complete app

Use Python **3.11**. The local `sltai/sign-language-translator` checkout must
exist (version 0.8.1, inspected revision `cca5f3a`). Run from the repository root:

```powershell
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt pytest httpx
.venv/Scripts/python.exe -m backend.scripts.prepare_asl --download
.venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Preparation downloads about 264 MB once and imports the selected ASL poses.
The environment and data are already prepared in this workspace. In a second terminal:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`, enter the classroom and use **Try the live ASL avatar**.
The text test needs no microphone; live speech uses Chrome/Edge recognition.

## Legacy ISL video library

The original video mode remains local-first:

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

### Backend dependencies

From the repository root:

```bash
python -m pip install -r requirements.txt
```

The root requirements file installs FastAPI and local sltAI. Python is required
for the ASL avatar, but not for the legacy video library. See
[`backend/README.md`](./backend/README.md).

Open the printed local URL in Chrome or Edge, allow microphone access, select
English or Hindi, and start the lecture. The browser Speech Recognition API is
not available in every browser.

Place approved `.mp4` files in [`public/signs/`](./public/signs/) using the
paths in [`src/data/signDictionary.json`](./src/data/signDictionary.json).

## Try the supplied video dataset

Open **Enter classroom**, choose **Switch to ISL video library**, choose **English**,
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

The ISL video mode has its own playback queue. New matches wait for the current
clip to finish; repeated titles can play again. Videos start muted, preserve their
full aspect ratio, and expose playback controls. A blocked autoplay request shows
a **Play animation** button; a failed media file is reported and skipped. **Stop
lecture** also clears playback. Switching between ASL animation and ISL video
clears both queues to avoid mixing sign languages or replaying stale motion.

### Validate the core

```bash
npm test
npm run build
.venv/Scripts/python.exe -m pytest backend/tests -q
```

Tests cover legacy title matching/playback plus ASL vocabulary, imported
landmarks, streaming order, cancellation, invalid data and motion smoothing.

## Repository map

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for boundaries, data flow, safety
rules, extension points, and the optional backend contract.
