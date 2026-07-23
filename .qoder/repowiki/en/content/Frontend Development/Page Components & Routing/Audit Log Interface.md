# Audit Log Interface

<cite>
**Referenced Files in This Document**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [audit.py](file://backend/app/routers/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [api.js](file://frontend/src/services/api.js)
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
This document describes the audit log administrative interface, focusing on how administrators can view, filter, search, and export audit entries. It explains how timestamps are handled, how user actions are tracked, and how the system supports compliance reporting. Practical examples are included for investigating security incidents, generating compliance reports, and analyzing system activity patterns using the audit interface.

## Project Structure
The audit log feature spans both frontend and backend:
- Frontend: An admin page component that renders the audit UI and communicates with the backend API.
- Backend: A router exposing endpoints to query and export audit logs, a database model defining the schema, and Pydantic schemas for request/response validation.

```mermaid
graph TB
subgraph "Frontend"
FE_Audit["AuditLog.jsx"]
FE_API["api.js"]
end
subgraph "Backend"
BE_Router["routers/audit.py"]
BE_Schema["schemas/audit.py"]
BE_Model["models/audit_log.py"]
end
FE_Audit --> FE_API
FE_API --> BE_Router
BE_Router --> BE_Schema
BE_Router --> BE_Model
```

**Diagram sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)

**Section sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)

## Core Components
- AuditLog (frontend): Renders the audit table, provides filters (e.g., date range, user, action), search input, pagination controls, and an export button. It calls the backend API to fetch data and handles loading/error states.
- Audit Router (backend): Exposes endpoints to list and export audit logs. Accepts query parameters for filtering and pagination, validates inputs via schemas, queries the database, and returns structured responses or CSV exports.
- Audit Model (backend): Defines the persistent fields for each audit entry, including timestamp, actor, action, resource details, and result metadata.
- Audit Schemas (backend): Define request and response structures used by the router for validation and serialization.
- API Client (frontend): Centralized HTTP client functions used by the AuditLog component to call backend endpoints.

Key responsibilities:
- Viewing: Paginated listing of audit entries with sortable columns.
- Filtering: By time window, user identity, action type, and resource identifiers.
- Searching: Free-text search across relevant fields.
- Export: Downloadable CSV export of filtered results.
- Compliance: Timestamps in UTC, immutable records, and consistent field naming to support audits and reporting.

**Section sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [audit.py](file://backend/app/routers/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [api.js](file://frontend/src/services/api.js)

## Architecture Overview
The audit interface follows a standard client-server pattern:
- The AuditLog component requests paginated, filtered results from the backend.
- The backend router validates parameters, queries the database model, and returns JSON or CSV.
- The frontend renders results and allows exporting the current dataset.

```mermaid
sequenceDiagram
participant Admin as "Admin Browser"
participant FE as "AuditLog.jsx"
participant API as "api.js"
participant Router as "routers/audit.py"
participant Schema as "schemas/audit.py"
participant DB as "models/audit_log.py"
Admin->>FE : Open Audit Log page
FE->>API : GET /api/audit?filters...
API->>Router : Forward request
Router->>Schema : Validate query params
Router->>DB : Query logs with filters/pagination
DB-->>Router : Rows
Router-->>API : JSON or CSV
API-->>FE : Response
FE-->>Admin : Render table/export options
```

**Diagram sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)

## Detailed Component Analysis

### AuditLog (Frontend)
Responsibilities:
- State management for filters, search text, pagination, sorting, and export state.
- Rendering a table with columns such as timestamp, actor, action, resource, and outcome.
- Handling user interactions: applying filters, searching, changing pages, toggling sort order, and triggering export.
- Displaying loading indicators and error messages when API calls fail.

User workflows:
- Investigating a security incident: narrow by time window and specific user/action, then review related entries and export the subset.
- Generating compliance reports: select a date range and action types, export to CSV, and attach to report artifacts.
- Analyzing activity patterns: use broad filters and sort by timestamp to observe trends over time.

Timestamp handling:
- Entries are displayed in local time while stored in UTC on the backend; formatting is performed in the UI layer.

Export capability:
- The export button triggers a download of the currently filtered dataset as CSV.

**Section sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)

### Audit Router (Backend)
Responsibilities:
- Endpoint(s) to list audit logs with query parameters for filtering and pagination.
- Optional endpoint or parameter to return CSV export of the filtered set.
- Input validation using Pydantic schemas.
- Database access through the audit model.

Filtering and search:
- Supports filters such as start/end timestamps, actor/user, action type, and resource identifiers.
- Text search across selected fields.

Pagination:
- Returns a page of results with total count metadata to support efficient navigation.

Export:
- Produces a CSV stream containing the same filtered dataset shown in the UI.

**Section sources**
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)

### Audit Model and Schemas (Backend)
Model:
- Stores immutable audit entries with fields for timestamp, actor, action, resource context, and result/status.

Schemas:
- Define request parameters for filtering and pagination.
- Define response shapes for JSON payloads and CSV headers.

Compliance considerations:
- Immutable append-only records.
- Consistent UTC timestamps.
- Clear separation between actor and target resources.

**Section sources**
- [audit_log.py](file://backend/app/models/audit_log.py)
- [audit.py](file://backend/app/schemas/audit.py)

### API Client (Frontend)
Responsibilities:
- Encapsulates HTTP calls to the backend audit endpoints.
- Normalizes errors and maps server responses to UI-friendly structures.

Usage:
- Called by the AuditLog component to fetch lists and trigger exports.

**Section sources**
- [api.js](file://frontend/src/services/api.js)

## Dependency Analysis
The following diagram shows how components depend on each other:

```mermaid
classDiagram
class AuditLog {
+render()
+applyFilters()
+handleSearch()
+handleExport()
}
class ApiClient {
+getAuditLogs(params)
+exportAuditLogs(params)
}
class AuditRouter {
+list_logs()
+export_logs()
}
class AuditSchema {
+ListParams
+ExportParams
}
class AuditModel {
+timestamp
+actor
+action
+resource
+result
}
AuditLog --> ApiClient : "calls"
ApiClient --> AuditRouter : "HTTP"
AuditRouter --> AuditSchema : "validates"
AuditRouter --> AuditModel : "queries"
```

**Diagram sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)

**Section sources**
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)

## Performance Considerations
- Pagination: Always paginate large datasets to avoid heavy payloads and slow rendering.
- Indexes: Ensure database indexes on frequently filtered columns (e.g., timestamp, actor, action).
- Server-side filtering: Prefer server-side filtering and search to reduce client load and improve accuracy.
- Export streaming: Stream CSV exports instead of building large in-memory strings.
- Caching: Consider short-lived caching for read-heavy dashboards if appropriate.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Empty results after filtering: Verify date ranges and filters; ensure timezone alignment between UI and backend.
- Export contains fewer rows than expected: Confirm that export uses the same filters as the current view.
- Slow page loads: Check pagination size and database indexes; consider narrowing filters.
- Authentication/authorization errors: Ensure the admin session has permission to access audit endpoints.

**Section sources**
- [audit.py](file://backend/app/routers/audit.py)
- [audit.py](file://backend/app/schemas/audit.py)
- [audit_log.py](file://backend/app/models/audit_log.py)
- [AuditLog.jsx](file://frontend/src/pages/admin/AuditLog.jsx)
- [api.js](file://frontend/src/services/api.js)

## Conclusion
The audit log administrative interface provides a robust way to investigate events, generate compliance reports, and analyze system activity. With clear filtering, search, and export capabilities, it supports operational and compliance needs while maintaining strong data integrity and performance characteristics.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Example Workflows

- Investigate a security incident
  - Narrow by time window around the incident.
  - Filter by specific actor or action type.
  - Review related entries and export the subset for further analysis.

- Generate a compliance report
  - Select a reporting period and required action categories.
  - Export the filtered dataset to CSV.
  - Attach the export to your compliance documentation.

- Analyze system activity patterns
  - Use broader filters and sort by timestamp.
  - Observe trends over days/weeks to identify spikes or anomalies.

[No sources needed since this section provides conceptual guidance]