# Live ASL animation backend

Python 3.11 is required. This service uses the local sltAI extension interfaces
with an ASL vocabulary adapter and real ASLLVD MediaPipe coordinates. It never
instantiates the bundled PSL provider. The default animation mode needs this
service; the separate legacy ISL video-library mode does not.

Run from the **repository root**, in PowerShell:

```powershell
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt pytest httpx
.venv/Scripts/python.exe -m backend.scripts.prepare_asl --download
.venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

The `sltai/sign-language-translator` checkout must exist. Python dependencies and
the 101-sign dataset are already prepared in this workspace. The source archive
download is about 264 MB; subsequent imports reuse it. See
[data provenance and timing limitations](./data/README.md).

The frontend dev server proxies `/api` and `/ws` to port 8000. Keep Vite on 5173,
or configure `SIGN_ALLOWED_ORIGINS` with the actual browser origin. It defaults
to `http://localhost:5173,http://127.0.0.1:5173`. `SIGN_DATABASE` overrides the
SQLite path. `VITE_ANIMATION_WS_URL` selects a separately hosted WSS endpoint.

Endpoints:

- `GET /api/health`: service readiness, available ASL vocabulary and examples.
- `GET /api/catalog`: vocabulary and examples in English/Hindi.
- `WS /ws/animation`: versioned transcript-to-frame protocol with cancellation.
- `POST /match`: unchanged legacy single-match contract.

The backend stores sign motions and provenance, not lecture transcripts. It
prepares every gloss before streaming any motion, and falls back to captions
when words or landmarks are unavailable. The translation is a bounded
experimental vocabulary composer, not a trained general ASL grammar model.

```powershell
.venv/Scripts/python.exe -m pytest backend/tests -q
```

See [ANIMATION_ARCHITECTURE.md](../ANIMATION_ARCHITECTURE.md) for the protocol,
limits, smoothing, extension points and verification scope. Public deployment
requires TLS, authentication and global workload limits; origin checks alone
are not authentication.
