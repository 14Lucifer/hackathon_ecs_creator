#!/bin/sh
set -e

# Run schema migrations before starting the API
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
