import asyncio
import json
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError

from .config import ROOT, Settings
from .landmarks import LandmarkStore
from .protocol import CancelRequest, TranslateRequest
from .service import AnimationService
from .translation import TranslationUnavailable

logger = logging.getLogger(__name__)


def create_app(settings=None, service=None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        app.state.animation = service or AnimationService(
            LandmarkStore(settings.database), max_frames=settings.max_request_frames
        )
        yield

    app = FastAPI(title="ShikshaSign Live Animation", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.origins),
                       allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": 1, **app.state.animation.catalog()}

    @app.get("/api/catalog")
    def catalog():
        return app.state.animation.catalog()

    @app.websocket("/ws/animation")
    async def animation(websocket: WebSocket):
        # CORSMiddleware does not validate WebSocket origins.
        if websocket.headers.get("origin") not in settings.origins:
            await websocket.close(code=1008)
            return
        await websocket.accept()
        await websocket.send_json({"type": "ready", "version": 1, **app.state.animation.catalog()})
        queue = asyncio.Queue(maxsize=settings.max_pending)
        epoch = 0
        pending = set()
        send_lock = asyncio.Lock()

        async def send(message, generation=None):
            async with send_lock:
                if generation is None or generation == epoch:
                    await websocket.send_json({"version": 1, **message})

        async def work():
            while True:
                generation, request = await queue.get()
                identity = (generation, request.request_id)
                try:
                    glosses, clips = await asyncio.wait_for(asyncio.to_thread(
                        app.state.animation.prepare, request.text, request.language
                    ), timeout=20)
                    if generation != epoch:
                        continue
                    await send({"type": "translation", "request_id": request.request_id,
                                "sign_language": "asl", "glosses": glosses,
                                "clip_count": len(clips)}, generation)
                    for index, clip in enumerate(clips):
                        if generation != epoch:
                            break
                        common = {"request_id": request.request_id, "clip_index": index}
                        await send({"type": "clip_start", **common, "id": clip.id, "gloss": clip.gloss,
                                    "fps": clip.fps, "frame_count": len(clip.frames),
                                    "schema": "mediapipe-image-75-v1", "source": clip.source}, generation)
                        for offset in range(0, len(clip.frames), settings.chunk_frames):
                            if generation != epoch:
                                break
                            await send({"type": "frames", **common, "offset": offset,
                                        "frames": clip.frames[offset:offset + settings.chunk_frames]}, generation)
                            await asyncio.sleep(0)
                        await send({"type": "clip_end", **common}, generation)
                    await send({"type": "complete", "request_id": request.request_id}, generation)
                except TranslationUnavailable as error:
                    await send({"type": "error", "request_id": request.request_id,
                                "code": error.code, "message": str(error)}, generation)
                except (TimeoutError, ValueError):
                    await send({"type": "error", "request_id": request.request_id,
                                "code": "invalid_motion", "message": "Animation data could not be prepared. Captions continue."}, generation)
                except (WebSocketDisconnect, RuntimeError):
                    return
                except Exception:
                    logger.exception("Animation preparation failed")
                    await send({"type": "error", "request_id": request.request_id,
                                "code": "unavailable", "message": "Animation service unavailable. Captions continue."}, generation)
                finally:
                    pending.discard(identity)
                    queue.task_done()

        worker = asyncio.create_task(work())
        try:
            while True:
                raw = await websocket.receive_text()
                if len(raw) > 16000:
                    await websocket.close(code=1009)
                    break
                payload = None
                try:
                    payload = json.loads(raw)
                    if isinstance(payload, dict) and payload.get("type") == "cancel":
                        CancelRequest.model_validate(payload)
                        epoch += 1
                        while not queue.empty():
                            queue.get_nowait()
                            queue.task_done()
                        pending.clear()
                        await send({"type": "cancelled"})
                        continue
                    request = TranslateRequest.model_validate(payload)
                except (ValidationError, json.JSONDecodeError):
                    request_id = payload.get("request_id") if isinstance(payload, dict) else None
                    if not isinstance(request_id, str) or len(request_id) > 80:
                        request_id = None
                    await send({"type": "error", "request_id": request_id,
                                "code": "invalid_request", "message": "Send a supported language and a nonempty transcript of at most 1200 characters."})
                    continue
                identity = (epoch, request.request_id)
                if identity in pending:
                    continue
                if len(pending) >= settings.max_pending:
                    await send({"type": "error", "request_id": request.request_id,
                                "code": "busy", "message": "Animation queue is full. Please pause briefly; captions continue."})
                    continue
                pending.add(identity)
                queue.put_nowait((epoch, request))
        except WebSocketDisconnect:
            pass
        finally:
            worker.cancel()
            with suppress(asyncio.CancelledError, WebSocketDisconnect, RuntimeError):
                await worker

    # Retained for existing integrations. The live avatar uses /ws/animation.
    dictionary = json.loads((ROOT / "src/data/signDictionary.json").read_text(encoding="utf-8"))

    class MatchRequest(BaseModel):
        text: str
        lesson_id: str
        language: str = "en-IN"

    @app.post("/match")
    def match_concept(request: MatchRequest):
        normalized = " ".join(request.text.lower().split())
        for entry in dictionary:
            if entry["lessonId"] != request.lesson_id or entry.get("reviewed") is not True:
                continue
            if any(phrase.lower() in normalized for phrase in [entry["phrase"], *entry.get("aliases", [])]):
                return {"matched": True, "concept_id": entry["id"]}
        return {"matched": False, "concept_id": None}

    frontend = ROOT / "dist"
    if frontend.is_dir():
        app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")

    return app


app = create_app()
