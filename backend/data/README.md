# ASL motion data

The runtime database is generated locally, not committed. It contains 101
ASLLVD signs selected by `app/lexicon.json`. The source archive contains actual
MediaPipe pose/hand estimates, not synthetic demo coordinates.

- Pose release: [OpenHands labelled pose datasets, Zenodo 6674324](https://zenodo.org/records/6674324).
- Original collection: [Boston University's ASLLVD](https://www.bu.edu/av/asllrp/dai-asllvd.html).
- Pose processing: [AI4Bharat/OpenHands](https://github.com/AI4Bharat/OpenHands).
- Published archive MD5: `cd73156728bbc3ad1d016a5decc5c6ec`.

`landmarks.manifest.json` records the exact selected sample, source, frame count,
confidence and provisional playback rate. The importer verifies the archive
checksum, reads only allowlisted NumPy data objects, validates all coordinates,
and writes the selected catalogue in one SQLite transaction. It does not extract
arbitrary archive paths or execute dataset objects.

The original PKLs lack timestamps. The configured 25 fps is a provisional
playback rate, not a measured source rate. The UI starts at 0.75x and provides a
speed control. The 75-point layout is 33 body landmarks, 21 left-hand landmarks,
then 21 right-hand landmarks. Stored points are `[x, y, z, confidence]` in image
coordinates, not separately centered MediaPipe world-hand coordinates.

These are research dataset samples, not professionally validated avatar signs.
Dataset licensing is separate from OpenHands' Apache software license; consult
the original dataset's terms before redistribution or deployment. Downloads and
the database stay local and ignored by Git. No PSL assets are downloaded or used.

Recreate from the repository root:

```powershell
.venv/Scripts/python.exe -m backend.scripts.prepare_asl --download
```

Use `--archive`, `--database` or `--fps` to configure input, output and timing.
After changing the lexicon or reimporting, restart the backend and reconnect the
classroom to refresh its vocabulary.
