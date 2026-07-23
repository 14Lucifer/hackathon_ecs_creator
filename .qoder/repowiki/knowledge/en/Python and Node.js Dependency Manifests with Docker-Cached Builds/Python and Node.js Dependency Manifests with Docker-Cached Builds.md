---
kind: dependency_management
name: Python and Node.js Dependency Manifests with Docker-Cached Builds
category: dependency_management
scope:
    - '**'
source_files:
    - backend/requirements.txt
    - frontend/package.json
    - backend/Dockerfile
    - frontend/Dockerfile
---

This repository manages third-party dependencies for two independent services using their native package managers, with no shared lockfiles or vendoring strategy.

**Backend (Python / FastAPI)**
- Dependencies are declared in `backend/requirements.txt` using exact pinning (`==`) across all packages — FastAPI, SQLAlchemy, Alembic, Pydantic v2, Alibaba Cloud SDKs, cryptography, pytest, httpx, etc.
- No `requirements.lock`, `poetry.lock`, or `Pipfile.lock` is present; versions are pinned inline in the manifest.
- The backend Dockerfile installs via `pip install -r requirements.txt` inside a `python:3.11-slim` image, relying on pip's layer cache to speed rebuilds when only `requirements.txt` changes.
- No private PyPI registry, `--index-url`, or `pip.conf` configuration is used.

**Frontend (React / Vite)**
- Dependencies are declared in `frontend/package.json` under `dependencies` (react, react-dom, react-router-dom) and `devDependencies` (vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer).
- All frontend packages use caret ranges (`^x.y.z`), allowing minor/patch updates within the major version.
- No `package-lock.json` or `yarn.lock` is committed; the frontend Dockerfile runs `npm install` at build time against the public npm registry.
- The build stage produces static assets under `/app/dist`; the compose setup copies these into nginx.

**Cross-cutting conventions**
- Each service owns its own dependency file; there is no monorepo-level tool (pnpm workspaces, Poetry workspace, uv, etc.).
- Python pins every transitive dependency explicitly; JavaScript uses semver ranges, so reproducible builds depend on the CI/build environment rather than a committed lockfile.
- There is no vendoring directory, no private registry configuration, and no automated update bot (Dependabot, Renovate) visible in the repo.