# Optional matching service

The MVP does not need this service. Add it only when the local matcher cannot
meet the measured precision or latency target. Keep the service stateless and
return concept IDs, never arbitrary file paths. The frontend remains
responsible for resolving IDs through its reviewed lesson dictionary.

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The current template accepts `POST /match` with `text`, `lesson_id`, and an
optional `language`. Configure additional deployed origins explicitly before
deployment; do not use a wildcard CORS policy in production.
