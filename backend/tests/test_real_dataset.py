"""Optional integration checks against prepared data, not mock sign motion."""
import pytest
from backend.app.config import Settings
from backend.app.landmarks import LandmarkStore, validate_frames
from backend.app.service import AnimationService
from backend.app.translation import LEXICON


@pytest.mark.skipif(not Settings().database.exists(), reason="Run prepare_asl to test the real ASL dataset")
def test_every_catalog_entry_has_actual_asllvd_landmarks():
    store=LandmarkStore(Settings().database)
    service=AnimationService(store)
    assert len(service.catalog()["vocabulary"]) >= 100
    for entry in LEXICON["entries"]:
        clip=store.get(entry["gloss"])
        assert clip is not None, entry["gloss"]
        assert clip.id.startswith("asllvd:" + entry["label"] + "-")
        assert clip.source.startswith("https://zenodo.org/records/6674324#")
        validate_frames(clip.frames)
        assert any(p[3] > .2 for f in clip.frames for p in f[33:])
        assert service.prepare(entry["hi"][0], "hi-IN")[0] == [entry["gloss"]]
