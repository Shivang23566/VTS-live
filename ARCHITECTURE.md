# ShikshaSign Live architecture

## Product boundary

The MVP supports one science lesson ("Plants"), 20–30 approved concepts, live
English/Hindi captions, and verified local ISL media. It must never generate or
guess a sign. An unmatched phrase updates captions only.

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
4. A final transcript is passed to `findConceptMatch`.
5. Only an exact approved phrase, approved synonym, or safe token match
   returns a dictionary entry.
6. `ISLPlayer` appends the clip to a FIFO queue and never interrupts a clip.
7. No match means no video action and no error shown to learners.

## Data contracts

Dictionary entries have this shape:

```json
{
  "id": "plants-need-sunlight",
  "lessonId": "science-plants",
  "phrase": "plants need sunlight",
  "aliases": ["plants need sun"],
  "video": "/signs/plants-need-sunlight.mp4",
  "reviewed": true
}
```

`reviewed` is required. The matcher ignores entries without it, making an
unreviewed asset impossible to play accidentally.

## Optional backend contract

When local matching is insufficient, the frontend can replace
`findConceptMatch` with:

```http
POST /match
Content-Type: application/json

{"text":"plants need sun","lesson_id":"science-plants","language":"en-IN"}
```

Response:

```json
{"matched":true,"concept_id":"plants-need-sunlight"}
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
