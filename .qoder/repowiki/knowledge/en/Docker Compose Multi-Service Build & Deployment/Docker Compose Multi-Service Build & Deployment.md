---
kind: build_system
name: Docker Compose Multi-Service Build & Deployment
category: build_system
scope:
    - '**'
source_files:
    - docker-compose.yml
    - backend/Dockerfile
    - frontend/Dockerfile
    - nginx/nginx.conf
    - backend/entrypoint.sh
    - backend/alembic.ini
    - backend/requirements.txt
    - frontend/package.json
    - frontend/vite.config.js
---

The project uses a container-first, Docker Compose-based build and deployment system that orchestrates four services: a React SPA (Vite), a FastAPI backend (Uvicorn), PostgreSQL 15, and an nginx reverse proxy. There is no Makefile or CI pipeline in the repository; local development and production are both driven by `docker-compose.yml`.

**Build stages**
- **Frontend**: `frontend/Dockerfile` runs `npm install` then `vite build`, emitting static assets into `/app/dist`. The compose `frontend` service copies `/app/dist` into a shared named volume `frontend_build` so nginx can serve it read-only.
- **Backend**: `backend/Dockerfile` installs Python dependencies from `requirements.txt`, copies source, and sets `entrypoint.sh` as CMD. On startup the entrypoint executes `alembic upgrade head` to apply all pending migrations before launching Uvicorn on port 8000.
- **Database**: `postgres:15-alpine` image with a persistent volume mounted at `./pgdata`; healthcheck uses `pg_isready`.
- **Reverse proxy**: `nginx:alpine` serves the built frontend from `/usr/share/nginx/html` and proxies `/api/` requests to `http://backend:8000`. SPA client-side routing is handled via `try_files $uri $uri/ /index.html`.

**Development vs. production**
- Development mounts `./backend:/app` for live code reload; production would remove this bind mount.
- Frontend dev server (`vite`) is not exposed directly — the compose file builds once and serves through nginx, keeping a single entry point on port 80.
- Environment variables are loaded from `.env` via `env_file` for the backend and database credentials.

**Dependency management**
- Backend: pinned versions in `backend/requirements.txt` (FastAPI 0.115.6, SQLAlchemy 2.0.36, Alembic 1.14.0, Alibaba Cloud SDKs, etc.).
- Frontend: `frontend/package.json` with Vite 5, React 18, TailwindCSS 3, and PostCSS/Autoprefixer.
- No lock files (no `poetry.lock`, `pnpm-lock.yaml`, or `package-lock.json` committed); builds rely on exact version pins in manifests.

**Database migrations**
- Alembic is configured via `backend/alembic.ini` pointing at `alembic/versions/`; the initial schema lives in `0001_initial_schema.py`. Migrations run automatically inside the container entrypoint before the API becomes ready.

**Conventions & constraints**
- Every service has its own Dockerfile; nothing is built locally outside containers.
- All inter-service communication happens over the Docker network (e.g., nginx → `backend:8000`).
- Secrets (DB_USER, DB_PASSWORD) must be supplied via `.env`; `.env.example` documents required keys.
- The nginx config enforces a 10 MB request body limit and a 300 s proxy read timeout for long-running operations.