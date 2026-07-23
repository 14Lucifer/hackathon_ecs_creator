---
kind: logging_system
name: No dedicated logging system
category: logging_system
scope:
    - '**'
source_files:
    - backend/alembic/env.py
---

This repository does not implement a structured or centralized logging system. The FastAPI backend (backend/app) contains no logger initialization, no use of Python's `logging` module, and no third-party logging frameworks (e.g., structlog, loguru). There are zero `print()` calls in the application code under `backend/app/`. The only logging-related import is in `backend/alembic/env.py`, which loads Alembic's own migration logging via `logging.config.fileConfig`; this configures Alembic's internal migration output, not application logs. Uvicorn is used as the ASGI server but no custom access/error logging configuration is applied. As a result, there are no log levels, no structured fields, no sinks, and no conventions for developers to follow — the category effectively does not apply to this codebase.