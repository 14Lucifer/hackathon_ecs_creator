# Authentication Flow & Token Management

<cite>
**Referenced Files in This Document**
- [main.py](file://backend/app/main.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [config.py](file://backend/app/config.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the enhanced frontend login page implementation
- Updated authentication flow to include frontend client-side token management and error handling
- Enhanced security features documentation including input validation and secure storage patterns
- Added practical examples of frontend integration with backend authentication APIs

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Frontend Authentication Integration](#frontend-authentication-integration)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This document explains the JWT-based authentication flow and token management system implemented in both backend and frontend applications. It covers the complete lifecycle from user login through token generation, validation, refresh, and logout mechanisms. The system includes enhanced frontend authentication UX with improved error handling, input validation, and security features. It documents the middleware implementation for request interception, token extraction, and user context injection into request scope on the backend, while also covering frontend token storage, API integration, and user experience enhancements.

## Project Structure
The authentication-related code is organized across routers, schemas, models, services, middleware, and frontend components:
- Backend routers define HTTP endpoints for login, token refresh, and logout.
- Backend schemas define Pydantic models for request/response payloads.
- Backend models represent users and sessions in the database.
- Backend services implement cryptographic operations and password hashing.
- Backend middleware performs token extraction, validation, and user context injection.
- Frontend login component provides enhanced user interface with improved UX and error handling.
- Configuration centralizes JWT settings and security parameters.

```mermaid
graph TB
Client["Enhanced Login Page<br/>Login.jsx"] --> API["FastAPI Application"]
API --> AuthRouter["Auth Router<br/>/login, /refresh, /logout"]
API --> ProtectedRoutes["Protected Routes"]
AuthRouter --> AuthService["Auth Logic"]
AuthService --> CryptoService["Crypto Service"]
AuthService --> PasswordService["Password Service"]
AuthService --> UserModel["User Model"]
AuthService --> SessionModel["Session Model"]
ProtectedRoutes --> AuthMiddleware["Auth Middleware"]
AuthMiddleware --> UserModel
AuthMiddleware --> Config["JWT Settings"]
Client --> TokenStorage["Secure Token Storage"]
Client --> ErrorHandling["Enhanced Error Handling"]
Client --> InputValidation["Input Validation"]
```

**Diagram sources**
- [main.py](file://backend/app/main.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [config.py](file://backend/app/config.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

**Section sources**
- [main.py](file://backend/app/main.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [config.py](file://backend/app/config.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

## Core Components
- Authentication router: Provides endpoints for login, token refresh, and logout. It orchestrates credential verification, session management, and token issuance.
- Authentication middleware: Intercepts incoming requests, extracts bearer tokens, validates signatures and expiration, checks session state, and injects the current user into request state.
- Schema definitions: Define input and output structures for authentication requests and responses, including error response formats.
- User and session models: Represent entities persisted in the database; used to verify credentials and manage active sessions.
- Crypto and password services: Provide secure hashing and cryptographic utilities for signing and verifying tokens.
- Configuration: Centralizes JWT secret, algorithm, token lifetimes, and other security settings.
- Enhanced login component: Provides improved user experience with better error handling, input validation, and security features.

Key responsibilities:
- Login: Validate credentials, create or resume a session, issue access and refresh tokens.
- Refresh: Validate refresh token, ensure session exists and is active, issue new access token.
- Logout: Invalidate session and optionally blacklist tokens.
- Protected endpoints: Require valid access token and active session; inject user context.
- Frontend integration: Handle token storage, API calls, error states, and user feedback.

**Section sources**
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [config.py](file://backend/app/config.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

## Architecture Overview
The authentication architecture follows a layered approach with enhanced frontend integration:
- HTTP layer exposes endpoints for authentication operations.
- Service layer handles business logic, including credential verification and token generation/validation.
- Data layer persists user and session information.
- Middleware enforces authentication on protected routes by validating tokens and injecting user context.
- Frontend layer manages user interaction, token storage, and API communication with enhanced error handling.

```mermaid
sequenceDiagram
participant Client as "Enhanced Login Page"
participant API as "FastAPI App"
participant Router as "Auth Router"
participant Service as "Auth Service"
participant Crypto as "Crypto Service"
participant Pass as "Password Service"
participant DB as "Database (User/Session)"
Client->>Client : User enters credentials
Client->>Client : Validate input format
Client->>API : POST "/login" {username, password}
API->>Router : Route to login handler
Router->>Service : authenticate(username, password)
Service->>DB : fetch_user_by_username(username)
DB-->>Service : User record
Service->>Pass : verify_password(password, stored_hash)
Pass-->>Service : bool
alt Valid credentials
Service->>DB : create_or_resume_session(user_id)
DB-->>Service : session_id
Service->>Crypto : sign_access_token(user_id, session_id)
Crypto-->>Service : access_token
Service->>Crypto : sign_refresh_token(session_id)
Crypto-->>Service : refresh_token
Service-->>Router : {access_token, refresh_token, expires_in}
Router-->>Client : 200 OK + tokens
Client->>Client : Store tokens securely
Client->>Client : Redirect to dashboard
else Invalid credentials
Service-->>Router : Error
Router-->>Client : 401 Unauthorized
Client->>Client : Show error message
end
```

**Diagram sources**
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [config.py](file://backend/app/config.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

## Detailed Component Analysis

### Authentication Router
Responsibilities:
- Expose login endpoint: Accept username and password, validate via service, return tokens if successful.
- Expose refresh endpoint: Accept refresh token, validate session and signature, issue new access token.
- Expose logout endpoint: Invalidate session and optionally revoke tokens.

Request/response patterns:
- Login request schema includes username and password fields.
- Login response schema includes access token, refresh token, and expiration metadata.
- Refresh request schema includes refresh token.
- Refresh response schema includes new access token and expiration metadata.
- Logout request may include optional token or rely on server-side session invalidation.

Error handling:
- Returns standardized error responses for invalid credentials, expired tokens, missing headers, and internal errors.

**Section sources**
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)

### Authentication Middleware
Responsibilities:
- Intercept all requests to protected routes.
- Extract bearer token from Authorization header.
- Validate token signature and expiration using configured algorithm and secret.
- Check session validity and status.
- Inject authenticated user into request state for downstream handlers.

Token extraction and validation flow:
- Parse Authorization header for Bearer scheme.
- Decode and verify JWT claims.
- Load user and session records to confirm active state.
- Attach user object to request context.

Error handling:
- Reject requests with missing or malformed tokens.
- Reject requests with expired or revoked tokens.
- Return appropriate HTTP status codes and error messages.

```mermaid
flowchart TD
Start(["Incoming Request"]) --> Extract["Extract Authorization Header"]
Extract --> HasBearer{"Has 'Bearer' token?"}
HasBearer --> |No| DenyMissing["Return 401 Missing Token"]
HasBearer --> |Yes| Verify["Verify JWT Signature & Expiration"]
Verify --> Valid{"Valid token?"}
Valid --> |No| DenyInvalid["Return 401 Invalid Token"]
Valid --> |Yes| LoadUser["Load User & Session"]
LoadUser --> Active{"Session active?"}
Active --> |No| DenyInactive["Return 403 Inactive Session"]
Active --> |Yes| Inject["Inject User into Request State"]
Inject --> Next["Proceed to Handler"]
DenyMissing --> End(["Response"])
DenyInvalid --> End
DenyInactive --> End
Next --> End
```

**Diagram sources**
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [config.py](file://backend/app/config.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)

**Section sources**
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [config.py](file://backend/app/config.py)

### Schema Definitions
Authentication schemas define structured inputs and outputs:
- LoginRequest: username, password.
- LoginResponse: access_token, refresh_token, expires_in.
- RefreshRequest: refresh_token.
- RefreshResponse: access_token, expires_in.
- ErrorResponse: message, code, details.

These schemas enforce validation at the API boundary and provide consistent client-facing contracts.

**Section sources**
- [auth_schema.py](file://backend/app/schemas/auth.py)

### User and Session Models
User model:
- Stores hashed passwords and user attributes.
- Used to retrieve user by username during login.

Session model:
- Tracks active sessions per user.
- Supports creation, lookup, and invalidation.
- Ensures tokens are only issued and accepted for active sessions.

**Section sources**
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)

### Crypto and Password Services
Crypto service:
- Signs and verifies JWT tokens using configured algorithm and secret.
- Generates token payloads with user identifiers and session IDs.

Password service:
- Hashes passwords securely.
- Verifies plaintext passwords against stored hashes.

Configuration integration:
- Reads JWT secret, algorithm, and token lifetimes from configuration.

**Section sources**
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [config.py](file://backend/app/config.py)

### Protected Endpoints and Custom Decorators
Implementing protected endpoints:
- Apply authentication middleware to route groups or individual endpoints.
- Access authenticated user from request state within handlers.

Custom decorators:
- Wrap endpoint functions to perform additional checks (e.g., role-based authorization).
- Reuse token extraction and validation logic from middleware.

Extending with additional providers:
- Introduce provider interfaces for alternative authentication mechanisms (e.g., OAuth2).
- Implement provider-specific login flows while reusing common token issuance and validation logic.

**Section sources**
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)

## Frontend Authentication Integration

### Enhanced Login Component
The enhanced login page provides improved user experience with several key features:

**Security Features:**
- Input sanitization and validation before sending requests
- Secure token storage using secure storage mechanisms
- Protection against XSS attacks through proper input handling
- CSRF protection considerations for form submissions

**User Experience Improvements:**
- Real-time input validation with immediate feedback
- Loading states during authentication requests
- Clear error messages for different failure scenarios
- Auto-focus and keyboard navigation support
- Remember me functionality with secure token persistence

**Error Handling:**
- Comprehensive error state management
- Network error detection and retry logic
- Authentication failure specific error messages
- Graceful degradation when backend is unavailable

**Token Management:**
- Secure storage of access and refresh tokens
- Automatic token refresh when needed
- Token expiration handling
- Clean token cleanup on logout

```mermaid
flowchart TD
A["User enters credentials"] --> B["Validate input format"]
B --> C["Show loading state"]
C --> D["Send login request"]
D --> E{"Authentication result"}
E --> |Success| F["Store tokens securely"]
F --> G["Redirect to dashboard"]
E --> |Invalid credentials| H["Show specific error message"]
E --> |Network error| I["Show network error with retry option"]
E --> |Server error| J["Show server error message"]
H --> K["Clear password field"]
I --> L["Provide retry button"]
J --> M["Log error for debugging"]
```

**Diagram sources**
- [Login.jsx](file://frontend/src/pages/Login.jsx)

### Frontend API Integration
The frontend integrates with backend authentication APIs through:

**API Client Implementation:**
- Centralized API client with authentication headers
- Automatic token attachment to requests
- Request/response interceptors for error handling
- Retry logic for transient failures

**State Management:**
- Global authentication state management
- User session persistence across page reloads
- Automatic logout on token expiration
- Role-based UI rendering based on user permissions

**Security Best Practices:**
- HTTPS-only connections for production
- Secure cookie flags for sensitive data
- Content Security Policy implementation
- Regular security audits and dependency updates

**Section sources**
- [Login.jsx](file://frontend/src/pages/Login.jsx)

## Dependency Analysis
The authentication subsystem depends on configuration, data models, services, and frontend components:
- Router depends on schemas and services.
- Middleware depends on config, models, and crypto service.
- Services depend on models and configuration.
- Frontend login component depends on API client and state management.

```mermaid
graph LR
Config["Config"] --> Crypto["Crypto Service"]
Config --> Password["Password Service"]
Config --> Middleware["Auth Middleware"]
User["User Model"] --> Router["Auth Router"]
Session["Session Model"] --> Router
User --> Middleware
Session --> Middleware
Crypto --> Router
Password --> Router
Crypto --> Middleware
Login["Login.jsx"] --> API["API Client"]
API --> Router
Login --> TokenStorage["Token Storage"]
Login --> ErrorHandler["Error Handler"]
```

**Diagram sources**
- [config.py](file://backend/app/config.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

**Section sources**
- [config.py](file://backend/app/config.py)
- [crypto_service.py](file://backend/app/services/crypto.py)
- [password_service.py](file://backend/app/services/password.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)
- [user_model.py](file://backend/app/models/user.py)
- [session_model.py](file://backend/app/models/session.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

## Performance Considerations
- Minimize database queries by caching frequently accessed user profiles when safe.
- Use short-lived access tokens and long-lived refresh tokens to reduce validation overhead.
- Ensure efficient indexing on user and session tables for fast lookups.
- Avoid redundant token decoding by leveraging framework-level caching where applicable.
- Implement frontend token caching to reduce unnecessary API calls.
- Use lazy loading for authentication-related components.
- Optimize error handling to prevent excessive logging in production.

## Troubleshooting Guide
Common issues and resolutions:
- Missing Authorization header: Ensure clients send Bearer tokens for protected endpoints.
- Invalid token signature: Verify JWT secret and algorithm configuration matches between issuer and validator.
- Expired tokens: Implement automatic refresh before expiry; handle 401 responses by refreshing tokens.
- Inactive session: Confirm session creation and persistence; check session invalidation logic during logout.
- Frontend login failures: Check browser console for JavaScript errors, verify CORS configuration, and inspect network requests.
- Token storage issues: Verify secure storage implementation and browser compatibility.
- Input validation problems: Test edge cases and ensure proper sanitization on both frontend and backend.

Operational tips:
- Log token validation failures with sanitized details for debugging.
- Monitor session counts and token issuance rates to detect anomalies.
- Use consistent error response schemas to simplify client error handling.
- Implement frontend error tracking and reporting.
- Set up health checks for authentication endpoints.
- Monitor login attempt rates to detect brute force attacks.

**Section sources**
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [auth_router.py](file://backend/app/routers/auth.py)
- [auth_schema.py](file://backend/app/schemas/auth.py)
- [Login.jsx](file://frontend/src/pages/Login.jsx)

## Conclusion
The authentication system implements a robust JWT-based flow with clear separation of concerns: routers expose APIs, middleware enforces security, services encapsulate logic, and models persist state. The enhanced frontend login component provides improved user experience with better error handling, input validation, and security features. By following the documented patterns for protected endpoints, custom decorators, provider extensions, and frontend integration, teams can maintain a secure and extensible authentication architecture that delivers excellent user experience.