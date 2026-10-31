import threading
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from backend.app.config import Settings
from backend.app.landmarks import Clip, LandmarkStore, validate_frames
from backend.app.main import create_app
from backend.app.service import AnimationService
from backend.app.translation import GlossTranslator, LEXICON, TranslationUnavailable
from backend.scripts.prepare_asl import ArrayUnpickler


@pytest.fixture
def store(tmp_path):
    store = LandmarkStore(tmp_path / "motion.sqlite3")
    # Deliberately synthetic data for transport tests only; never shipped as signs.
    frames = [[[.5, .4, 0., 1.] for _ in range(75)] for _ in range(26)]
    for gloss in ["HELLO", "WATER", "I", "WANT"]:
        store.put(Clip("fixture:" + gloss, gloss, 25, frames, "test-fixture"))
    return store


@pytest.fixture
def client(store):
    with TestClient(create_app(Settings(database=store.path), AnimationService(store))) as client:
        yield client


def request(id="one", text="hello", language="en-IN"):
    return {"version": 1, "type": "translate", "request_id": id, "text": text, "language": language}


def connect(client):
    return client.websocket_connect("/ws/animation", headers={"origin": "http://localhost:5173"})


def collect(ws):
    messages = []
    while True:
        message = ws.receive_json()
        messages.append(message)
        if message["type"] in ["complete", "error"]:
            return messages


def test_translation_uses_asl_and_explicit_hindi_sentence_order():
    translator = GlossTranslator()
    assert translator.sign_language.name() == "asl"
    assert translator.translate("I want water.", "en-IN") == ["I", "WANT", "WATER"]
    assert translator.translate("मुझे पानी चाहिए।", "hi-IN") == ["I", "WANT", "WATER"]
    assert translator.translate("HELLO! Water. Hello!", "en-IN") == ["HELLO", "WATER", "HELLO"]


def test_daily_vocabulary_and_bilingual_sentence_patterns():
    translator = GlossTranslator()
    assert len(LEXICON["entries"]) >= 100
    assert len({e["gloss"] for e in LEXICON["entries"]}) == len(LEXICON["entries"])
    for entry in LEXICON["entries"]:
        for language, key in [("en-IN", "en"), ("hi-IN", "hi")]:
            for alias in entry[key]:
                assert translator.translate(alias, language) == [entry["gloss"]], alias
    assert translator.translate("I want a pencil", "en-IN") == ["I", "WANT", "PENCIL"]
    assert translator.translate("मुझे दूध चाहिए", "hi-IN") == ["I", "WANT", "MILK"]
    assert translator.translate("मैं चाय पीती हूँ", "hi-IN") == ["I", "DRINK", "TEA"]
    assert next(e for e in LEXICON["entries"] if e["gloss"] == "I")["label"] == "ix_1p"


def test_ambiguous_hindi_time_and_negation_are_not_silently_lost():
    for text in ["कल", "मुझे दूध नहीं चाहिए"]:
        with pytest.raises(TranslationUnavailable):
            GlossTranslator().translate(text, "hi-IN")


def test_store_batch_is_atomic(store):
    before=store.glosses()
    valid=Clip("fixture:BOOK", "BOOK", 25, [[[.5,.5,0,1] for _ in range(75)]]*2, "test-fixture")
    invalid=Clip("fixture:INVALID", "INVALID", 0, valid.frames, "test-fixture")
    with pytest.raises(ValueError): store.put_many([valid, invalid])
    assert store.glosses() == before


def test_unknown_words_are_not_dropped_or_replaced():
    with pytest.raises(TranslationUnavailable):
        GlossTranslator().translate("I do not want water", "en-IN")
    with pytest.raises(TranslationUnavailable):
        GlossTranslator().translate("unicorn water", "en-IN")


def test_missing_landmarks_prevents_partial_sentence(store):
    with pytest.raises(TranslationUnavailable, match="BOOK"):
        AnimationService(store).prepare("I want a book", "en-IN")


def test_rejects_bad_coordinate_shape_and_nan():
    with pytest.raises(ValueError): validate_frames([[[0, 0, 0, 1]]]*2)
    frames = [[[0, 0, float("nan"), 1] for _ in range(75)]] * 2
    with pytest.raises(ValueError): validate_frames(frames)


def test_pickle_loader_rejects_executable_globals():
    import io
    with pytest.raises(Exception, match="Unsupported object"):
        ArrayUnpickler(io.BytesIO(b"cos\nsystem\n.")).load()


def test_health_exposes_available_asl_vocabulary(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["sign_language"] == "asl"
    assert response.json()["ready"] is True
    assert len(response.json()["vocabulary"]) == 4


def test_streamed_frames_preserve_order_and_repeat_signs(client):
    with connect(client) as ws:
        assert ws.receive_json()["type"] == "ready"
        ws.send_json(request(text="hello water hello"))
        messages = collect(ws)
        assert messages[0]["glosses"] == ["HELLO", "WATER", "HELLO"]
        clips = [m for m in messages if m["type"] == "clip_start"]
        assert [c["clip_index"] for c in clips] == [0, 1, 2]
        for index in range(3):
            chunks = [m for m in messages if m["type"] == "frames" and m["clip_index"] == index]
            assert [c["offset"] for c in chunks] == [0, 12, 24]
            assert sum(len(c["frames"]) for c in chunks) == 26
        assert messages[-1]["type"] == "complete"


def test_bad_request_and_unsupported_text_keep_connection_usable(client):
    with connect(client) as ws:
        ws.receive_json()
        ws.send_text("not json")
        assert ws.receive_json()["code"] == "invalid_request"
        ws.send_json(request(text="hello volcano"))
        assert collect(ws)[0]["type"] == "error"
        ws.send_json(request(id="two", text="मुझे पानी चाहिए", language="hi-IN"))
        assert collect(ws)[-1]["type"] == "complete"


def test_rejects_unlisted_browser_origin(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/animation", headers={"origin": "https://untrusted.invalid"}):
            pass


def test_cancel_during_translation_discards_stale_response(store):
    service = AnimationService(store)
    entered, release = threading.Event(), threading.Event()
    original = service.prepare
    def delayed(text, language):
        if text == "hello":
            entered.set()
            assert release.wait(5)
        return original(text, language)
    service.prepare = delayed
    with TestClient(create_app(Settings(database=store.path), service)) as client:
        with connect(client) as ws:
            ws.receive_json()
            ws.send_json(request("old", "hello"))
            assert entered.wait(5)
            ws.send_json({"type": "cancel", "version": 1})
            assert ws.receive_json()["type"] == "cancelled"
            ws.send_json(request("new", "water"))
            release.set()
            messages = collect(ws)
            assert all(m["request_id"] == "new" for m in messages)


def test_two_connections_do_not_share_cancel_state(client):
    with connect(client) as first, connect(client) as second:
        first.receive_json(); second.receive_json()
        first.send_json({"type": "cancel", "version": 1})
        assert first.receive_json()["type"] == "cancelled"
        second.send_json(request())
        assert collect(second)[-1]["type"] == "complete"


def test_legacy_match_endpoint_remains_available(client):
    assert client.post("/match", json={"text":"Today we will learn about plants", "lesson_id":"science-plants"}).json()["matched"]
