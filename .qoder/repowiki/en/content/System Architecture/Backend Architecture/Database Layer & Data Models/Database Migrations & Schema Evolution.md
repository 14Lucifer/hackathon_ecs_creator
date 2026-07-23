# Database Migrations & Schema Evolution

<cite>
**Referenced Files in This Document**
- [alembic.ini](file://backend/alembic.ini)
- [env.py](file://backend/alembic/env.py)
- [script.py.mako](file://backend/alembic/script.py.mako)
- [0001_initial_schema.py](file://backend/alembic/versions/0001_initial_schema.py)
- [database.py](file://backend/app/database.py)
- [config.py](file://backend/app/config.py)
- [main.py](file://backend/app/main.py)
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
This document explains the database migration strategy and schema evolution process for the project using Alembic. It covers how migrations are structured, how versions are tracked, rollback procedures, environment configuration, script templates, and end-to-end workflows for generating and applying migrations safely in development and production environments. It also includes best practices for safe schema changes, data preservation, and testing migration scripts.

## Project Structure
The migration tooling is located under backend/alembic with a single initial migration file and standard Alembic configuration files. The application’s database connection and settings are configured in the app layer and consumed by Alembic at runtime.

```mermaid
graph TB
subgraph "Backend"
A["alembic.ini"]
B["alembic/env.py"]
C["alembic/script.py.mako"]
D["alembic/versions/0001_initial_schema.py"]
E["app/database.py"]
F["app/config.py"]
G["app/main.py"]
end
A --> B
B --> E
B --> F
C --> D
E --> F
G --> E
```

**Diagram sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [main.py:1-200](file://backend/app/main.py#L1-L200)

**Section sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [main.py:1-200](file://backend/app/main.py#L1-L200)

## Core Components
- alembic.ini: Central configuration for Alembic including the target database URL, script locations, and upgrade/downgrade behavior.
- env.py: Runtime environment loader that resolves the SQLAlchemy engine from application config and executes migrations within an isolated context.
- script.py.mako: Template used to generate new migration files; can be customized to include imports or boilerplate.
- versions/0001_initial_schema.py: First migration defining the initial schema.
- app/database.py: Provides the SQLAlchemy engine and session factory used by both the application and Alembic.
- app/config.py: Loads database credentials and other settings from environment variables.
- app/main.py: Application entry point that wires dependencies and may trigger startup tasks (e.g., health checks).

Key responsibilities:
- Configuration resolution: env.py reads database URLs and options from app.config and passes them to Alembic.
- Migration execution: Alembic uses the engine provided by env.py to apply versioned changes.
- Version tracking: Alembic maintains a metadata table to track applied revisions.

**Section sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [main.py:1-200](file://backend/app/main.py#L1-L200)

## Architecture Overview
Alembic integrates with the application’s database configuration to execute migrations against the same database used by the service.

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant CLI as "Alembic CLI"
participant Env as "env.py"
participant DBConf as "app/config.py"
participant DB as "app/database.py"
participant TargetDB as "Database"
Dev->>CLI : "alembic revision -m 'describe change'"
CLI->>Env : "load environment"
Env->>DBConf : "read DATABASE_URL and options"
Env->>DB : "create engine/session"
CLI-->>Dev : "generate migration file"
Dev->>CLI : "alembic upgrade head"
CLI->>Env : "resolve current revision"
Env->>DB : "connect to TargetDB"
CLI->>TargetDB : "apply up() steps"
TargetDB-->>CLI : "success/failure"
CLI-->>Dev : "status updated"
```

**Diagram sources**
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)

## Detailed Component Analysis

### Alembic Configuration (alembic.ini)
- Purpose: Defines the migration script directory, target database URL, and upgrade/downgrade behavior.
- Key aspects:
  - Script location points to backend/alembic.
  - Database URL is typically sourced from environment variables via env.py or directly here.
  - Upgrade targets and downgrade strategies are controlled by commands and flags.

Best practices:
- Keep secrets out of version control; use environment variables.
- Pin Alembic and SQLAlchemy versions for reproducibility.

**Section sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)

### Environment Loader (env.py)
- Purpose: Bridges Alembic with the application’s database configuration.
- Responsibilities:
  - Import app configuration and resolve the database URL.
  - Create the SQLAlchemy engine and configure logging.
  - Provide the MetaData object and run migrations within a transactional context where supported.

Operational notes:
- Ensure the engine is created with appropriate pool settings and timeouts for CI and production.
- Use offline mode only when generating SQL without connecting to a live database.

**Section sources**
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)

### Script Template (script.py.mako)
- Purpose: Customizes the boilerplate generated by alembic revision.
- Typical customizations:
  - Include common imports (e.g., models, helpers).
  - Add pre/post hooks or comments guiding safe changes.

Usage:
- Modify this template once to standardize all future migrations.

**Section sources**
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)

### Initial Migration (0001_initial_schema.py)
- Purpose: Establishes the baseline schema for the application.
- Contains:
  - Up() function to create tables and constraints.
  - Down() function to reverse changes.

Guidelines:
- Keep idempotent operations where possible.
- Avoid destructive changes in Down() if data must be preserved.

**Section sources**
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)

### Database Layer (app/database.py)
- Purpose: Creates and exposes the SQLAlchemy engine and session factory.
- Responsibilities:
  - Build engine from configuration.
  - Provide session-scoped connections.
  - Optionally set pool size, timeout, and echo/logging.

Integration with Alembic:
- env.py consumes this module to obtain a working engine for migrations.

**Section sources**
- [database.py:1-200](file://backend/app/database.py#L1-L200)

### Configuration (app/config.py)
- Purpose: Loads environment-based settings such as database URL, pool sizes, and feature flags.
- Integration:
  - env.py reads these values to construct the engine.
  - main.py may read these values to initialize the application.

Security:
- Never commit secrets; rely on environment injection at runtime.

**Section sources**
- [config.py:1-200](file://backend/app/config.py#L1-L200)

### Application Entry Point (app/main.py)
- Purpose: Wires application components and may perform startup tasks.
- Relevance to migrations:
  - Does not typically run migrations automatically; migrations should be executed explicitly during deployment.
  - Health checks and readiness probes should verify database connectivity post-migration.

**Section sources**
- [main.py:1-200](file://backend/app/main.py#L1-L200)

## Dependency Analysis
The following diagram shows how Alembic depends on application configuration and database modules.

```mermaid
graph LR
INI["alembic.ini"] --> ENV["env.py"]
ENV --> CFG["app/config.py"]
ENV --> DBM["app/database.py"]
TPL["script.py.mako"] --> MIG["versions/*.py"]
APP["app/main.py"] --> DBM
```

**Diagram sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)
- [main.py:1-200](file://backend/app/main.py#L1-L200)

**Section sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [config.py:1-200](file://backend/app/config.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)
- [main.py:1-200](file://backend/app/main.py#L1-L200)

## Performance Considerations
- Connection pooling: Tune pool size and timeouts in the database engine to handle concurrent migration runs and application load.
- Large migrations: Split large schema changes into multiple small, focused migrations to reduce lock times and improve reliability.
- Offline mode: For CI pipelines, prefer offline generation to avoid connecting to databases during code generation.
- Index management: Add indexes incrementally and consider online index creation strategies supported by your database.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing or incorrect DATABASE_URL:
  - Verify environment variables and ensure env.py reads them correctly.
- Conflicting migrations:
  - Check current revision and history; do not edit already-applied migrations.
- Lock contention:
  - Run migrations during low-traffic windows; use non-blocking operations where possible.
- Rollback failures:
  - Ensure Down() functions are correct; if necessary, write manual recovery scripts instead of relying solely on Down().

Operational tips:
- Always test migrations against a staging database mirroring production.
- Use explicit alembic stamp or downgrade only when you understand the implications.

**Section sources**
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)

## Conclusion
Alembic provides a robust framework for evolving the database schema alongside application code. By centralizing configuration in env.py and config.py, standardizing migration templates, and following disciplined workflows for generation, review, and deployment, teams can maintain reliable, reversible, and safe schema changes across environments.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Workflow: Creating a New Migration
- Generate a migration:
  - Command: alembic revision -m "short description"
  - Result: A new file under versions/ with Up() and Down() stubs.
- Implement changes:
  - Add schema modifications in Up().
  - Provide corresponding Down() logic to revert changes.
- Validate locally:
  - Apply to a local or CI database: alembic upgrade head
  - Test rollback: alembic downgrade -1
- Commit and deploy:
  - Push migration file to version control.
  - Apply in staging and then production using alembic upgrade head.

**Section sources**
- [script.py.mako:1-200](file://backend/alembic/script.py.mako#L1-L200)
- [0001_initial_schema.py:1-200](file://backend/alembic/versions/0001_initial_schema.py#L1-L200)

### Production Deployment Checklist
- Pre-deploy:
  - Back up the database or enable snapshots.
  - Review migration diffs and ensure Down() paths are safe.
- Deploy:
  - Run alembic upgrade head before starting the application.
  - Monitor logs for errors and long-running operations.
- Post-deploy:
  - Verify application health and key features.
  - Confirm no unexpected locks or performance regressions.

**Section sources**
- [alembic.ini:1-200](file://backend/alembic.ini#L1-L200)
- [env.py:1-200](file://backend/alembic/env.py#L1-L200)
- [database.py:1-200](file://backend/app/database.py#L1-L200)

### Best Practices for Safe Schema Evolution
- Small, incremental changes:
  - Prefer additive changes (new columns, tables) over destructive ones.
- Data safety:
  - Preserve existing data; avoid dropping columns or constraints without migration plans.
- Idempotency:
  - Where possible, make operations safe to re-run or guard with conditional checks.
- Testing:
  - Test migrations against realistic data volumes in staging.
  - Automate migration tests in CI.
- Rollback planning:
  - Document manual recovery steps if Down() cannot fully restore state.

[No sources needed since this section provides general guidance]