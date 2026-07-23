---
kind: configuration_system
name: Environment-driven settings with encrypted runtime configuration
category: configuration_system
scope:
    - '**'
source_files:
    - backend/app/config.py
    - .env.example
    - backend/app/models/settings.py
    - backend/app/services/settings_service.py
    - backend/app/routers/settings.py
    - backend/entrypoint.sh
---

The application uses a two-tier configuration system: process-level settings loaded from environment variables at startup, and persistent key/value settings stored in the database for runtime-tunable values (Alibaba Cloud credentials, region, admin password).

**Process-level settings (startup)**
- `backend/app/config.py` defines a Pydantic `BaseSettings` class (`Settings`) whose fields map directly to environment variables. Defaults are provided so the app boots without any env vars. The inner `Config.env_file = ".env"` makes it load a local `.env` file when present; otherwise only OS environment variables are consumed. A cached `get_settings()` accessor is used everywhere.
- Consumers read these values via `get_settings()`: database URL in `app/database.py`, session TTL in `app/middleware/auth.py`, encryption key in `app/services/crypto.py`, and default admin password during first-boot seeding in `app/main.py`.
- `alembic/env.py` also calls `get_settings().database_url` so migrations use the same connection string as the running app.
- `.env.example` documents all required variables (`DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, `DEFAULT_ADMIN_PASSWORD`).

**Persistent runtime settings (in-database)**
- `app/models/settings.py` defines the `settings` table (`SystemSetting`) with a primary-key `key` column and an encrypted `value` column. Well-known keys (`api_endpoint`, `access_key_id`, `access_key_secret`, `region_id`) are declared as constants; `ENCRYPTED_KEYS` marks which ones must be AES-256 encrypted at rest.
- `app/services/settings_service.py` provides `get_setting` / `set_setting` helpers that transparently encrypt on write and decrypt on read for keys in `ENCRYPTED_KEYS`, plus a convenience `get_aliyun_config(db)` builder that raises if required Aliyun fields are missing.
- `app/routers/settings.py` exposes admin-only REST endpoints (`/api/settings`) to query (with masked secrets) and update these values, and a separate `/api/settings/admin-password` endpoint to rotate the seeded admin password.

**Operational conventions**
- Secrets never leave the process in plaintext: the API response masks AK/SK, and they are stored encrypted using a key derived from `ENCRYPTION_KEY` via SHA-256.
- The entrypoint (`backend/entrypoint.sh`) runs `alembic upgrade head` before starting uvicorn, ensuring schema changes are applied before config consumers run.
- There is no feature-flag or per-environment override mechanism beyond the standard Pydantic Settings precedence (OS env > `.env` file); configuration is not versioned in code.

**Rules developers should follow**
- Add new process-level settings by declaring them on the `Settings` class in `app/config.py`; prefer meaningful defaults and document them in `.env.example`.
- For secrets that must survive restarts and be editable through the UI, add a well-known key constant to `app/models/settings.py`, include it in `ENCRYPTED_KEYS` if sensitive, and access it through `services.settings_service.get_setting` / `set_setting`.
- Never reference `os.environ` directly — always go through `get_settings()` or the settings service.
- When adding a new setting consumer, check both `config.py` (startup-time) and `settings_service.py` (runtime) to pick the right layer.