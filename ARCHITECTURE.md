# ShikshaSign Live architecture

## Product boundary

The MVP supports one science lesson ("Plants"), live English/Hindi captions, and
local ISL media. The current library contains five supplied title-based videos
plus the original hello demo; 20–30 concepts remains a future content target.
It must never generate or guess a sign. Unmatched speech updates captions only.

## Folder division

```text
VTS-live/
├── public/
│   └── signs/                 # Approved, reviewed .mp4 files only
├── src/
│   ├── components/
│   │   ├── ClassroomMode.jsx  # Projector layout and fullscreen action
│   │   ├── ISLPlayer.jsx      # Current clip + FIFO playback queue
│   │   ├── LiveCaptions.jsx   # Interim and final caption rendering
│   │   └── Microphone.jsx     # Browser Speech Recognition adapter
│   ├── data/
│   │   └── signDictionary.json # Lesson-owned phrase/media catalogue
│   ├── hooks/
│   │   └── useSpeechRecognition.js
│   ├── lib/
│   │   └── conceptMatcher.js  # Deterministic approved-phrase matching
│   ├── App.jsx                # Composition and session state
│   ├── main.jsx               # Vite entry point
│   └── styles.css             # High-contrast classroom styling
├── backend/                   # Optional scale-up boundary, not needed for MVP
├── ARCHITECTURE.md
└── package.json
```

## Runtime flow

1. `App` selects the lesson and speech language.
2. `useSpeechRecognition` adapts browser events into interim/final text.
3. Interim text is rendered immediately; it is never matched.
4. Each final transcript is passed to `createTranscriptParser().push`.
5. The parser normalizes case/punctuation and matches complete titles, IDs, or
   explicitly configured aliases at word boundaries. It chooses the longest
   match at each position and returns all matches in spoken order. Only a trailing
   unfinished title prefix is retained between results, with a 12-second expiry.
6. `useSignPlayback` stores the FIFO queue in `App`, shared by `AnimationView` and
   `ISLPlayer`. Unique playback IDs allow repeat clips and reject stale end/error
   events. `SignVideo` handles muted autoplay, manual-play fallback, and failures.
7. `TranscriptTester` uses the stateless `findConceptMatches` entry point to test
   the same matching rules without contaminating the live speech buffer.
8. No match means no new video action; any already-playing clip can finish.

## Data contracts

Dictionary entries have this shape:

```json
{
  "id": "Today we will learn about plants",
  "lessonId": "science-plants",
  "phrase": "Today we will learn about plants",
  "aliases": [],
  "video": "/signs/Today we will learn about plants.mp4",
  "reviewed": true
}
```

`reviewed: true` enables an entry. Newly supplied IDs and phrases equal the source
filename minus `.mp4`. `lessonId: "general"` makes greetings and classroom commands
available in every lesson. Playback resolves only entries in this local catalogue;
transcript text is never used to construct a file path. Asset tests ensure enabled
entries refer to existing MP4 files.

## Optional backend contract

The included backend is an optional, separate single-match template; the browser
does not call it. Before replacing the local parser, it must adopt the same
normalization, general-lesson, multiple-match, and streaming behavior. Its current
request/response contract is:

```http
POST /match
Content-Type: application/json

{"text":"Today we will learn about plants","lesson_id":"science-plants","language":"en-IN"}
```

Response:

```json
{"matched":true,"concept_id":"Today we will learn about plants"}
```

An unsupported phrase returns `{"matched":false,"concept_id":null}`. The
backend must remain stateless and must never return arbitrary media paths.

## Non-functional requirements

- Target end-to-end latency: no more than four seconds.
- Target supported-phrase precision: at least 90%.
- Target quiet-room WER: no more than 25%.
- High contrast and large typography are required for projector use.
- Browser speech recognition and media failures must be visible to the teacher,
  while learner-facing fallback remains captions-only.

## Extension order

1. Add and review dictionary entries and media.
2. Add lesson selection and persisted lesson metadata.
3. Add matcher tests with false-positive cases.
4. Add FastAPI only if local matching misses the latency/precision targets.
5. Add telemetry only after privacy and consent requirements are defined.
