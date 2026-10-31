from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class TranslateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    type: Literal["translate"]
    version: Literal[1]
    request_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    text: str = Field(min_length=1, max_length=1200)
    language: Literal["en-IN", "hi-IN"]


class CancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["cancel"]
    version: Literal[1]
