"""Import ASLLVD MediaPipe poses. Run: python -m backend.scripts.prepare_asl --download"""
import argparse
import hashlib
import io
import json
import pickle
import re
import urllib.request
import zipfile
from pathlib import Path
import numpy as np
from backend.app.config import ROOT, Settings
from backend.app.landmarks import Clip, LandmarkStore

SOURCE = "https://zenodo.org/records/6674324"
URL = SOURCE + "/files/ASLLVD-Skeleton.zip?download=1"
MD5 = "cd73156728bbc3ad1d016a5decc5c6ec"
ARCHIVE = ROOT / "backend/data/downloads/ASLLVD-Skeleton.zip"
LEXICON = ROOT / "backend/app/lexicon.json"


class ArrayUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        allowed = {
            ("numpy.core.multiarray", "_reconstruct"): np.core.multiarray._reconstruct,
            ("numpy", "ndarray"): np.ndarray,
            ("numpy", "dtype"): np.dtype,
        }
        if (module, name) not in allowed:
            raise pickle.UnpicklingError("Unsupported object in landmark file")
        return allowed[module, name]


def read_pose(data):
    if len(data) > 5_000_000:
        raise ValueError("Oversized pose sample")
    pose = ArrayUnpickler(io.BytesIO(data)).load()
    points = np.asarray(pose["keypoints"], dtype=np.float64)
    confidence = np.asarray(pose["confidences"], dtype=np.float64)
    if points.ndim != 3 or points.shape[1:] != (75, 3) or confidence.shape != points.shape[:2]:
        raise ValueError("Expected MediaPipe pose plus two 21-point hands")
    if not 2 <= points.shape[0] <= 1200 or not np.isfinite(points).all() or not np.isfinite(confidence).all():
        raise ValueError("Invalid pose sequence")
    frames = np.concatenate([points, confidence[..., None]], axis=2)
    quality = float(confidence[:, [11, 12, 13, 14, 15, 16, *range(33, 75)]].mean())
    return frames.round(5).tolist(), quality


def prepare(archive_path=ARCHIVE, database=None, fps=25):
    archive_path = Path(archive_path)
    digest = hashlib.md5()
    with archive_path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != MD5:
        raise ValueError("Archive does not match the publisher's checksum")
    store = LandmarkStore(database or Settings().database)
    entries = json.loads(LEXICON.read_text(encoding="utf-8"))["entries"]
    manifest, clips = [], []
    with zipfile.ZipFile(archive_path) as archive:
        for entry in entries:
            pattern = re.compile(r"ASLLVD-Skeleton/PKL_POSES/" + re.escape(entry["label"]) + r"-\d+\.pkl$")
            candidates = [info for info in archive.infolist() if pattern.fullmatch(info.filename)]
            best = None
            for info in candidates:
                if info.file_size > 5_000_000:
                    continue
                try:
                    frames, quality = read_pose(archive.read(info))
                except (ValueError, KeyError, pickle.UnpicklingError):
                    continue
                rank = (len(frames) >= 12, quality if len(frames) >= 12 else len(frames))
                if best is None or rank > best[0]:
                    best = rank, quality, info.filename, frames
            if best is None:
                raise ValueError("No usable sample for " + entry["gloss"])
            _, quality, filename, frames = best
            clips.append(Clip("asllvd:" + Path(filename).stem, entry["gloss"], fps, frames, SOURCE + "#" + filename))
            manifest.append({"gloss": entry["gloss"], "sample": filename,
                             "frames": len(frames), "mean_confidence": round(quality, 4), "playback_fps": fps})
    store.put_many(clips)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--archive", type=Path, default=ARCHIVE)
    parser.add_argument("--database", type=Path, default=Settings().database)
    parser.add_argument("--fps", type=float, default=25, help="Source PKLs have no timestamps; provisional playback rate (default 25).")
    args = parser.parse_args()
    if not 1 <= args.fps <= 60:
        parser.error("fps must be between 1 and 60")
    if args.download and not args.archive.exists():
        args.archive.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.archive.with_suffix(".partial")
        print("Downloading ASLLVD pose archive (~264 MB)...", flush=True)
        with urllib.request.urlopen(URL, timeout=60) as response, temporary.open("wb") as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        temporary.replace(args.archive)
    manifest = prepare(args.archive, args.database, args.fps)
    args.database.with_suffix(".manifest.json").write_text(json.dumps({"source": SOURCE,
        "checksum_md5": MD5, "sign_language": "asl", "clips": manifest}, indent=2), encoding="utf-8")
    print(f"Prepared {len(manifest)} ASL signs in {args.database}")


if __name__ == "__main__":
    main()
