# Deployment Guide — ECS Resource Request & Approval System

This guide covers deploying, operating, and maintaining the system with Docker
Compose, plus local development setup.

---

## 1. Architecture Overview

```
                    ┌─────────────────────────────────────────┐
 Browser ──:80──►   │  nginx (alpine)                         │
                    │   ├── /        → React static build     │
                    │   └── /api/*   → proxy to backend:8000  │
                    └──────────────┬──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐     ┌──────────────────┐
                    │  backend (FastAPI/uvicorn)  │────►│  postgres:15     │
                    │  Alembic migrations on boot │     │  ./pgdata volume │
                    └──────────────┬──────────────┘     └──────────────────┘
                                   │
                                   ▼
                      Alibaba Cloud APIs (ECS / VPC)
```

Compose services:

| Service | Image / Build | Role |
|---------|---------------|------|
| `nginx` | `nginx:alpine` | Serves the React build, proxies `/api/*`, exposes port **80** |
| `frontend` | `frontend/Dockerfile` (node:20) | **One-shot builder** — compiles the React app, copies `dist/` into the shared `frontend_build` volume, then exits |
| `backend` | `backend/Dockerfile` (python:3.11-slim) | Runs `alembic upgrade head`, then uvicorn on port 8000 (internal only) |
| `postgres` | `postgres:15-alpine` | Data store, persisted in the host directory `./pgdata` |

The `frontend` container exiting with code 0 after startup is **normal** — it
only builds static files.

---

## 2. Prerequisites

- Docker Engine 20+ and Docker Compose v2 (`docker compose version`)
- Port **80** free on the host
- Outbound internet access from the backend container to Alibaba Cloud API
  endpoints (`ecs.<region>.aliyuncs.com`, `vpc.<region>.aliyuncs.com`)
- An Alibaba Cloud account with a RAM AccessKey that can call
  `RunInstances`, `DescribeInstances`, `DeleteInstance`, `DescribeVpcs`,
  `DescribeVSwitches`, `DescribeSecurityGroups`

---

## 3. Configuration (.env)

Copy the example file and edit every `change-me` value:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_USER` | yes | PostgreSQL username (used by the `postgres` container) |
| `DB_PASSWORD` | yes | PostgreSQL password |
| `DATABASE_URL` | yes | SQLAlchemy URL used by the backend. Must match `DB_USER`/`DB_PASSWORD`, e.g. `postgresql+psycopg2://<user>:<password>@postgres:5432/ecs_request` |
| `SECRET_KEY` | yes | Long random string for application secrets |
| `ENCRYPTION_KEY` | yes | Key material for **AES-256** encryption of AK/SK and instance passwords at rest (a 32-byte key is derived via SHA-256) |
| `DEFAULT_ADMIN_PASSWORD` | no | Password for the seeded admin on first boot (default `admin123`) |

Generate strong values, for example:

```bash
openssl rand -hex 32   # run twice: once for SECRET_KEY, once for ENCRYPTION_KEY
```

> ⚠️ **Do not change `ENCRYPTION_KEY` after go-live.** Secrets already stored in
> the database (AK/SK, instance passwords) cannot be decrypted with a different
> key. Back up the key together with the database.

---

## 4. First Deployment

```bash
docker compose up -d --build
```

What happens on first boot:

1. `postgres` starts and passes its healthcheck.
2. `frontend` builds the React bundle into the shared volume and exits.
3. `backend` runs `alembic upgrade head` (creates all tables), seeds the single
   admin account **`admin@system.local`**, and starts uvicorn.
4. `nginx` starts serving the SPA and proxying the API.

Verify:

```bash
docker compose ps                      # backend/nginx/postgres Up, frontend Exited (0)
curl http://localhost/api/health       # {"status":"ok"}
```

Then complete the in-app setup:

1. Sign in at `http://<host>/` as `admin@system.local` / `admin123`.
2. **Settings** → enter Access Key ID, Access Key Secret, Region ID → Save.
3. **Settings** → change the admin password (this logs you out; sign in again).
4. **ECS Templates** → create at least one template.
5. **Users** → create user accounts (or batch-upload via Excel).

---

## 5. Operations

### Logs

```bash
docker compose logs -f backend     # API + migration logs
docker compose logs -f nginx
docker compose logs frontend       # build output of the one-shot builder
```

### Restart / rebuild after code changes

```bash
# backend code (dev bind-mount is enabled by default):
docker compose restart backend

# frontend changes require a rebuild of the static bundle:
docker compose build frontend && docker compose up -d

# full rebuild:
docker compose up -d --build
```

### Database backup & restore

```bash
# backup
docker compose exec postgres pg_dump -U "$DB_USER" ecs_request > backup.sql

# restore (into a fresh database)
cat backup.sql | docker compose exec -T postgres psql -U "$DB_USER" ecs_request
```

Also back up the `.env` file — the `ENCRYPTION_KEY` in it is required to read
encrypted secrets in any restored database.

### Full reset (destroys all data)

```bash
docker compose down -v
rm -rf pgdata
docker compose up -d --build
```

### Database migrations

Migrations run automatically on backend startup. To add a new one during
development:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe change"
docker compose restart backend
```

---

## 6. Production Hardening Checklist

- [ ] **Remove the dev bind-mount** in `docker-compose.yml` — delete the line
      `- ./backend:/app` under the `backend` service so the container runs the
      immutable image contents.
- [ ] **Strong secrets** in `.env`; never commit `.env` (it is git-ignored).
- [ ] **Change the default admin password** immediately after first login.
- [ ] **Terminate TLS** in front of nginx (cloud load balancer, or extend
      `nginx/nginx.conf` with a `listen 443 ssl` server block and certificates).
      With HTTPS in place, add `secure=True` to the session cookie in
      `backend/app/middleware/auth.py` (`response.set_cookie`).
- [ ] **Least-privilege RAM user** for the AccessKey (only the ECS/VPC actions
      listed in Prerequisites).
- [ ] **Restrict port exposure**: only nginx publishes a host port; keep it that way.
- [ ] **Schedule database backups** (see above) and store them with the
      `ENCRYPTION_KEY`.

---

## 7. Local Development (without Docker)

Backend (Python 3.11+):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/ecs_request
export ENCRYPTION_KEY=dev-key
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Run the test suite (uses in-memory SQLite; Alibaba Cloud calls are mocked):

```bash
cd backend && pytest tests
```

Frontend (Node 20+), with `/api` proxied to `localhost:8000`:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

---

## 8. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `backend` restarts with DB connection errors | `DATABASE_URL` credentials don't match `DB_USER`/`DB_PASSWORD`, or postgres isn't healthy yet — check `docker compose logs postgres` |
| `permission denied: /app/entrypoint.sh` | The dev bind-mount overrides the image; run `chmod +x backend/entrypoint.sh` on the host |
| Browser shows old UI after a frontend change | Rebuild the frontend image (`docker compose build frontend && docker compose up -d`), then hard-refresh (Ctrl+Shift+R) |
| "Alibaba Cloud credentials are not configured" during approval | Fill in AK/SK and Region ID under **Settings** |
| `Alibaba Cloud API error: ...` on approval | The upstream API rejected the call (quota, zone stock, invalid instance type for the zone, endpoint typo). The failing request stays *pending* — fix and retry |
| All admins logged out unexpectedly | Expected after an admin password change — all admin sessions are invalidated by design |
| Secrets unreadable after restoring a DB backup | The restore was done with a different `ENCRYPTION_KEY`; restore the original key |
