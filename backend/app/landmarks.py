"""Validated, local-only landmark storage. No user-supplied paths or downloads."""
import json
import math
import sqlite3
from dataclasses import dataclass
from pathlib import Path

LANDMARK_COUNT = 75  # MediaPipe: pose 0..32, left hand 33..53, right hand 54..74
MAX_CLIP_FRAMES = 1200


def validate_frames(frames):
    if not isinstance(frames, list) or not 2 <= len(frames) <= MAX_CLIP_FRAMES:
        raise ValueError("A clip needs 2 to 1200 frames")
    for frame in frames:
        if not isinstance(frame, list) or len(frame) != LANDMARK_COUNT:
            raise ValueError("Expected 75 landmarks per frame")
        for point in frame:
            if not isinstance(point, list) or len(point) != 4:
                raise ValueError("Each landmark must be [x, y, z, confidence]")
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in point):
                raise ValueError("Landmarks must contain finite numbers")
            if any(abs(v) > 10 for v in point[:3]) or not 0 <= point[3] <= 1:
                raise ValueError("Invalid normalized coordinates or confidence")


@dataclass(frozen=True)
class Clip:
    id: str
    gloss: str
    fps: float
    frames: list
    source: str


class LandmarkStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS clips (
                id TEXT PRIMARY KEY, gloss TEXT NOT NULL UNIQUE,
                sign_language TEXT NOT NULL CHECK(sign_language = 'asl'),
                fps REAL NOT NULL, frames TEXT NOT NULL, source TEXT NOT NULL,
                schema TEXT NOT NULL DEFAULT 'mediapipe-image-75-v1'
            )""")

    def connect(self):
        return sqlite3.connect(self.path)

    def put(self, clip: Clip):
        self.put_many([clip])

    def put_many(self, clips):
        records = []
        for clip in clips:
            validate_frames(clip.frames)
            if not math.isfinite(clip.fps) or not 1 <= clip.fps <= 60:
                raise ValueError("Frame rate must be between 1 and 60")
            if not clip.source or not clip.id or not clip.gloss:
                raise ValueError("A clip needs an ID, gloss and provenance")
            records.append((clip.id, clip.gloss, clip.fps, json.dumps(clip.frames, separators=(",", ":")), clip.source))
        with self.connect() as db:
            db.executemany("""INSERT INTO clips (id, gloss, sign_language, fps, frames, source)
                VALUES (?, ?, 'asl', ?, ?, ?)
                ON CONFLICT(gloss) DO UPDATE SET id=excluded.id, fps=excluded.fps,
                frames=excluded.frames, source=excluded.source""",
                records)

    def get(self, gloss: str) -> Clip | None:
        with self.connect() as db:
            row = db.execute("SELECT id, gloss, fps, frames, source FROM clips WHERE gloss=? AND sign_language='asl'",
                             (gloss,)).fetchone()
        if not row:
            return None
        clip = Clip(row[0], row[1], row[2], json.loads(row[3]), row[4])
        validate_frames(clip.frames)
        if not math.isfinite(clip.fps) or not 1 <= clip.fps <= 60:
            raise ValueError("Invalid stored frame rate")
        return clip

    def glosses(self):
        with self.connect() as db:
            return [row[0] for row in db.execute("SELECT gloss FROM clips WHERE sign_language='asl' ORDER BY gloss")]
