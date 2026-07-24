# User Guide

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [USER_GUIDE.md](file://USER_GUIDE.md)
- [docker-compose.yml](file://docker-compose.yml)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/alembic.ini](file://backend/alembic.ini)
- [backend/entrypoint.sh](file://backend/entrypoint.sh)
- [backend/requirements.txt](file://backend/requirements.txt)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/users.py](file://backend/app/routers/users.py)
- [backend/app/routers/templates.py](file://backend/app/routers/templates.py)
- [backend/app/routers/settings.py](file://backend/app/routers/settings.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py)
- [backend/app/routers/audit.py](file://backend/app/routers/audit.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/services/approval.py](file://backend/app/services/approval.py)
- [backend/app/services/crypto.py](file://backend/app/services/crypto.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/services/settings_service.py](file://backend/app/services/settings_service.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/template.py](file://backend/app/models/template.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/models/settings.py](file://backend/app/models/settings.py)
- [backend/app/models/audit_log.py](file://backend/app/models/audit_log.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/template.py](file://backend/app/schemas/template.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)
- [backend/app/schemas/audit.py](file://backend/app/schemas/audit.py)
- [backend/app/schemas/settings.py](file://backend/app/schemas/settings.py)
- [frontend/src/App.jsx](file://frontend/src/App.jsx)
- [frontend/src/main.jsx](file://frontend/src/main.jsx)
- [frontend/src/pages/Login.jsx](file://frontend/src/pages/Login.jsx)
- [frontend/src/pages/admin/AdminLayout.jsx](file://frontend/src/pages/admin/AdminLayout.jsx)
- [frontend/src/pages/admin/Users.jsx](file://frontend/src/pages/admin/Users.jsx)
- [frontend/src/pages/admin/Templates.jsx](file://frontend/src/pages/admin/Templates.jsx)
- [frontend/src/pages/admin/Settings.jsx](file://frontend/src/pages/admin/Settings.jsx)
- [frontend/src/pages/admin/Approvals.jsx](file://frontend/src/pages/admin/Approvals.jsx)
- [frontend/src/pages/admin/ActiveResources.jsx](file://frontend/src/pages/admin/ActiveResources.jsx)
- [frontend/src/pages/admin/AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)
- [nginx/nginx.conf](file://nginx/nginx.conf)
</cite>

## Update Summary
**Changes Made**
- Enhanced administrative capabilities for resource removal operations
- Added DNS management operations functionality
- Updated Active Resources section with new removal capabilities
- Expanded DNS service integration documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This User Guide explains how to install, configure, and operate the ECS Request System. It covers both end-user workflows (requesting resources) and administrative tasks (approvals, user management, templates, settings, audit logs). The system provides a web-based portal for users to request cloud resources and an admin console for managing approvals and configurations.

The project is composed of:
- A FastAPI backend with database migrations, authentication middleware, and integrations with Alibaba Cloud services (ECS, VPC, DNS).
- A React frontend served via Nginx.
- Docker Compose configuration for local development and deployment.

For high-level background and quick start instructions, see the repository README and the existing USER_GUIDE file.

**Section sources**
- [README.md](file://README.md)
- [USER_GUIDE.md](file://USER_GUIDE.md)

## Project Structure
At a high level:
- Backend: Python FastAPI application with routers, models, schemas, services, and Alembic migrations.
- Frontend: React application with pages for login, user portal, and admin features.
- Infrastructure: Nginx reverse proxy and Docker Compose orchestration.

```mermaid
graph TB
subgraph "Frontend"
FE_App["App.jsx"]
FE_Login["Login.jsx"]
FE_User["UserPortal.jsx"]
FE_Admin["AdminLayout.jsx"]
FE_API["services/api.js"]
end
subgraph "Backend"
BE_Main["main.py"]
BE_MW["middleware/auth.py"]
BE_R_Auth["routers/auth.py"]
BE_R_Users["routers/users.py"]
BE_R_Tpl["routers/templates.py"]
BE_R_Set["routers/settings.py"]
BE_R_Req["routers/requests.py"]
BE_R_App["routers/approvals.py"]
BE_R_Res["routers/active_resources.py"]
BE_R_Aud["routers/audit.py"]
BE_Svc_ECS["services/aliyun_ecs.py"]
BE_Svc_VPC["services/aliyun_vpc.py"]
BE_Svc_DNS["services/aliyun_dns.py"]
BE_DB["database.py"]
BE_Cfg["config.py"]
end
subgraph "Infra"
NGINX["nginx.conf"]
DC["docker-compose.yml"]
end
FE_App --> FE_Login
FE_App --> FE_User
FE_App --> FE_Admin
FE_Login --> FE_API
FE_User --> FE_API
FE_Admin --> FE_API
FE_API --> BE_Main
BE_Main --> BE_MW
BE_Main --> BE_R_Auth
BE_Main --> BE_R_Users
BE_Main --> BE_R_Tpl
BE_Main --> BE_R_Set
BE_Main --> BE_R_Req
BE_Main --> BE_R_App
BE_Main --> BE_R_Res
BE_Main --> BE_R_Aud
BE_R_Req --> BE_Svc_ECS
BE_R_Req --> BE_Svc_VPC
BE_R_Req --> BE_Svc_DNS
BE_Main --> BE_DB
BE_Main --> BE_Cfg
FE_App -.-> NGINX
DC --> BE_Main
DC --> NGINX
```

**Diagram sources**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/users.py](file://backend/app/routers/users.py)
- [backend/app/routers/templates.py](file://backend/app/routers/templates.py)
- [backend/app/routers/settings.py](file://backend/app/routers/settings.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py)
- [backend/app/routers/audit.py](file://backend/app/routers/audit.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/config.py](file://backend/app/config.py)
- [frontend/src/App.jsx](file://frontend/src/App.jsx)
- [frontend/src/pages/Login.jsx](file://frontend/src/pages/Login.jsx)
- [frontend/src/pages/user/UserPortal.jsx](file://frontend/src/pages/user/UserPortal.jsx)
- [frontend/src/pages/admin/AdminLayout.jsx](file://frontend/src/pages/admin/AdminLayout.jsx)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)
- [nginx/nginx.conf](file://nginx/nginx.conf)
- [docker-compose.yml](file://docker-compose.yml)

**Section sources**
- [docker-compose.yml](file://docker-compose.yml)
- [backend/app/main.py](file://backend/app/main.py)
- [frontend/src/App.jsx](file://frontend/src/App.jsx)
- [nginx/nginx.conf](file://nginx/nginx.conf)

## Core Components
- Authentication and Authorization
  - Login flow and session handling are implemented in the auth router and middleware.
  - Schemas define request/response structures for authentication endpoints.
- Resource Requests and Approvals
  - Users submit requests; admins review and approve or reject them.
  - Services integrate with Alibaba Cloud ECS/VPC/DNS to provision resources upon approval.
- Admin Features
  - Manage users, templates, settings, active resources, and view audit logs.
  - **Enhanced**: Administrative capabilities for resource removal and DNS management operations.
- Data Layer
  - Database connection and models represent core entities such as users, templates, requests, sessions, settings, and audit logs.
  - Alembic manages schema migrations.

Key implementation references:
- Auth router and middleware: [backend/app/routers/auth.py](file://backend/app/routers/auth.py), [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- Request and approval flows: [backend/app/routers/requests.py](file://backend/app/routers/requests.py), [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- Cloud integrations: [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py), [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py), [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- Models and schemas: [backend/app/models/](file://backend/app/models/), [backend/app/schemas/](file://backend/app/schemas/)
- Database and config: [backend/app/database.py](file://backend/app/database.py), [backend/app/config.py](file://backend/app/config.py)

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/template.py](file://backend/app/models/template.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/models/settings.py](file://backend/app/models/settings.py)
- [backend/app/models/audit_log.py](file://backend/app/models/audit_log.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/template.py](file://backend/app/schemas/template.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)
- [backend/app/schemas/audit.py](file://backend/app/schemas/audit.py)
- [backend/app/schemas/settings.py](file://backend/app/schemas/settings.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/config.py](file://backend/app/config.py)

## Architecture Overview
The system follows a standard web architecture:
- Browser interacts with the React frontend.
- Nginx serves static assets and proxies API calls to the backend.
- Backend exposes REST endpoints grouped by feature (auth, users, templates, settings, requests, approvals, active resources, audit).
- Services call external cloud APIs to provision and manage resources.
- Database stores persistent state; Alembic handles migrations.

```mermaid
sequenceDiagram
participant U as "User Browser"
participant FE as "React App"
participant API as "FastAPI Backend"
participant DB as "Database"
participant CLOUD as "Alibaba Cloud"
U->>FE : Open portal
FE->>API : POST /auth/login
API->>DB : Validate credentials
DB-->>API : User record
API-->>FE : Session token
FE->>API : GET /requests (user)
API->>DB : Fetch pending/approved requests
DB-->>API : Requests list
API-->>FE : Requests data
FE->>API : POST /requests (submit new)
API->>DB : Create request
API-->>FE : Created request
FE->>API : GET /approvals (admin)
API->>DB : Fetch pending approvals
DB-->>API : Pending requests
API-->>FE : Approvals list
FE->>API : PUT /approvals/{id} (approve/reject)
API->>CLOUD : Provision ECS/VPC/DNS (if approved)
CLOUD-->>API : Provision result
API->>DB : Update request status
API-->>FE : Approval result
Note over FE,API : Enhanced Admin Operations
FE->>API : DELETE /resources/{id} (remove resource)
API->>CLOUD : Remove ECS instance and DNS records
CLOUD-->>API : Removal confirmation
API->>DB : Update resource status
API-->>FE : Removal result
```

**Diagram sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/database.py](file://backend/app/database.py)

## Detailed Component Analysis

### Authentication Flow
- Users log in via the login page.
- The backend validates credentials, creates a session, and returns a token.
- Middleware enforces authentication on protected routes.

```mermaid
sequenceDiagram
participant FE as "Login Page"
participant API as "Auth Router"
participant MW as "Auth Middleware"
participant DB as "Database"
FE->>API : POST /auth/login {username, password}
API->>DB : Lookup user and verify password
DB-->>API : User + hashed password
API->>API : Generate session/token
API-->>FE : {token, user info}
Note over FE,MW : Subsequent requests include token
FE->>API : Protected endpoint
API->>MW : Verify token
MW-->>API : Access granted/denied
```

**Diagram sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)

### Resource Request and Approval Workflow
- Users submit resource requests through the user portal.
- Admins review pending requests and approve or reject them.
- Upon approval, backend services provision resources with Alibaba Cloud.

```mermaid
flowchart TD
Start(["Submit Request"]) --> Validate["Validate inputs"]
Validate --> Save["Persist request"]
Save --> Pending{"Pending?"}
Pending --> |Yes| AdminReview["Admin reviews"]
AdminReview --> Decision{"Approve or Reject?"}
Decision --> |Reject| EndReject["Mark rejected"]
Decision --> |Approve| Provision["Provision ECS/VPC/DNS"]
Provision --> UpdateStatus["Update request status"]
UpdateStatus --> EndSuccess(["Request fulfilled"])
EndReject --> End(["End"])
```

**Diagram sources**
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)

**Section sources**
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)

### Enhanced Administrative Capabilities

#### Resource Removal Operations
Administrators can now remove active resources directly from the Active Resources interface. This capability includes:
- Safe removal of ECS instances with proper cleanup procedures
- Automatic DNS record deletion when removing resources
- Audit logging of all removal operations
- Confirmation dialogs to prevent accidental deletions

#### DNS Management Operations
The system now provides comprehensive DNS management capabilities:
- View and manage DNS records associated with resources
- Add, modify, and delete DNS entries
- Integration with Alibaba Cloud DNS service
- Automatic DNS cleanup during resource removal

```mermaid
flowchart TD
AdminAccess["Admin Accesses Active Resources"] --> ViewResources["View Active Resources"]
ViewResources --> SelectResource["Select Resource to Remove"]
SelectResource --> ConfirmRemoval["Confirm Removal Action"]
ConfirmRemoval --> RemoveECS["Remove ECS Instance"]
RemoveECS --> CleanupDNS["Clean Up DNS Records"]
CleanupDNS --> UpdateAudit["Update Audit Log"]
UpdateAudit --> NotifyCompletion["Notify Completion"]
```

**Diagram sources**
- [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/models/audit_log.py](file://backend/app/models/audit_log.py)

**Updated** Enhanced administrative capabilities now include resource removal and DNS management operations for better control over cloud infrastructure.

**Section sources**
- [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/models/audit_log.py](file://backend/app/models/audit_log.py)

### Admin Features
- Users Management: Create, update, and manage user accounts.
- Templates: Define reusable resource configurations.
- Settings: Configure system-wide options.
- Active Resources: View currently provisioned resources.
- **Enhanced**: Remove active resources with automatic DNS cleanup.
- **Enhanced**: Manage DNS records independently.
- Audit Log: Track actions and changes.

References:
- Routers: [backend/app/routers/users.py](file://backend/app/routers/users.py), [backend/app/routers/templates.py](file://backend/app/routers/templates.py), [backend/app/routers/settings.py](file://backend/app/routers/settings.py), [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py), [backend/app/routers/audit.py](file://backend/app/routers/audit.py)
- Frontend pages: [frontend/src/pages/admin/Users.jsx](file://frontend/src/pages/admin/Users.jsx), [frontend/src/pages/admin/Templates.jsx](file://frontend/src/pages/admin/Templates.jsx), [frontend/src/pages/admin/Settings.jsx](file://frontend/src/pages/admin/Settings.jsx), [frontend/src/pages/admin/ActiveResources.jsx](file://frontend/src/pages/admin/ActiveResources.jsx), [frontend/src/pages/admin/AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)

**Section sources**
- [backend/app/routers/users.py](file://backend/app/routers/users.py)
- [backend/app/routers/templates.py](file://backend/app/routers/templates.py)
- [backend/app/routers/settings.py](file://backend/app/routers/settings.py)
- [backend/app/routers/active_resources.py](file://backend/app/routers/active_resources.py)
- [backend/app/routers/audit.py](file://backend/app/routers/audit.py)
- [frontend/src/pages/admin/Users.jsx](file://frontend/src/pages/admin/Users.jsx)
- [frontend/src/pages/admin/Templates.jsx](file://frontend/src/pages/admin/Templates.jsx)
- [frontend/src/pages/admin/Settings.jsx](file://frontend/src/pages/admin/Settings.jsx)
- [frontend/src/pages/admin/ActiveResources.jsx](file://frontend/src/pages/admin/ActiveResources.jsx)
- [frontend/src/pages/admin/AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)

### Data Models and Schemas
Core entities include:
- User: Identity and roles.
- Template: Reusable resource definitions.
- Request: User-submitted resource requests.
- Session: Authentication sessions.
- Settings: System configuration.
- Audit Log: Action history.

Schemas define validation rules for API payloads.

References:
- Models: [backend/app/models/user.py](file://backend/app/models/user.py), [backend/app/models/template.py](file://backend/app/models/template.py), [backend/app/models/request.py](file://backend/app/models/request.py), [backend/app/models/session.py](file://backend/app/models/session.py), [backend/app/models/settings.py](file://backend/app/models/settings.py), [backend/app/models/audit_log.py](file://backend/app/models/audit_log.py)
- Schemas: [backend/app/schemas/user.py](file://backend/app/schemas/user.py), [backend/app/schemas/template.py](file://backend/app/schemas/template.py), [backend/app/schemas/request.py](file://backend/app/schemas/request.py), [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py), [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py), [backend/app/schemas/audit.py](file://backend/app/schemas/audit.py), [backend/app/schemas/settings.py](file://backend/app/schemas/settings.py)

**Section sources**
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/template.py](file://backend/app/models/template.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/models/settings.py](file://backend/app/models/settings.py)
- [backend/app/models/audit_log.py](file://backend/app/models/audit_log.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/template.py](file://backend/app/schemas/template.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)
- [backend/app/schemas/audit.py](file://backend/app/schemas/audit.py)
- [backend/app/schemas/settings.py](file://backend/app/schemas/settings.py)

### Configuration and Deployment
- Application configuration is loaded from environment variables and config modules.
- Database connections and migrations are managed via Alembic.
- Entrypoint scripts initialize the backend container.
- Docker Compose orchestrates services including backend, database, and Nginx.

References:
- Config: [backend/app/config.py](file://backend/app/config.py)
- Database: [backend/app/database.py](file://backend/app/database.py)
- Migrations: [backend/alembic.ini](file://backend/alembic.ini)
- Entrypoint: [backend/entrypoint.sh](file://backend/entrypoint.sh)
- Dependencies: [backend/requirements.txt](file://backend/requirements.txt)
- Orchestration: [docker-compose.yml](file://docker-compose.yml)
- Reverse Proxy: [nginx/nginx.conf](file://nginx/nginx.conf)

**Section sources**
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/alembic.ini](file://backend/alembic.ini)
- [backend/entrypoint.sh](file://backend/entrypoint.sh)
- [backend/requirements.txt](file://backend/requirements.txt)
- [docker-compose.yml](file://docker-compose.yml)
- [nginx/nginx.conf](file://nginx/nginx.conf)

## Dependency Analysis
High-level dependencies:
- Frontend depends on backend API endpoints.
- Backend depends on:
  - Database for persistence.
  - Alibaba Cloud SDKs for ECS, VPC, and DNS operations.
  - Authentication middleware for access control.
  - Alembic for schema migrations.

```mermaid
graph LR
FE["Frontend (React)"] --> API["Backend (FastAPI)"]
API --> DB["Database"]
API --> ECS["Aliyun ECS Service"]
API --> VPC["Aliyun VPC Service"]
API --> DNS["Aliyun DNS Service"]
API --> AUTH["Auth Middleware"]
API --> MIGR["Alembic Migrations"]
```

**Diagram sources**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/alembic.ini](file://backend/alembic.ini)

**Section sources**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/aliyun_dns.py](file://backend/app/services/aliyun_dns.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/alembic.ini](file://backend/alembic.ini)

## Performance Considerations
- Use pagination and filtering on list endpoints to reduce payload sizes.
- Cache frequently accessed read-only data where appropriate.
- Avoid blocking I/O in request handlers; offload long-running provisioning tasks to background jobs if needed.
- Ensure database indexes exist on commonly queried fields (e.g., request status, user roles).
- Tune connection pooling for database and external API clients.
- **Enhanced**: Implement proper error handling for resource removal operations to prevent partial cleanup failures.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and checks:
- Authentication failures
  - Verify credentials and session token handling.
  - Check middleware configuration and secret keys.
- Database connectivity
  - Confirm database URL and credentials in configuration.
  - Run migrations if schema mismatch occurs.
- Cloud service integration
  - Validate API keys and region settings for Alibaba Cloud services.
  - Inspect error responses from ECS/VPC/DNS calls.
- **Enhanced**: Resource removal issues
  - Check DNS record cleanup status after resource removal.
  - Verify audit logs for removal operation details.
  - Ensure proper permissions for DNS management operations.
- Frontend connectivity
  - Ensure Nginx proxies correctly to the backend.
  - Check CORS and base URL settings.

Operational references:
- Entrypoint and startup: [backend/entrypoint.sh](file://backend/entrypoint.sh)
- Configuration: [backend/app/config.py](file://backend/app/config.py)
- Database setup: [backend/app/database.py](file://backend/app/database.py)
- Migrations: [backend/alembic.ini](file://backend/alembic.ini)
- Reverse proxy: [nginx/nginx.conf](file://nginx/nginx.conf)

**Section sources**
- [backend/entrypoint.sh](file://backend/entrypoint.sh)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/alembic.ini](file://backend/alembic.ini)
- [nginx/nginx.conf](file://nginx/nginx.conf)

## Conclusion
This guide outlined the system's architecture, key components, and operational workflows. By following the sections above, users can request resources efficiently, while administrators can manage approvals, users, templates, settings, and audit logs. The enhanced administrative capabilities now provide comprehensive resource removal and DNS management operations for complete infrastructure control. For deeper technical details, refer to the linked source files.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Quick Start Checklist
- Install Docker and Docker Compose.
- Configure environment variables for database and cloud services.
- Build and run services using Docker Compose.
- Apply database migrations.
- Access the frontend via Nginx and log in with an admin account.
- **Enhanced**: Test resource removal and DNS management operations in the admin panel.

References:
- Orchestration: [docker-compose.yml](file://docker-compose.yml)
- Entrypoint: [backend/entrypoint.sh](file://backend/entrypoint.sh)
- Migrations: [backend/alembic.ini](file://backend/alembic.ini)

**Section sources**
- [docker-compose.yml](file://docker-compose.yml)
- [backend/entrypoint.sh](file://backend/entrypoint.sh)
- [backend/alembic.ini](file://backend/alembic.ini)