# ECS Resource Request & Approval System — Development Prompt

## Overview

Build a web-based ECS instance request and approval system for Alibaba Cloud. Users submit resource requests based on admin-configured templates; admins approve or reject requests, which triggers actual ECS instance creation via Alibaba Cloud APIs.

The system has two interfaces:
- **User Portal**: Submit and track ECS resource requests.
- **Admin Portal**: Template configuration, approval management, active resource view, audit log, user management, and system settings.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | Python 3.11+ / FastAPI | Async, fast, excellent for API-driven apps; native Alibaba Cloud SDK support |
| Frontend | React 18 + Vite + Tailwind CSS | Component-based UI for complex interactions (cascading selects, modals, expandable rows) |
| Database | PostgreSQL 15 | Relational integrity, JSON support for flexible metadata |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic | Type-safe models, versioned schema migrations |
| Auth | Cookie-based sessions (HttpOnly, Secure) with PBKDF2-SHA256 password hashing | Simple password auth; server-side session store in PostgreSQL |
| Alibaba Cloud SDK | `alibabacloud-ecs20140526`, `alibabacloud-vpc20160428` (Python SDK v2) | Official typed SDKs for ECS, VPC, vSwitch, Security Group APIs |
| Deployment | Docker Compose (3 services: `nginx`, `backend`, `postgres`) | Single-command deploy; mounted volumes for DB persistence |
| Reverse Proxy | Nginx | Serves React static build, proxies `/api/*` to FastAPI |

---

## Project Structure

```
ecs-request-system/
├── docker-compose.yml
├── .env.example                  # DB creds, secret key, default admin password
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/                  # DB migrations
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings (env vars + DB settings table)
│   │   ├── database.py          # SQLAlchemy engine/session
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── template.py
│   │   │   ├── request.py
│   │   │   ├── audit_log.py
│   │   │   └── settings.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route modules
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── templates.py
│   │   │   ├── requests.py
│   │   │   ├── approvals.py
│   │   │   ├── active_resources.py
│   │   │   ├── audit.py
│   │   │   └── settings.py
│   │   ├── services/            # Business logic layer
│   │   │   ├── aliyun_ecs.py    # ECS create/describe/delete
│   │   │   ├── aliyun_vpc.py    # VPC/vSwitch/SG list
│   │   │   ├── approval.py      # Approve/reject orchestration
│   │   │   └── password.py      # Random password generation
│   │   └── middleware/
│   │       └── auth.py          # Session validation middleware
│   └── tests/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── src/
    │   ├── pages/
    │   │   ├── user/            # User portal pages
    │   │   └── admin/           # Admin portal pages
    │   ├── components/          # Shared UI components
    │   └── services/            # API client
    └── ...
```

---

## Data Model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| email | VARCHAR(255) UNIQUE | Login identifier |
| name | VARCHAR(255) | Display name |
| password_hash | VARCHAR(255) | PBKDF2-SHA256 |
| role | ENUM('admin', 'user') | |
| is_active | BOOLEAN | Soft disable |
| created_at | TIMESTAMP | |

### ecs_templates
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR(100) | Template display name |
| instance_type | VARCHAR(50) | e.g., ecs.g7.large |
| image_id | VARCHAR(100) | |
| system_disk_category | VARCHAR(50) | e.g., cloud_essd |
| system_disk_size_gb | INTEGER | |
| public_ip_enabled | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Max 6 templates enforced at application level.

### resource_requests
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| user_id | FK → users.id | |
| template_id | FK → ecs_templates.id | Snapshot template at submission |
| status | ENUM | `pending`, `approved`, `rejected`, `delete_pending`, `deleted` |
| reject_reason | TEXT | Nullable; filled on rejection |
| instance_id | VARCHAR(50) | Alibaba Cloud instance ID after creation |
| instance_name | VARCHAR(100) | `<user.name>_<seq>` (per-user seq starting at 1) |
| public_ip | VARCHAR(50) | |
| private_ip | VARCHAR(50) | |
| password | VARCHAR(255) | Encrypted at rest (AES-256); 16-char random (a-z, A-Z, 0-9) |
| vpc_id | VARCHAR(50) | Filled at approval |
| vswitch_id | VARCHAR(50) | Filled at approval |
| security_group_id | VARCHAR(50) | Filled at approval |
| submitted_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | Approval/rejection time |

### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| action | ENUM('approve', 'reject') | |
| request_id | FK → resource_requests.id | |
| user_email | VARCHAR(255) | Requesting user |
| user_name | VARCHAR(255) | Requesting user display name |
| template_name | VARCHAR(100) | Template used |
| admin_name | VARCHAR(255) | Admin who acted |
| reject_reason | TEXT | Nullable |
| created_at | TIMESTAMP | |

### settings (single-row KV or JSON)
| Key | Notes |
|-----|-------|
| api_endpoint | Alibaba Cloud API endpoint |
| access_key_id | Encrypted at rest |
| access_key_secret | Encrypted at rest (AES-256) |
| region_id | Used for ALL API calls (templates, VPC, ECS creation) |
| admin_password | Hashed; default "admin123" on first boot |

---

## User Portal — Functional Requirements

### Authentication
- Login with email + password.
- On success, server creates a session (random token stored in DB, returned as HttpOnly cookie).
- Session expiry: 24 hours. Invalid/expired session → redirect to login.

### New Resource Request
1. User sees a dropdown of all active ECS templates (name + key specs shown).
2. User selects one template and clicks "Submit Request".
3. System validates: user has fewer than 2 active requests (status = `pending` or `approved`). If at limit, show error: "You have reached the maximum of 2 active requests. Delete an existing request to submit a new one."
4. Request is created with status `pending`. Show "Pending Approval" badge.
5. While pending, no instance details are shown.

### Request Status & Details
- **Pending**: Show template name, submit time, "Pending Approval" badge. No details.
- **Approved**: Show full details:
  - Public Access: `root@<public-ip>`
  - Private Access: `root@<private-ip>`
  - Password: hidden by default, revealed on eye-icon click
- **Rejected**: Show "Rejected" badge + admin's rejection reason.

### Delete Request
1. User clicks "Request Deletion" on an approved resource.
2. Status changes to `delete_pending`. Request still counts toward the 2-active limit and shows as "active" in history.
3. Admin approves deletion → system calls Alibaba Cloud `DeleteInstance` API (ForceStop=true) → status becomes `deleted` → request no longer counts toward limit.
4. Admin rejects deletion → status reverts to `approved`.

### Request History
- Table showing ALL requests ever submitted by the user.
- Columns: Template Name, Submitted At, Status, Active/Inactive tag.
- "Active" = status is `pending`, `approved`, or `delete_pending`.
- "Inactive" = status is `deleted` or `rejected`.

---

## Admin Portal — Functional Requirements

### Authentication
- Single admin account, seeded on first boot: email `admin@system.local`, password `admin123`.
- Admin password changeable via Settings page. Changing password invalidates all existing admin sessions.

### 1. User Management
- List all users (email, name, role, created date).
- **Create User**: Form with Email (unique), Name, Password. Validate email uniqueness.
- **Batch Upload (Excel)**:
  - "Download Template" button → provides `.xlsx` with columns: Email, Name, Password.
  - Upload logic: If email exists → overwrite name and password. If email is new → append.
  - Show this logic as helper text below the upload button.
- **Edit / Disable** user actions.

### 2. ECS Template Management
- List all templates (max 6). Show key specs in a table.
- **Create Template** form fields:
  - Template Name (required)
  - Instance Type (required, e.g., `ecs.g7.large`)
  - Image ID (required)
  - System Disk Category (dropdown: cloud_essd, cloud_ssd, cloud_efficiency)
  - System Disk Size GB (number input)
  - Public IP: Enable / Disable toggle
- **Fixed constants** (not shown in form, applied automatically):
  - Billing Model: Pay-As-You-Go
  - Username: root
  - If Public IP enabled: Pay-By-Traffic, 20 Mbps bandwidth
  - Password: auto-generated 16-char random (a-z, A-Z, 0-9) at ECS creation time
  - Instance Name: `<approved-user-name>_<per-user-sequence>` (sequence starts at 1)
- **Edit** and **Delete** actions per template.
- If 6 templates exist, "Create" button is disabled with tooltip: "Delete a template to create a new one (max 6)."
- Region ID is NOT per-template; it comes from Settings page globally.

### 3. Approval Management
- Table of all `pending` requests: User Name, User Email, Template Name, Submitted At.
- Checkbox selection for batch operations.
- **Single Approve / Batch Approve** flow:
  1. Admin clicks "Approve" (single) or "Batch Approve" (selected).
  2. Modal opens with **cascading step-by-step selection**:
     - Step 1: Region ID — pre-filled from Settings (read-only display).
     - Step 2: VPC — "Fetch VPCs" button enabled; all fields below greyed out. On click → call `DescribeVpcs` API → dropdown showing `VPC Name (vpc-xxxxx)`. Loading spinner during API call.
     - Step 3: vSwitch — "Fetch vSwitches" button enabled after VPC selected. On click → call `DescribeVSwitches` (filtered by VPC) → dropdown showing `vSwitch Name (vsw-xxxxx) - Zone`. Loading spinner.
     - Step 4: Security Group — "Fetch Security Groups" button enabled after vSwitch selected. On click → call `DescribeSecurityGroups` (filtered by VPC) → dropdown showing `SG Name (sg-xxxxx)`. Loading spinner.
     - Step 5: "Confirm Approve" button appears after all selections made.
  3. On confirm → for each request in the batch, call `RunInstances` API with: template specs + selected VPC/vSwitch/SG + generated password + instance name.
  4. **Partial failure handling**: Process requests sequentially. If request N fails, requests 1..N-1 remain approved (ECS created). Request N onward are marked with error. Show result summary: "3 approved successfully, 2 failed" with per-request error messages.
  5. On API success: store instance_id, public_ip, private_ip, password in the request record. Status → `approved`.
- **Single Reject / Batch Reject** flow:
  1. Modal with "Reason for Rejection" textarea (required).
  2. On confirm → status → `rejected`, reason stored. Visible to user.
- **API call UX**: All API calls show a loading spinner with message "Calling Alibaba Cloud API...". On failure, show red error banner with the API error message.

### 4. Active Approved Requests
- Table of all requests with status `approved` (active resources on cloud).
- Columns: User Name, User Email, ECS Template, Instance Name, Credential (expandable).
- **Credential cell**: Collapsed by default, shows "View" button. On click, expands to show:
  - Public Access: `root@<public-ip>`
  - Private Access: `root@<private-ip>`
  - Password: hidden with eye-icon toggle
- This page gives admin a quick overview of all running resources.

### 5. Audit Log
- Table of all approval/rejection actions.
- Columns: Timestamp, Action (Approve/Reject), User Name, User Email, Template Name, Admin, Reject Reason (if applicable).
- Read-only. Sortable by timestamp. Filterable by action type.

### 6. Settings
- Form fields:
  - API Endpoint (text input)
  - Access Key ID (text input, stored encrypted)
  - Access Key Secret (password input, stored encrypted with AES-256)
  - Region ID (text input — used globally for all Alibaba Cloud API calls)
  - Admin Password Change (current password + new password)
- "Save" button. AK/SK are encrypted before storing in DB. Never returned in plaintext via API (mask as `****` in GET responses).

---

## Business Rules Summary

| Rule | Detail |
|------|--------|
| Max active requests per user | 2 (status = pending, approved, or delete_pending) |
| Max templates | 6 |
| Instance name format | `<user.name>_<seq>` where seq is per-user integer starting at 1 |
| Password generation | 16 characters, mix of a-z, A-Z, 0-9; generated at ECS creation time |
| Region source | Settings page only (global, not per-template) |
| Delete approval effect | Terminates ECS instance via API, then marks request as `deleted` |
| Batch approval failure | Partial success allowed; each request processed independently |
| Admin account | Single admin, seeded at first boot with password "admin123" |
| Session handling | Server-side sessions in PostgreSQL, HttpOnly cookie, 24h expiry |

---

## Non-Functional Requirements

- All passwords hashed with PBKDF2-SHA256 (200,000 iterations) before storage.
- AK/SK encrypted at rest using AES-256 (key from environment variable `ENCRYPTION_KEY`).
- All API endpoints require valid session except `POST /api/auth/login`.
- Docker Compose with mounted volume for PostgreSQL data persistence (`./pgdata:/var/lib/postgresql/data`).
- Alembic migrations run automatically on backend container startup.
- Frontend served as static files via Nginx; API proxied at `/api/*`.
- `.env` file for secrets (DB password, encryption key); `.env.example` committed.
- Modular service layer: Alibaba Cloud API calls isolated in `services/aliyun_*.py` for easy troubleshooting.

---

## Deployment (docker-compose.yml)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - frontend_build:/usr/share/nginx/html
    depends_on: [backend]

  backend:
    build: ./backend
    env_file: .env
    volumes:
      - ./backend:/app   # For development; remove in production
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecs_request
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 5
```

---

## UI/UX Direction

- Clean, minimal admin dashboard. Left sidebar navigation for admin portal.
- Table-based list views with status badges (color-coded: yellow=pending, green=approved, red=rejected).
- Modal dialogs for all actions (approve cascade, reject reason, create template, create user).
- Responsive but desktop-first (primary users are on desktop).
- Loading states: spinner + descriptive text for all API calls.
- Error states: red banner with icon and API error message, dismissible.
- Toast notifications for success actions ("Template created", "User added").

---

## Constraints

- No external SaaS dependencies (no Auth0, no SendGrid, etc.).
- All Alibaba Cloud interactions via official Python SDK v2.
- Single admin account (no multi-admin, no RBAC beyond admin/user).
- No email notifications; users check status by logging in.
- Frontend and backend are separate containers; communicate via REST API only.
