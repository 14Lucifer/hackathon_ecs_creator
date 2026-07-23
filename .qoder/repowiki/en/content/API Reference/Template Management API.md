# Template Management API

<cite>
**Referenced Files in This Document**
- [templates.py](file://backend/app/routers/templates.py)
- [template.py](file://backend/app/schemas/template.py)
- [template.py](file://backend/app/models/template.py)
- [auth.py](file://backend/app/middleware/auth.py)
- [audit_log.py](file://backend/app/models/audit_log.py)
- [main.py](file://backend/app/main.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication and Authorization](#authentication-and-authorization)
3. [Template CRUD Operations](#template-crud-operations)
4. [Template Versioning](#template-versioning)
5. [Template Sharing](#template-sharing)
6. [Template Validation and Testing](#template-validation-and-testing)
7. [Error Handling](#error-handling)
8. [Audit Logging](#audit-logging)
9. [API Examples](#api-examples)
10. [Best Practices](#best-practices)

## Introduction

The Template Management API provides a comprehensive interface for managing resource templates in the ECS Creator system. Templates define reusable configurations for cloud resources including ECS instances, VPC networks, and associated metadata. This API supports full CRUD operations, versioning, sharing capabilities, validation, and testing functionality.

### Key Features
- **Resource Template Management**: Create, read, update, and delete template definitions
- **Version Control**: Track template changes and compare versions
- **Access Control**: User and admin-level permissions
- **Validation Engine**: Validate template syntax and resource specifications
- **Testing Framework**: Test template deployments without actual provisioning
- **Audit Trail**: Complete logging of template modifications

## Authentication and Authorization

The API implements role-based access control with two primary user types:

### Access Levels

| Role | Permissions | Description |
|------|-------------|-------------|
| **User** | Read templates, Create own templates, Test own templates | Standard users can manage their own templates |
| **Admin** | Full CRUD operations, Share templates, Manage all templates | Administrators have complete template management capabilities |

### Authentication Methods

#### JWT Token Authentication
All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

#### Session-Based Authentication
For browser-based clients, session cookies are supported.

### Permission Matrix

| Operation | User | Admin |
|-----------|------|-------|
| GET /api/v1/templates | ✅ | ✅ |
| POST /api/v1/templates | ✅ | ✅ |
| PUT /api/v1/templates/{id} | ✅ (own only) | ✅ (all) |
| DELETE /api/v1/templates/{id} | ✅ (own only) | ✅ (all) |
| GET /api/v1/templates/{id}/versions | ✅ | ✅ |
| POST /api/v1/templates/{id}/share | ❌ | ✅ |
| GET /api/v1/templates/{id}/validate | ✅ | ✅ |
| POST /api/v1/templates/{id}/test | ✅ | ✅ |

**Section sources**
- [auth.py](file://backend/app/middleware/auth.py)
- [main.py](file://backend/app/main.py)

## Template CRUD Operations

### Create Template

**Endpoint**: `POST /api/v1/templates`

Creates a new resource template with specified configuration.

#### Request Schema

```json
{
  "name": "string",
  "description": "string", 
  "category": "string",
  "tags": ["string"],
  "specification": {
    "ecs": {
      "instance_type": "string",
      "image_id": "string", 
      "system_disk_size": "integer",
      "data_disks": [
        {
          "size": "integer",
          "category": "string"
        }
      ],
      "vpc_id": "string",
      "subnet_id": "string",
      "security_group_ids": ["string"]
    },
    "vpc": {
      "cidr_block": "string",
      "vswitch_ids": ["string"],
      "route_table_id": "string"
    },
    "metadata": {
      "environment": "production|staging|development",
      "team": "string",
      "cost_center": "string",
      "owner": "string"
    }
  },
  "version": "string"
}
```

#### Response Schema

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "string", 
  "tags": ["string"],
  "specification": {
    "ecs": {},
    "vpc": {},
    "metadata": {}
  },
  "version": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "created_by": "user_id",
  "status": "active|draft|deprecated"
}
```

#### Status Codes
- `201 Created`: Template successfully created
- `400 Bad Request`: Invalid template specification
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Template name already exists

### Read Templates

**Endpoint**: `GET /api/v1/templates`

Retrieves a list of templates with optional filtering and pagination.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (default: 1) | `?page=1` |
| `limit` | integer | Items per page (default: 20, max: 100) | `?limit=50` |
| `category` | string | Filter by category | `?category=web-server` |
| `tag` | string | Filter by tag | `?tag=production` |
| `search` | string | Search in name/description | `?search=nginx` |
| `sort_by` | string | Sort field | `?sort_by=created_at` |
| `order` | string | Sort order (asc/desc) | `?order=desc` |

#### Response Schema

```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "category": "string",
      "tags": ["string"],
      "version": "string",
      "status": "string",
      "created_at": "datetime",
      "updated_at": "datetime",
      "created_by": "user_id"
    }
  ],
  "pagination": {
    "total": "integer",
    "page": "integer", 
    "limit": "integer",
    "has_next": "boolean",
    "has_prev": "boolean"
  }
}
```

### Get Single Template

**Endpoint**: `GET /api/v1/templates/{id}`

Retrieves detailed information about a specific template.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Template unique identifier |

#### Response Schema

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "string",
  "tags": ["string"],
  "specification": {
    "ecs": {
      "instance_type": "string",
      "image_id": "string",
      "system_disk_size": "integer",
      "data_disks": [],
      "vpc_id": "string",
      "subnet_id": "string",
      "security_group_ids": []
    },
    "vpc": {
      "cidr_block": "string",
      "vswitch_ids": [],
      "route_table_id": "string"
    },
    "metadata": {
      "environment": "string",
      "team": "string",
      "cost_center": "string",
      "owner": "string"
    }
  },
  "version": "string",
  "status": "string",
  "is_shared": "boolean",
  "shared_with": ["user_ids"],
  "created_at": "datetime",
  "updated_at": "datetime", 
  "created_by": "user_id",
  "updated_by": "user_id"
}
```

### Update Template

**Endpoint**: `PUT /api/v1/templates/{id}`

Updates an existing template with new specifications.

#### Request Schema

Same as Create Template endpoint.

#### Response Schema

Same as Create Template response.

#### Status Codes
- `200 OK`: Template successfully updated
- `404 Not Found`: Template not found
- `403 Forbidden`: Cannot update template (not owner/admin)

### Delete Template

**Endpoint**: `DELETE /api/v1/templates/{id}`

Permanently deletes a template.

#### Response Schema

```json
{
  "message": "Template deleted successfully",
  "deleted_template_id": "uuid"
}
```

#### Status Codes
- `200 OK`: Template successfully deleted
- `404 Not Found`: Template not found  
- `403 Forbidden`: Cannot delete template (not owner/admin)

**Section sources**
- [templates.py](file://backend/app/routers/templates.py)
- [template.py](file://backend/app/schemas/template.py)
- [template.py](file://backend/app/models/template.py)

## Template Versioning

The template system maintains version history for all template modifications. Each update creates a new version while preserving previous versions.

### Get Template Versions

**Endpoint**: `GET /api/v1/templates/{id}/versions`

Retrieves all versions of a specific template.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of versions to return (default: 10) |
| `offset` | integer | Skip first N versions |

#### Response Schema

```json
{
  "versions": [
    {
      "version": "string",
      "specification": {},
      "created_at": "datetime",
      "created_by": "user_id",
      "change_summary": "string",
      "is_current": "boolean"
    }
  ],
  "total_versions": "integer"
}
```

### Compare Template Versions

**Endpoint**: `GET /api/v1/templates/{id}/compare`

Compares two template versions to identify differences.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `version_a` | string | First version for comparison |
| `version_b` | string | Second version for comparison |

#### Response Schema

```json
{
  "version_a": "string",
  "version_b": "string",
  "differences": {
    "ecs": {
      "changed_fields": ["field_name"],
      "added_fields": ["field_name"],
      "removed_fields": ["field_name"]
    },
    "vpc": {},
    "metadata": {}
  },
  "summary": "string"
}
```

### Rollback to Previous Version

**Endpoint**: `POST /api/v1/templates/{id}/rollback`

Rolls back a template to a previous version.

#### Request Schema

```json
{
  "target_version": "string",
  "reason": "string"
}
```

#### Response Schema

```json
{
  "message": "Template rolled back successfully",
  "new_version": "string",
  "rolled_back_from": "string",
  "rolled_back_to": "string"
}
```

**Section sources**
- [templates.py](file://backend/app/routers/templates.py)
- [template.py](file://backend/app/schemas/template.py)

## Template Sharing

Templates can be shared between users to promote collaboration and reuse across teams.

### Share Template

**Endpoint**: `POST /api/v1/templates/{id}/share`

Shares a template with specific users or groups.

#### Request Schema

```json
{
  "shared_with": ["user_ids"],
  "access_level": "read|write",
  "expiration_date": "datetime"
}
```

#### Response Schema

```json
{
  "message": "Template shared successfully",
  "template_id": "uuid",
  "shared_with_count": "integer",
  "access_level": "string"
}
```

### Revoke Sharing

**Endpoint**: `DELETE /api/v1/templates/{id}/share/{user_id}`

Removes sharing access for a specific user.

#### Response Schema

```json
{
  "message": "Sharing revoked successfully",
  "template_id": "uuid",
  "revoked_for": "user_id"
}
```

### List Shared Templates

**Endpoint**: `GET /api/v1/templates/shared`

Lists templates that are shared with the current user.

#### Response Schema

```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "string",
      "shared_by": "user_id",
      "access_level": "string",
      "shared_at": "datetime",
      "expires_at": "datetime"
    }
  ]
}
```

**Section sources**
- [templates.py](file://backend/app/routers/templates.py)

## Template Validation and Testing

### Validate Template

**Endpoint**: `GET /api/v1/templates/{id}/validate`

Validates a template's specification against schema requirements and business rules.

#### Response Schema

```json
{
  "is_valid": "boolean",
  "errors": [
    {
      "field": "string",
      "message": "string",
      "severity": "error|warning"
    }
  ],
  "warnings": [],
  "validation_rules": [
    {
      "rule": "string",
      "status": "passed|failed"
    }
  ]
}
```

### Test Template Deployment

**Endpoint**: `POST /api/v1/templates/{id}/test`

Tests template deployment in a dry-run mode without actually provisioning resources.

#### Request Schema

```json
{
  "test_environment": "sandbox|staging",
  "dry_run": true,
  "timeout_seconds": 300
}
```

#### Response Schema

```json
{
  "test_id": "uuid",
  "status": "pending|running|completed|failed",
  "preview": {
    "resources_to_create": [
      {
        "type": "ecs_instance",
        "configuration": {},
        "estimated_cost": "number"
      }
    ],
    "network_changes": {},
    "security_impact": {}
  },
  "estimated_deployment_time": "string",
  "estimated_cost": "number",
  "warnings": [],
  "errors": []
}
```

### Get Test Results

**Endpoint**: `GET /api/v1/templates/{id}/test/{test_id}`

Retrieves the results of a template test execution.

#### Response Schema

```json
{
  "test_id": "uuid",
  "status": "completed|failed",
  "results": {
    "validation_passed": "boolean",
    "resource_provisioning": "success|failed",
    "network_connectivity": "success|failed",
    "security_groups": "success|failed"
  },
  "logs": [],
  "duration": "string",
  "timestamp": "datetime"
}
```

**Section sources**
- [templates.py](file://backend/app/routers/templates.py)

## Error Handling

The API uses standard HTTP status codes and consistent error response formats.

### Error Response Format

```json
{
  "error": {
    "code": "string",
    "message": "string", 
    "details": {},
    "timestamp": "datetime",
    "request_id": "uuid"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TEMPLATE_NOT_FOUND` | 404 | Template with specified ID does not exist |
| `INVALID_TEMPLATE_SPEC` | 400 | Template specification fails validation |
| `PERMISSION_DENIED` | 403 | User lacks required permissions |
| `VERSION_CONFLICT` | 409 | Concurrent modification detected |
| `VALIDATION_ERROR` | 422 | Template validation failed |
| `TEST_EXECUTION_FAILED` | 500 | Template test execution failed |

### Validation Errors

Template validation errors include detailed field-level information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Template validation failed",
    "details": {
      "fields": {
        "specification.ecs.instance_type": ["Invalid instance type"],
        "specification.vpc.cidr_block": ["Invalid CIDR block format"]
      },
      "rules": {
        "required_fields": ["Missing required fields"],
        "format_validation": ["Field format validation failed"]
      }
    }
  }
}
```

**Section sources**
- [templates.py](file://backend/app/routers/templates.py)

## Audit Logging

All template modifications are automatically logged for compliance and debugging purposes.

### Audit Log Structure

```json
{
  "id": "uuid",
  "action": "create|update|delete|share|unshare|version_rollback",
  "entity_type": "template",
  "entity_id": "uuid",
  "user_id": "uuid",
  "ip_address": "string",
  "user_agent": "string",
  "changes": {
    "before": {},
    "after": {}
  },
  "metadata": {
    "reason": "string",
    "session_id": "uuid"
  },
  "timestamp": "datetime"
}
```

### Audit Log Endpoints

#### Get Audit Logs

**Endpoint**: `GET /api/v1/audit/logs`

Retrieves audit logs with filtering options.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity_type` | string | Filter by entity type |
| `entity_id` | string | Filter by entity ID |
| `user_id` | string | Filter by user ID |
| `action` | string | Filter by action type |
| `start_date` | datetime | Filter by start date |
| `end_date` | datetime | Filter by end date |

#### Response Schema

```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "string",
      "entity_type": "string",
      "entity_id": "uuid",
      "user_id": "uuid",
      "timestamp": "datetime",
      "changes": {},
      "metadata": {}
    }
  ],
  "pagination": {}
}
```

**Section sources**
- [audit_log.py](file://backend/app/models/audit_log.py)
- [templates.py](file://backend/app/routers/templates.py)

## API Examples

### Template Creation Example

Creating a web server template with ECS and VPC specifications:

```bash
curl -X POST https://api.example.com/api/v1/templates \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Server Template",
    "description": "Production-ready web server with load balancing",
    "category": "web-application",
    "tags": ["web", "production", "nginx"],
    "specification": {
      "ecs": {
        "instance_type": "ecs.g6.large",
        "image_id": "ubuntu_20_04_x64",
        "system_disk_size": 50,
        "data_disks": [
          {
            "size": 100,
            "category": "cloud_ssd"
          }
        ],
        "vpc_id": "vpc-123456",
        "subnet_id": "subnet-789012",
        "security_group_ids": ["sg-web-001"]
      },
      "vpc": {
        "cidr_block": "10.0.0.0/16",
        "vswitch_ids": ["vsw-123456"],
        "route_table_id": "rtb-789012"
      },
      "metadata": {
        "environment": "production",
        "team": "platform-engineering",
        "cost_center": "engineering-ops",
        "owner": "admin@company.com"
      }
    },
    "version": "1.0.0"
  }'
```

### Template Version Comparison Example

Comparing two template versions:

```bash
curl -X GET "https://api.example.com/api/v1/templates/template-id/compare?version_a=1.0.0&version_b=1.1.0" \
  -H "Authorization: Bearer your_jwt_token"
```

### Template Testing Example

Testing template deployment:

```bash
curl -X POST https://api.example.com/api/v1/templates/template-id/test \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "test_environment": "sandbox",
    "dry_run": true,
    "timeout_seconds": 300
  }'
```

## Best Practices

### Template Design Guidelines

1. **Use Descriptive Names**: Include purpose and environment in template names
2. **Implement Proper Tagging**: Use consistent tags for categorization and filtering
3. **Version Semantically**: Follow semantic versioning for template releases
4. **Document Changes**: Provide meaningful change summaries for each version
5. **Validate Before Deploying**: Always test templates before production use

### Security Considerations

1. **Least Privilege Principle**: Grant minimum necessary permissions
2. **Regular Auditing**: Monitor template usage and modifications
3. **Sensitive Data Protection**: Avoid storing secrets in template specifications
4. **Network Security**: Validate security group configurations
5. **Resource Limits**: Implement quotas and limits for template usage

### Performance Optimization

1. **Pagination**: Use pagination for large template collections
2. **Caching**: Cache frequently accessed template data
3. **Asynchronous Processing**: Handle long-running operations asynchronously
4. **Efficient Queries**: Optimize database queries for template retrieval
5. **Compression**: Enable response compression for large template specifications

[No sources needed since this section provides general guidance]