# Authentication API

<cite>
**Referenced Files in This Document**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/main.py](file://backend/app/main.py)
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

## Introduction
This document provides comprehensive API documentation for the authentication subsystem, including login with username and password, JWT token issuance and refresh, logout and session management, and user profile retrieval and update operations. It specifies HTTP methods, request/response schemas, validation rules, authentication requirements using Bearer tokens, status codes, error handling patterns, and concrete examples.

## Project Structure
The authentication functionality is implemented within the backend application:
- Router definitions for authentication endpoints
- Pydantic schemas for request/response validation
- Middleware for JWT verification and authorization
- User model and password utilities
- Configuration for JWT settings
- Application entry point where middleware and routers are mounted

```mermaid
graph TB
Client["Client"] --> Main["FastAPI App<br/>main.py"]
Main --> AuthRouter["Auth Router<br/>routers/auth.py"]
Main --> AuthMiddleware["Auth Middleware<br/>middleware/auth.py"]
AuthRouter --> Schemas["Schemas<br/>schemas/auth.py"]
AuthRouter --> UserModel["User Model<br/>models/user.py"]
AuthRouter --> PasswordSvc["Password Service<br/>services/password.py"]
AuthRouter --> Config["Config<br/>config.py"]
```

**Diagram sources**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/config.py](file://backend/app/config.py)

**Section sources**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/config.py](file://backend/app/config.py)

## Core Components
- Authentication router: defines endpoints for login, refresh, logout, and profile access/update.
- Schemas: define and validate request/response payloads for authentication flows.
- Middleware: enforces JWT-based authorization on protected routes.
- User model: represents users and related fields.
- Password service: handles secure password hashing and verification.
- Configuration: centralizes JWT secret, expiration, and algorithm settings.

Key responsibilities:
- Login endpoint validates credentials and issues JWT tokens.
- Refresh endpoint reissues tokens based on a valid refresh token.
- Logout invalidates sessions or refresh tokens as applicable.
- Profile endpoints retrieve and update authenticated user information.
- Middleware intercepts requests to verify Bearer tokens and enforce permissions.

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/config.py](file://backend/app/config.py)

## Architecture Overview
Authentication flow overview:
- Clients send credentials to the login endpoint.
- The server verifies credentials, creates a JWT access token (and optionally a refresh token), and returns them.
- Subsequent requests include a Bearer token in the Authorization header.
- Middleware validates the token and attaches the current user context.
- A refresh endpoint allows obtaining new access tokens without re-authentication.
- Logout invalidates tokens or sessions as configured.

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Auth Router"
participant P as "Password Service"
participant U as "User Model"
participant M as "Auth Middleware"
participant CFG as "Config"
C->>R : POST /api/v1/auth/login {username, password}
R->>U : lookup user by username
R->>P : verify password
alt valid credentials
R->>CFG : read JWT settings
R-->>C : 200 OK {access_token, refresh_token, expires_in}
else invalid credentials
R-->>C : 401 Unauthorized
end
C->>R : POST /api/v1/auth/refresh {refresh_token}
R->>R : validate refresh token
alt valid refresh token
R-->>C : 200 OK {access_token, expires_in}
else invalid/expired
R-->>C : 401 Unauthorized
end
C->>M : GET /api/v1/auth/me (Authorization : Bearer <token>)
M->>M : decode and verify JWT
alt valid token
M-->>C : 200 OK {user info}
else invalid/expired
M-->>C : 401 Unauthorized
end
C->>R : POST /api/v1/auth/logout (Authorization : Bearer <token>)
R->>R : invalidate session/refresh token
R-->>C : 200 OK
```

**Diagram sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/config.py](file://backend/app/config.py)

## Detailed Component Analysis

### Login Endpoint
- Method and path: POST /api/v1/auth/login
- Purpose: Authenticate a user with username and password and return JWT tokens.
- Request body schema:
  - Fields:
    - username: string, required, non-empty
    - password: string, required, non-empty
  - Validation:
    - Both fields must be present and not empty.
- Response:
  - On success (200):
    - access_token: string (JWT)
    - refresh_token: string (optional depending on implementation)
    - token_type: string ("bearer")
    - expires_in: integer (seconds until expiry)
  - On failure (401):
    - Error message indicating invalid credentials.
- Authentication: None required.
- Status codes:
  - 200: Success
  - 401: Invalid credentials
  - 422: Validation error (missing or malformed fields)

Example request payload:
{
  "username": "jdoe",
  "password": "SecretPass1!"
}

Example response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "token_type": "bearer",
  "expires_in": 3600
}

Error responses:
- 401 Unauthorized:
  {
    "detail": "Invalid credentials"
  }
- 422 Unprocessable Entity:
  {
    "detail": "Validation error details"
  }

Security considerations:
- Passwords are verified securely via the password service.
- Tokens are issued according to configuration (algorithm, secret, expiry).

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/config.py](file://backend/app/config.py)

### Refresh Token Endpoint
- Method and path: POST /api/v1/auth/refresh
- Purpose: Obtain a new access token using a valid refresh token.
- Request body schema:
  - Fields:
    - refresh_token: string, required, non-empty
  - Validation:
    - Must be present and non-empty.
- Response:
  - On success (200):
    - access_token: string (JWT)
    - token_type: string ("bearer")
    - expires_in: integer (seconds until expiry)
  - On failure (401):
    - Error message indicating invalid or expired refresh token.
- Authentication: None required for this endpoint; relies on refresh token validity.
- Status codes:
  - 200: Success
  - 401: Invalid or expired refresh token
  - 422: Validation error

Example request payload:
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}

Example response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}

Error responses:
- 401 Unauthorized:
  {
    "detail": "Invalid or expired refresh token"
  }
- 422 Unprocessable Entity:
  {
    "detail": "Validation error details"
  }

Security considerations:
- Ensure refresh tokens are short-lived and rotated if supported.
- Validate refresh tokens against stored state if used.

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)

### Get Current User Profile
- Method and path: GET /api/v1/auth/me
- Purpose: Retrieve the authenticated user’s profile information.
- Authentication: Required. Include Bearer token in Authorization header.
- Request headers:
  - Authorization: Bearer <access_token>
- Response:
  - On success (200):
    - user_id: string or integer
    - username: string
    - email: string (if available)
    - roles: array of strings (if available)
    - created_at: timestamp (if available)
    - updated_at: timestamp (if available)
- Status codes:
  - 200: Success
  - 401: Missing or invalid token
  - 403: Insufficient permissions (if role checks apply)

Example request headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Example response (200):
{
  "user_id": "u_12345",
  "username": "jdoe",
  "email": "jdoe@example.com",
  "roles": ["user"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-06-15T12:34:56Z"
}

Error responses:
- 401 Unauthorized:
  {
    "detail": "Not authenticated"
  }
- 403 Forbidden:
  {
    "detail": "Insufficient permissions"
  }

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)

### Update User Profile
- Method and path: PUT /api/v1/auth/me
- Purpose: Update authenticated user’s profile fields.
- Authentication: Required. Include Bearer token in Authorization header.
- Request body schema:
  - Fields:
    - email: string, optional, must be valid email format if provided
    - username: string, optional, non-empty if provided
    - password: string, optional, minimum length if provided
  - Validation:
    - At least one field should be provided.
    - Email must conform to standard email format when included.
    - Password must meet complexity requirements if included.
- Response:
  - On success (200):
    - Updated user fields returned (e.g., username, email, updated_at)
- Status codes:
  - 200: Success
  - 401: Missing or invalid token
  - 403: Insufficient permissions
  - 422: Validation error

Example request payload:
{
  "email": "jdoe.new@example.com",
  "password": "NewSecurePass1!"
}

Example response (200):
{
  "user_id": "u_12345",
  "username": "jdoe",
  "email": "jdoe.new@example.com",
  "updated_at": "2024-06-15T13:00:00Z"
}

Error responses:
- 401 Unauthorized:
  {
    "detail": "Not authenticated"
  }
- 403 Forbidden:
  {
    "detail": "Insufficient permissions"
  }
- 422 Unprocessable Entity:
  {
    "detail": "Validation error details"
  }

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)

### Logout
- Method and path: POST /api/v1/auth/logout
- Purpose: Invalidate the current session or refresh token and terminate the client’s authenticated state.
- Authentication: Required. Include Bearer token in Authorization header.
- Request body:
  - Optional: refresh_token (string) if server requires explicit revocation.
- Response:
  - On success (200):
    - Message confirming logout.
- Status codes:
  - 200: Success
  - 401: Missing or invalid token
  - 403: Insufficient permissions

Example request headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Example response (200):
{
  "message": "Logged out successfully"
}

Error responses:
- 401 Unauthorized:
  {
    "detail": "Not authenticated"
  }
- 403 Forbidden:
  {
    "detail": "Insufficient permissions"
  }

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)

## Dependency Analysis
The authentication system depends on several components:
- Router orchestrates endpoints and delegates to services.
- Schemas enforce input/output validation.
- Middleware ensures only authenticated requests reach protected endpoints.
- User model provides data access for user records.
- Password service secures password operations.
- Configuration centralizes JWT parameters.

```mermaid
graph LR
AuthRouter["Auth Router"] --> Schemas["Schemas"]
AuthRouter --> PasswordSvc["Password Service"]
AuthRouter --> UserModel["User Model"]
AuthRouter --> Config["Config"]
Middleware["Auth Middleware"] --> Config
Middleware --> UserModel
```

**Diagram sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/config.py](file://backend/app/config.py)

**Section sources**
- [backend/app/routers/auth.py](file://backend/app/routers/auth.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/config.py](file://backend/app/config.py)

## Performance Considerations
- Use short-lived access tokens and long-lived refresh tokens to balance security and performance.
- Cache user lookups where appropriate to reduce database load during frequent requests.
- Avoid unnecessary password hashing on read-only endpoints.
- Implement rate limiting on login and refresh endpoints to mitigate brute-force attacks.
- Ensure JWT verification is efficient by validating signatures once per request and reusing decoded claims.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common errors and resolutions:
- 401 Unauthorized:
  - Cause: Missing, malformed, or expired Bearer token.
  - Resolution: Ensure Authorization header includes a valid token; refresh if expired.
- 403 Forbidden:
  - Cause: Insufficient permissions for the requested operation.
  - Resolution: Verify user roles and permissions; escalate privileges if necessary.
- 422 Unprocessable Entity:
  - Cause: Request payload failed validation (missing fields, invalid formats).
  - Resolution: Check request schema and ensure all required fields are present and correctly formatted.
- Invalid credentials:
  - Cause: Incorrect username or password.
  - Resolution: Confirm credentials; reset password if needed.

Operational tips:
- Log token verification failures for debugging while avoiding sensitive data exposure.
- Monitor refresh token usage patterns to detect anomalies.
- Review password policy enforcement and hashing configuration.

**Section sources**
- [backend/app/middleware/auth.py](file://backend/app/middleware/auth.py)
- [backend/app/services/password.py](file://backend/app/services/password.py)
- [backend/app/schemas/auth.py](file://backend/app/schemas/auth.py)

## Conclusion
The authentication API provides secure login, token refresh, logout, and profile management capabilities. It leverages JWT-based authorization enforced by middleware, robust input validation through schemas, and secure password handling. Proper use of Bearer tokens, adherence to request/response schemas, and attention to error handling will ensure reliable and secure interactions.

[No sources needed since this section summarizes without analyzing specific files]