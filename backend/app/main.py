from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


ROOT = Path(__file__).resolve().parents[2]
DICTIONARY = json.loads((ROOT / "src/data/signDictionary.json").read_text())

app = FastAPI(title="ShikshaSign Live Matcher")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class MatchRequest(BaseModel):
    text: str
    lesson_id: str
    language: str = "en-IN"


class MatchResponse(BaseModel):
    matched: bool
    concept_id: str | None


@app.post("/match", response_model=MatchResponse)
def match_concept(request: MatchRequest) -> MatchResponse:
    normalized_text = " ".join(request.text.lower().split())
    for entry in DICTIONARY:
        if entry["lessonId"] != request.lesson_id or entry.get("reviewed") is not True:
            continue
        phrases = [entry["phrase"], *entry.get("aliases", [])]
        if any(phrase.lower() in normalized_text for phrase in phrases):
            return MatchResponse(matched=True, concept_id=entry["id"])
    return MatchResponse(matched=False, concept_id=None)
