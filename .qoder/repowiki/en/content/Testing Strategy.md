# Testing Strategy

<cite>
**Referenced Files in This Document**
- [backend/tests/conftest.py](file://backend/tests/conftest.py)
- [backend/tests/test_system.py](file://backend/tests/test_system.py)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/approval.py](file://backend/app/services/approval.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)
- [frontend/src/components/ui.jsx](file://frontend/src/components/ui.jsx)
- [frontend/src/pages/Login.jsx](file://frontend/src/pages/Login.jsx)
- [frontend/src/pages/admin/Approvals.jsx](file://frontend/src/pages/admin/Approvals.jsx)
- [frontend/src/pages/user/UserPortal.jsx](file://frontend/src/pages/user/UserPortal.jsx)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)
- [frontend/package.json](file://frontend/package.json)
- [docker-compose.yml](file://docker-compose.yml)
</cite>

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
This document defines the testing strategy for the ECS Creator platform, covering unit tests, integration tests, and end-to-end (E2E) approaches. It explains how to set up tests using pytest fixtures, mock external dependencies such as Alibaba Cloud APIs, and write effective tests for API endpoints, business logic services, and database operations. It also provides guidance for frontend testing of React components and user workflows, with examples for critical scenarios like authentication flows, resource provisioning, and approval workflows. Finally, it outlines continuous integration setup and automated testing pipelines.

## Project Structure
The repository is organized into backend and frontend layers:
- Backend: FastAPI application with routers, services, models, schemas, and a dedicated tests directory.
- Frontend: React application with pages, components, and an API service layer.
- Infrastructure: Docker Compose configuration for orchestrating services during development and testing.

```mermaid
graph TB
subgraph "Backend"
A["app/main.py"]
B["app/routers/*"]
C["app/services/*"]
D["app/models/*"]
E["app/schemas/*"]
F["tests/"]
end
subgraph "Frontend"
G["src/pages/*"]
H["src/components/*"]
I["src/services/api.js"]
end
subgraph "Infra"
J["docker-compose.yml"]
end
A --> B
B --> C
B --> D
B --> E
F --> A
F --> B
F --> C
F --> D
F --> E
G --> I
H --> I
J --> A
J --> G
```

[No sources needed since this diagram shows conceptual structure]

## Core Components
This section highlights key backend components relevant to testing:
- Application entrypoint and dependency injection patterns used by routers.
- Database initialization and session management.
- Services that interact with Alibaba Cloud APIs (ECS/VPC).
- Routers handling authentication, requests, and approvals.
- Schemas and models defining request/response contracts and persistence.

Testing focus areas:
- Unit tests for services and utilities.
- Integration tests for routers against a test database and mocked cloud providers.
- E2E tests validating full user journeys across frontend and backend.

**Section sources**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)

## Architecture Overview
The testing architecture spans three layers:
- Unit tests: Validate isolated functions and classes without network or DB calls.
- Integration tests: Exercise routers and services with a real test database and mocked external APIs.
- E2E tests: Run the full stack via Docker Compose and validate user workflows from the UI through the API to the database.

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant PyTest as "pytest"
participant App as "FastAPI app"
participant DB as "Test DB"
participant MockCloud as "Mocked Alibaba Cloud"
participant FE as "React UI"
Dev->>PyTest : "Run tests"
PyTest->>App : "Start test server"
PyTest->>DB : "Create test schema"
PyTest->>MockCloud : "Patch SDK calls"
PyTest->>App : "Send HTTP requests"
App-->>PyTest : "JSON responses"
PyTest->>FE : "Optional : run browser tests"
FE-->>PyTest : "UI assertions"
PyTest-->>Dev : "Test results"
```

[No sources needed since this diagram shows conceptual workflow]

## Detailed Component Analysis

### Test Setup and Fixtures
- Use pytest fixtures to configure a test database connection, seed data, and client instances.
- Provide a FastAPI test client fixture to exercise routers without starting a production server.
- Centralize environment overrides for secrets and flags to ensure deterministic behavior.

Guidelines:
- Keep fixtures small and composable; prefer overriding specific dependencies rather than recreating entire contexts.
- Use autouse fixtures sparingly; explicitly request fixtures per test case for clarity.
- Ensure fixtures reset state between tests to avoid cross-test pollution.

**Section sources**
- [backend/tests/conftest.py](file://backend/tests/conftest.py)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)

### Mocking External Dependencies (Alibaba Cloud APIs)
Strategy:
- Patch Alibaba Cloud SDK clients or wrapper methods at import boundaries to return deterministic responses.
- For ECS and VPC services, provide fixtures that replace service instances with test doubles.
- Assert that services call the correct methods with expected parameters.

Best practices:
- Mock only the boundary where external calls occur (e.g., service layer), not internal logic.
- Use parameterized tests to cover success and failure paths (network errors, rate limits, invalid inputs).
- Record representative payloads to validate serialization/deserialization.

**Section sources**
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)

### API Endpoint Tests
Scope:
- Authentication endpoints: login, token refresh, logout.
- Request lifecycle endpoints: create, list, get, update, cancel.
- Approval endpoints: submit, approve, reject, list pending.

Approach:
- Use the test client to send HTTP requests and assert status codes, headers, and JSON bodies.
- Validate schema enforcement by sending malformed payloads and expecting validation errors.
- Verify authorization checks by invoking endpoints with different roles or missing tokens.

Examples:
- Authentication flow: login with valid credentials returns a session/token; invalid credentials return 401.
- Resource provisioning: creating a request triggers service calls; on success, returns created resource ID.
- Approval workflow: submitting an approval transitions state; approving changes status and triggers provisioning.

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)

### Business Logic Service Tests
Focus:
- Approval service: state transitions, permissions, audit logging.
- Crypto/password utilities: hashing, verification, rotation.
- Settings service: loading defaults, applying overrides.

Approach:
- Instantiate services directly with injected dependencies (e.g., DB sessions, settings).
- Assert side effects such as DB writes, logs, or events.
- Cover edge cases: concurrent approvals, invalid states, missing resources.

**Section sources**
- [backend/app/services/approval.py](file://backend/app/services/approval.py)
- [backend/app/services/crypto.py](file://backend/app/services/crypto.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/services/settings_service.py](file://backend/app/services/settings_service.py)

### Database Operation Tests
Focus:
- CRUD operations for users, requests, sessions, templates, audit logs.
- Migration execution and rollback safety.
- Query correctness and constraints.

Approach:
- Use a test database instance initialized before each test suite.
- Seed minimal data via fixtures; assert counts and fields after operations.
- Validate Alembic migrations by running them against the test DB.

**Section sources**
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)

### Frontend Testing Approaches
Scope:
- Unit tests for React components and hooks.
- Integration tests for page-level interactions.
- User workflow tests simulating login, request submission, and approval actions.

Tools and strategies:
- Use a React testing library to render components and simulate events.
- Mock the API service layer to isolate UI behavior from backend responses.
- For E2E, consider headless browser automation to navigate pages and assert UI states.

Examples:
- Login page: submit form with valid credentials; assert redirect and presence of user-specific elements.
- Approvals page: load pending items; click approve; verify toast and updated list.
- User portal: create a new request; confirm success message and navigation.

**Section sources**
- [frontend/src/pages/Login.jsx](file://frontend/src/pages/Login.jsx)
- [frontend/src/pages/admin/Approvals.jsx](file://frontend/src/pages/admin/Approvals.jsx)
- [frontend/src/pages/user/UserPortal.jsx](file://frontend/src/pages/user/UserPortal.jsx)
- [frontend/src/components/ui.jsx](file://frontend/src/components/ui.jsx)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)
- [frontend/package.json](file://frontend/package.json)

### Critical User Scenarios: Example Test Cases
Authentication Flow
- Given valid credentials, when user logs in, then session/token is returned and protected routes become accessible.
- Given invalid credentials, when user attempts login, then error response is returned and no session is created.

Resource Provisioning
- Given a valid request payload, when user submits a provisioning request, then request is persisted and service calls are initiated.
- Given insufficient permissions, when user submits a request, then access denied response is returned.

Approval Workflow
- Given a pending request, when admin approves, then request status updates and provisioning proceeds.
- Given a pending request, when admin rejects, then request status updates and no provisioning occurs.

```mermaid
flowchart TD
Start(["User Action"]) --> Auth["Authenticate User"]
Auth --> ValidAuth{"Valid Credentials?"}
ValidAuth --> |No| Error["Return Unauthorized"]
ValidAuth --> |Yes| Submit["Submit Request"]
Submit --> Validate["Validate Payload"]
Validate --> ValidPayload{"Valid?"}
ValidPayload --> |No| ValidationError["Return Validation Errors"]
ValidPayload --> |Yes| Persist["Persist Request"]
Persist --> Provision["Trigger Provisioning Service"]
Provision --> Pending["Await Approval"]
Pending --> AdminAction{"Admin Approves?"}
AdminAction --> |Yes| Approve["Update Status and Proceed"]
AdminAction --> |No| Reject["Reject and Notify"]
Approve --> End(["Complete"])
Reject --> End
Error --> End
ValidationError --> End
```

[No sources needed since this diagram shows conceptual workflow]

## Dependency Analysis
The following diagram maps core testing dependencies and their relationships:

```mermaid
graph LR
Conftest["tests/conftest.py"] --> Main["app/main.py"]
Conftest --> Config["app/config.py"]
Conftest --> Database["app/database.py"]
RouterAuth["routers/auth.py"] --> SchemaAuth["schemas/auth.py"]
RouterRequests["routers/requests.py"] --> SchemaRequest["schemas/request.py"]
RouterApprovals["routers/approvals.py"] --> SchemaApproval["schemas/approval.py"]
RouterAuth --> ModelUser["models/user.py"]
RouterRequests --> ModelRequest["models/request.py"]
RouterApprovals --> ModelSession["models/session.py"]
RouterRequests --> ServiceAliyunECS["services/aliyun_ecs.py"]
RouterRequests --> ServiceAliyunVPC["services/aliyun_vpc.py"]
RouterApprovals --> ServiceApproval["services/approval.py"]
FE_API["frontend/src/services/api.js"] --> RouterAuth
FE_API --> RouterRequests
FE_API --> RouterApprovals
```

**Diagram sources**
- [backend/tests/conftest.py](file://backend/tests/conftest.py)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/approval.py](file://backend/app/services/approval.py)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)

**Section sources**
- [backend/tests/conftest.py](file://backend/tests/conftest.py)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/routers/requests.py](file://backend/app/routers/requests.py)
- [backend/app/routers/approvals.py](file://backend/app/routers/approvals.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/schemas/request.py](file://backend/app/schemas/request.py)
- [backend/app/schemas/approval.py](file://backend/app/schemas/approval.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/models/request.py](file://backend/app/models/request.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [backend/app/services/aliyun_ecs.py](file://backend/app/services/aliyun_ecs.py)
- [backend/app/services/aliyun_vpc.py](file://backend/app/services/aliyun_vpc.py)
- [backend/app/services/approval.py](file://backend/app/services/approval.py)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)

## Performance Considerations
- Prefer in-memory databases for unit and integration tests to reduce I/O overhead.
- Use lightweight mocks for external APIs to avoid network latency and flakiness.
- Parallelize independent tests where possible; isolate shared state to avoid contention.
- Limit seed data size; generate only what is necessary for each test scenario.
- Profile slow tests and refactor heavy operations into reusable fixtures.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Flaky network calls: Ensure all Alibaba Cloud SDK calls are patched; verify patch targets match actual imports.
- Database state leakage: Confirm fixtures reset or recreate tables between tests; use transactions or drop/recreate schemas.
- Authentication failures in tests: Validate test client includes proper headers/tokens; check session model expectations.
- Frontend API mismatches: Align frontend service endpoints with router definitions; mock responses consistently.

**Section sources**
- [backend/tests/test_system.py](file://backend/tests/test_system.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/models/session.py](file://backend/app/models/session.py)
- [frontend/src/services/api.js](file://frontend/src/services/api.js)

## Conclusion
A robust testing strategy for the ECS Creator platform combines unit, integration, and E2E tests with careful mocking of external dependencies. By structuring pytest fixtures effectively, isolating services, and validating both API contracts and UI workflows, the team can maintain high confidence in authentication, resource provisioning, and approval processes. Continuous integration should execute these tests automatically on every change to catch regressions early.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Continuous Integration and Automated Pipelines
- Define CI jobs to:
  - Install backend and frontend dependencies.
  - Run pytest suites with coverage reporting.
  - Build and lint frontend code.
  - Execute E2E tests against a composed stack.
- Use Docker Compose to spin up backend, database, and optional services for integration/E2E runs.
- Cache dependencies to speed up builds; store artifacts and reports for review.

**Section sources**
- [docker-compose.yml](file://docker-compose.yml)
- [backend/tests/conftest.py](file://backend/tests/conftest.py)
- [backend/tests/test_system.py](file://backend/tests/test_system.py)
- [frontend/package.json](file://frontend/package.json)