# ECS Resource Request & Approval System

Web-based ECS instance request and approval system for Alibaba Cloud. Users submit
resource requests based on admin-configured templates; admins approve or reject
requests, which triggers actual ECS instance creation via Alibaba Cloud APIs.

## Documentation

| Guide | Audience | Contents |
|-------|----------|----------|
| [USER_GUIDE.md](USER_GUIDE.md) | End users & admins | Signing in, submitting/tracking requests, approvals, templates, users, settings |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Operators | Architecture, `.env` configuration, first deployment, backups, production hardening, troubleshooting |

## Stack

- **Backend**: Python 3.11 / FastAPI, SQLAlchemy 2.0 + Alembic, Alibaba Cloud SDK v2
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL 15
- **Deploy**: Docker Compose (nginx + backend + postgres; frontend built in a one-shot container)

## Quick Start

```bash
cp .env.example .env        # then edit DB password / SECRET_KEY / ENCRYPTION_KEY
docker compose up -d --build
```

Open http://localhost — log in as the seeded admin:

- **Email**: `admin@system.local`
- **Password**: `admin123` (change it in Settings after first login)

Then, in the admin portal:

1. **Settings** — configure Alibaba Cloud Access Key ID/Secret and Region ID (stored AES-256 encrypted).
2. **ECS Templates** — create up to 6 instance templates.
3. **Users** — create users individually or batch-upload via Excel.

Users log in at the same URL, pick a template and submit a request (max 2 active
per user). Admins approve via the cascading Region → VPC → vSwitch → Security Group
modal, which calls `RunInstances`; deletion approvals call `DeleteInstance` (force).

See the [User Guide](USER_GUIDE.md) for the full walkthrough of both portals, and
the [Deployment Guide](DEPLOYMENT_GUIDE.md) for configuration details, operations
(backups, rebuilds, migrations) and the production hardening checklist.

## Development

Backend tests (Alibaba Cloud APIs are mocked):

```bash
cd backend
pip install -r requirements.txt
pytest tests
```

Frontend dev server (proxies `/api` to `localhost:8000`):

```bash
cd frontend
npm install
npm run dev
```

## Layout

```
├── docker-compose.yml
├── nginx/nginx.conf          # serves React build, proxies /api to FastAPI
├── backend/
│   ├── alembic/              # migrations (run automatically on startup)
│   └── app/
│       ├── models/  schemas/  routers/  middleware/
│       └── services/         # aliyun_ecs, aliyun_vpc, approval, password, crypto
└── frontend/src/
    ├── pages/user/           # user portal
    ├── pages/admin/          # admin portal (sidebar layout)
    └── services/api.js       # REST client
```
