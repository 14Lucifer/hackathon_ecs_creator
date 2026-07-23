---
kind: error_handling
name: FastAPI HTTPException-driven error handling with per-route try/except and batch partial-failure reporting
category: error_handling
scope:
    - '**'
source_files:
    - backend/app/main.py
    - backend/app/middleware/auth.py
    - backend/app/routers/approvals.py
    - backend/app/routers/auth.py
    - backend/app/routers/requests.py
    - backend/app/routers/users.py
    - backend/app/services/approval.py
    - backend/app/services/settings_service.py
    - backend/app/database.py
    - frontend/src/services/api.js
    - frontend/src/components/ui.jsx
---

The ECS Resource Request & Approval System uses a straightforward, convention-based error-handling approach built around FastAPI's `HTTPException` on the backend and a thin fetch wrapper on the frontend. There is no centralized exception class hierarchy or global exception handler registered in `main.py`; instead, each router raises `HTTPException` directly with an appropriate status code and human-readable `detail` string.

**Backend (FastAPI)**
- Authentication errors are raised from the shared dependency `app/middleware/auth.py`: `401 Not authenticated`, `401 Session expired`, `401 Account is disabled`, and `403 Admin privileges required`.
- Routers raise domain-specific `HTTPException`s: `404 Template/User not found`, `409 User already exists`, `400 Invalid password / bad file upload`, `502 Alibaba Cloud API error` (in `routers/approvals.py`).
- Service-layer validation errors use plain Python exceptions (`ValueError` in `services/settings_service.get_aliyun_config`) which callers catch and re-raise as `HTTPException(400)`.
- Batch operations (`approve_requests`, `reject_requests`, `approve_deletions`, `reject_deletions` in `services/approval.py`) wrap each item in its own `try/except Exception`, rolling back per-item DB transactions and returning a structured `ApprovalBatchResult` with per-item `success`/`error` fields — partial success is preserved rather than failing the whole batch.
- Database sessions are managed via a generator dependency (`database.get_db`) that always closes the session in a `finally` block; there is no global SQLAlchemy exception-to-HTTP mapping.
- No custom `@app.exception_handler` is registered, so Pydantic validation errors and unhandled exceptions fall through to FastAPI's default JSON error responses.

**Frontend (React + Vite)**
- A single `ApiError` class extends `Error` and carries the HTTP `status` code.
- The `request()` wrapper in `frontend/src/services/api.js` centralizes response parsing: for non-`ok` responses it tries to read `data.detail` (matching FastAPI's `HTTPException.detail`) and throws an `ApiError`; for `401` on non-login routes it dispatches a `session-expired` event so the app can redirect to login.
- Pages consume errors by catching `ApiError` and rendering a shared `ErrorBanner` component; approval results display per-item `r.error` strings returned from the backend batch endpoints.

**Conventions developers should follow**
- Raise `fastapi.HTTPException(status_code=..., detail="...")` from routers and dependencies; keep `detail` user-facing and free of stack traces.
- Use plain `ValueError` (or other typed exceptions) inside services for configuration/validation failures and let the caller translate them into `HTTPException`s.
- For multi-item write operations, adopt the `approval.py` pattern: iterate items, wrap each in `try/except`, rollback per-item DB state, and return a result object summarizing successes and individual errors.
- On the frontend, throw `ApiError(detail, status)` from `api.request` and handle it uniformly with `ErrorBanner` or toast notifications; rely on the `401` → `session-expired` event for auth loss.