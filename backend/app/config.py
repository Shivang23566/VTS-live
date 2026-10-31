import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    database: Path = field(default_factory=lambda: Path(os.getenv(
        "SIGN_DATABASE", str(ROOT / "backend/data/landmarks.sqlite3")
    )))
    origins: tuple[str, ...] = field(default_factory=lambda: tuple(
        item.strip() for item in os.getenv(
            "SIGN_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if item.strip()
    ))
    max_pending: int = 8
    chunk_frames: int = 12
    max_request_frames: int = 2400
