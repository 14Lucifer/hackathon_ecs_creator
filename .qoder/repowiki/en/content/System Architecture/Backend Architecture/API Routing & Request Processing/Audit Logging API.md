# Audit Logging API

<cite>
**Referenced Files in This Document**
- [audit.py](file://backend/app/routers/audit.py)
- [audit_schema.py](file://backend/app/schemas/audit.py)
- [audit_log_model.py](file://backend/app/models/audit_log.py)
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [database_config.py](file://backend/app/database.py)
- [main_app.py](file://backend/app/main.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [API Overview](#api-overview)
3. [Authentication & Authorization](#authentication--authorization)
4. [Audit Log Endpoints](#audit-log-endpoints)
5. [Compliance Report Endpoints](#compliance-report-endpoints)
6. [Data Models & Schemas](#data-models--schemas)
7. [Filtering & Search Capabilities](#filtering--search-capabilities)
8. [Performance Optimization](#performance-optimization)
9. [Security Considerations](#security-considerations)
10. [Export Capabilities](#export-capabilities)
11. [Retention Policies](#retention-policies)
12. [Error Handling](#error-handling)
13. [Examples](#examples)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Conclusion](#conclusion)

## Introduction

The Audit Logging API provides comprehensive tracking and reporting capabilities for system activities, user actions, and compliance monitoring. This API enables administrators and auditors to retrieve detailed audit trails, generate compliance reports, and filter activity logs based on various criteria including users, actions, date ranges, and resource identifiers.

The audit system captures granular details about system operations, ensuring regulatory compliance and providing forensic capabilities for security investigations. All audit events are immutable and tamper-evident, maintaining a complete chain of custody for critical system activities.

## API Overview

The Audit Logging API follows RESTful principles and provides endpoints for:

- **Audit Trail Retrieval**: Access comprehensive logs of system activities
- **Compliance Reporting**: Generate standardized compliance reports
- **Activity Filtering**: Query logs with advanced filtering capabilities
- **Export Functionality**: Export audit data in multiple formats
- **Search Operations**: Perform complex searches across audit records

### Base URL Structure
```
/api/v1/audit
```

### Common Response Headers
All responses include standard headers plus audit-specific metadata:
- `X-Audit-Request-ID`: Unique identifier for audit correlation
- `X-Rate-Limit-Remaining`: Remaining requests in current time window
- `X-Data-Volume`: Total number of records matching query (for pagination)

## Authentication & Authorization

### Authentication Methods
The audit API supports multiple authentication methods:

#### JWT Bearer Token Authentication
```http
Authorization: Bearer <jwt_token>
```

#### API Key Authentication
```http
X-API-Key: <your_api_key>
```

### Authorization Levels
Access control is enforced through role-based permissions:

| Role | Read Audit Logs | Generate Reports | Export Data | Delete Records |
|------|----------------|------------------|-------------|----------------|
| Admin | ✅ Full Access | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| Auditor | ✅ Read Only | ✅ Read Only | ✅ CSV/PDF | ❌ No Access |
| Compliance Officer | ✅ Read Only | ✅ Read Only | ✅ CSV/PDF | ❌ No Access |
| User | ❌ No Access | ❌ No Access | ❌ No Access | ❌ No Access |

### Session Requirements
- All audit API calls require active session validation
- Sessions expire after 30 minutes of inactivity
- Concurrent session limits apply per user account
- Failed authentication attempts are logged to audit trail

**Section sources**
- [auth_middleware.py](file://backend/app/middleware/auth.py)
- [main_app.py](file://backend/app/main.py)

## Audit Log Endpoints

### Get Audit Trail
Retrieves a paginated list of audit log entries with optional filtering.

**Endpoint**: `GET /api/v1/audit/trail`

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| page | integer | No | Page number (default: 1) | `page=1` |
| limit | integer | No | Items per page (default: 50, max: 1000) | `limit=100` |
| user_id | string | No | Filter by user ID | `user_id=user_123` |
| action_type | string | No | Filter by action type | `action_type=RESOURCE_CREATE` |
| start_date | string | No | Start date (ISO 8601 format) | `start_date=2024-01-01T00:00:00Z` |
| end_date | string | No | End date (ISO 8601 format) | `end_date=2024-12-31T23:59:59Z` |
| resource_id | string | No | Filter by resource identifier | `resource_id=res_456` |
| severity | string | No | Filter by severity level | `severity=HIGH` |
| status | string | No | Filter by operation status | `status=SUCCESS` |
| sort_by | string | No | Sort field (timestamp, user_id, action_type) | `sort_by=timestamp` |
| sort_order | string | No | Sort order (asc, desc) | `sort_order=desc` |

#### Request Examples

**Basic audit trail retrieval:**
```http
GET /api/v1/audit/trail?page=1&limit=50 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Filtered by user and date range:**
```http
GET /api/v1/audit/trail?user_id=user_123&start_date=2024-01-01T00:00:00Z&end_date=2024-12-31T23:59:59Z HTTP/1.1
```

**Complex filtering with sorting:**
```http
GET /api/v1/audit/trail?action_type=RESOURCE_DELETE&severity=HIGH&sort_by=timestamp&sort_order=desc HTTP/1.1
```

#### Response Schema
```json
{
  "data": [
    {
      "id": "audit_001",
      "timestamp": "2024-01-15T10:30:00Z",
      "user_id": "user_123",
      "username": "john.doe",
      "action_type": "RESOURCE_CREATE",
      "resource_id": "res_456",
      "resource_type": "EC2_INSTANCE",
      "severity": "MEDIUM",
      "status": "SUCCESS",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "request_payload": {...},
        "response_code": 201,
        "duration_ms": 150
      },
      "metadata": {
        "session_id": "sess_789",
        "correlation_id": "corr_abc",
        "environment": "production"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 25,
    "total_records": 1250,
    "per_page": 50,
    "has_next": true,
    "has_previous": false
  },
  "filters_applied": {
    "user_id": "user_123",
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    }
  }
}
```

#### Status Codes
- `200 OK`: Successful retrieval
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded

**Section sources**
- [audit.py](file://backend/app/routers/audit.py)
- [audit_schema.py](file://backend/app/schemas/audit.py)

### Get Single Audit Entry
Retrieves a specific audit log entry by ID.

**Endpoint**: `GET /api/v1/audit/trail/{entry_id}`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entry_id | string | Yes | Unique audit entry identifier |

#### Response Schema
```json
{
  "data": {
    "id": "audit_001",
    "timestamp": "2024-01-15T10:30:00Z",
    "user_id": "user_123",
    "username": "john.doe",
    "action_type": "RESOURCE_CREATE",
    "resource_id": "res_456",
    "resource_type": "EC2_INSTANCE",
    "severity": "MEDIUM",
    "status": "SUCCESS",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "details": {
      "request_payload": {...},
      "response_code": 201,
      "duration_ms": 150,
      "stack_trace": "...",
      "validation_errors": []
    },
    "metadata": {
      "session_id": "sess_789",
      "correlation_id": "corr_abc",
      "environment": "production",
      "region": "us-east-1",
      "account_id": "123456789012"
    }
  }
}
```

**Section sources**
- [audit.py](file://backend/app/routers/audit.py)

## Compliance Report Endpoints

### Generate Compliance Report
Generates a comprehensive compliance report based on specified criteria.

**Endpoint**: `POST /api/v1/audit/compliance/report`

#### Request Body
```json
{
  "report_type": "ACCESS_CONTROL",
  "date_range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "filters": {
    "user_roles": ["admin", "auditor"],
    "action_categories": ["AUTHENTICATION", "AUTHORIZATION"],
    "severity_levels": ["HIGH", "CRITICAL"],
    "resource_types": ["EC2_INSTANCE", "S3_BUCKET"]
  },
  "format": "PDF",
  "include_details": true,
  "summary_only": false
}
```

#### Report Types
| Report Type | Description | Use Case |
|-------------|-------------|----------|
| ACCESS_CONTROL | User access patterns and privilege changes | Security audits |
| DATA_ACCESS | Sensitive data access and modifications | Privacy compliance |
| SYSTEM_CHANGES | Configuration and infrastructure changes | Change management |
| SECURITY_EVENTS | Security incidents and threats | Incident response |
| USER_ACTIVITY | Comprehensive user behavior analysis | Forensic investigation |
| REGULATORY_COMPLIANCE | Regulatory framework specific reports | SOX, HIPAA, GDPR |

#### Response Schema
```json
{
  "report_id": "rpt_20240115_001",
  "status": "GENERATING",
  "estimated_completion": "2024-01-15T11:00:00Z",
  "download_url": "/api/v1/audit/compliance/reports/rpt_20240115_001/download",
  "expires_at": "2024-01-22T11:00:00Z",
  "metadata": {
    "generated_by": "user_123",
    "generation_time_ms": 2500,
    "record_count": 15000,
    "file_size_estimate_mb": 45.2
  }
}
```

### Get Report Status
Checks the status of a generated compliance report.

**Endpoint**: `GET /api/v1/audit/compliance/reports/{report_id}/status`

#### Response Schema
```json
{
  "report_id": "rpt_20240115_001",
  "status": "COMPLETED",
  "progress_percentage": 100,
  "completed_at": "2024-01-15T10:55:00Z",
  "download_ready": true,
  "expires_at": "2024-01-22T11:00:00Z",
  "file_info": {
    "size_bytes": 47382016,
    "format": "PDF",
    "checksum": "sha256:a1b2c3d4e5f6..."
  }
}
```

### Download Report
Downloads a completed compliance report.

**Endpoint**: `GET /api/v1/audit/compliance/reports/{report_id}/download`

#### Response
Binary file download with appropriate content-type headers:
- PDF: `application/pdf`
- CSV: `text/csv`
- JSON: `application/json`
- XML: `application/xml`

**Section sources**
- [audit.py](file://backend/app/routers/audit.py)

## Data Models & Schemas

### Audit Log Entry Model
The core data structure for audit log entries:

```mermaid
classDiagram
class AuditLogEntry {
+string id
+datetime timestamp
+string user_id
+string username
+string action_type
+string resource_id
+string resource_type
+string severity
+string status
+string ip_address
+string user_agent
+object details
+object metadata
+string correlation_id
+string session_id
}
class AuditDetails {
+object request_payload
+integer response_code
+integer duration_ms
+array validation_errors
+string stack_trace
+object additional_context
}
class AuditMetadata {
+string session_id
+string correlation_id
+string environment
+string region
+string account_id
+string tenant_id
+object custom_fields
}
AuditLogEntry --> AuditDetails : contains
AuditLogEntry --> AuditMetadata : contains
```

**Diagram sources**
- [audit_log_model.py](file://backend/app/models/audit_log.py)
- [audit_schema.py](file://backend/app/schemas/audit.py)

### Field Definitions

#### Core Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique audit entry identifier | `audit_001` |
| timestamp | datetime | ISO 8601 formatted timestamp | `2024-01-15T10:30:00Z` |
| user_id | string | Identifier of the acting user | `user_123` |
| username | string | Display name of the user | `john.doe` |
| action_type | string | Type of action performed | `RESOURCE_CREATE` |
| resource_id | string | Identifier of affected resource | `res_456` |
| resource_type | string | Category of resource | `EC2_INSTANCE` |
| severity | string | Severity classification | `HIGH` |
| status | string | Operation outcome | `SUCCESS` |

#### Details Object
| Field | Type | Description |
|-------|------|-------------|
| request_payload | object | Original request data (sanitized) |
| response_code | integer | HTTP response status code |
| duration_ms | integer | Operation duration in milliseconds |
| validation_errors | array | List of validation error messages |
| stack_trace | string | Error stack trace (if applicable) |

#### Metadata Object
| Field | Type | Description |
|-------|------|-------------|
| session_id | string | Associated session identifier |
| correlation_id | string | Cross-service correlation ID |
| environment | string | Deployment environment |
| region | string | Geographic region |
| account_id | string | Cloud account identifier |

**Section sources**
- [audit_log_model.py](file://backend/app/models/audit_log.py)
- [audit_schema.py](file://backend/app/schemas/audit.py)

## Filtering & Search Capabilities

### Advanced Search Syntax
The audit API supports advanced search queries using a structured query language:

#### Basic Operators
- Equality: `field:value`
- Inequality: `field!=value`
- Range: `field>=value`, `field<=value`
- Contains: `field~value`
- Exists: `field:*`

#### Logical Operators
- AND: `query1 AND query2`
- OR: `query1 OR query2`
- NOT: `NOT query`
- Parentheses: `(query1 OR query2) AND query3`

#### Date Range Queries
```
timestamp:[2024-01-01T00:00:00Z TO 2024-12-31T23:59:59Z]
timestamp:>2024-01-01T00:00:00Z
timestamp:<2024-12-31T23:59:59Z
```

#### Complex Query Examples

**Find all failed admin actions in the last 30 days:**
```
user_role:admin AND status:FAILED AND timestamp:[NOW-30DAYS TO NOW]
```

**Search for resource deletions by specific users:**
```
action_type:RESOURCE_DELETE AND user_id:(user_123 OR user_456)
```

**Find high-severity security events:**
```
severity:(HIGH OR CRITICAL) AND action_category:SECURITY
```

**Search within specific time windows:**
```
timestamp:[2024-01-01T00:00:00Z TO 2024-01-31T23:59:59Z] AND resource_type:S3_BUCKET
```

### Performance Considerations for Large Datasets

#### Indexing Strategy
The audit system implements optimized indexing for common query patterns:
- Composite indexes on (timestamp, user_id, action_type)
- Separate indexes for date range queries
- Full-text search indexes for detail fields
- Geospatial indexes for location-based queries

#### Query Optimization
- Automatic query plan optimization
- Result caching for repeated queries
- Streaming responses for large datasets
- Asynchronous processing for complex aggregations

#### Pagination Best Practices
- Always use cursor-based pagination for large result sets
- Implement client-side pagination controls
- Monitor query performance metrics
- Set appropriate timeout values

**Section sources**
- [audit.py](file://backend/app/routers/audit.py)
- [database_config.py](file://backend/app/database.py)

## Performance Optimization

### Query Performance
The audit API is optimized for high-volume scenarios:

#### Database Optimization
- Partitioned tables by date ranges
- Materialized views for common aggregations
- Connection pooling with configurable limits
- Read replicas for analytical queries

#### Caching Strategy
- Redis-backed query result caching
- TTL-based cache invalidation
- Cache warming for frequently accessed data
- Distributed cache coordination

#### Rate Limiting
```python
# Example rate limiting configuration
RATE_LIMITS = {
    'standard': {'requests': 100, 'window': '1h'},
    'premium': {'requests': 1000, 'window': '1h'},
    'admin': {'requests': 10000, 'window': '1h'}
}
```

### Memory Management
- Stream processing for large datasets
- Lazy loading of audit details
- Garbage collection optimization
- Memory usage monitoring and alerts

### Scalability Features
- Horizontal scaling support
- Load balancing across instances
- Stateless API design
- Microservices architecture compatibility

## Security Considerations

### Data Protection
- Encryption at rest for audit data
- TLS encryption in transit
- Field-level encryption for sensitive information
- Secure key management with rotation support

### Access Control
- Multi-factor authentication for audit access
- IP whitelisting for administrative functions
- Session hijacking protection
- Brute force attack prevention

### Audit Integrity
- Cryptographic signing of audit entries
- Tamper detection mechanisms
- Immutable audit storage
- Chain of custody verification

### Compliance Features
- PII data masking
- Data retention policy enforcement
- Automated compliance checks
- Regulatory reporting templates

### Security Headers
All audit API responses include security headers:
```http
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 1; mode=block
```

## Export Capabilities

### Supported Formats
The audit API supports multiple export formats:

| Format | Extension | Description | Use Case |
|--------|-----------|-------------|----------|
| CSV | .csv | Comma-separated values | Spreadsheet analysis |
| JSON | .json | Structured data | Programmatic processing |
| XML | .xml | Extensible markup | Enterprise integration |
| PDF | .pdf | Formatted document | Human-readable reports |
| SQL | .sql | Database insert statements | Data migration |
| Parquet | .parquet | Columnar storage | Big data analytics |

### Export API Endpoints

#### Export Audit Data
**Endpoint**: `POST /api/v1/audit/export`

#### Request Body
```json
{
  "format": "CSV",
  "filters": {
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    },
    "user_ids": ["user_123", "user_456"],
    "action_types": ["RESOURCE_CREATE", "RESOURCE_DELETE"]
  },
  "options": {
    "include_headers": true,
    "max_rows": 1000000,
    "compression": "gzip",
    "encoding": "UTF-8"
  }
}
```

#### Response
```json
{
  "export_id": "exp_20240115_001",
  "status": "PROCESSING",
  "estimated_completion": "2024-01-15T11:05:00Z",
  "download_url": "/api/v1/audit/exports/exp_20240115_001/download",
  "expires_at": "2024-01-22T11:05:00Z",
  "metadata": {
    "format": "CSV",
    "estimated_size_mb": 125.5,
    "record_count": 500000,
    "compression_ratio": 0.3
  }
}
```

### Batch Export Operations
For very large datasets, the API supports batch processing:

#### Create Batch Export
```http
POST /api/v1/audit/export/batch
```

#### Check Batch Status
```http
GET /api/v1/audit/export/batch/{batch_id}/status
```

#### Download Batch Results
```http
GET /api/v1/audit/export/batch/{batch_id}/results
```

## Retention Policies

### Default Retention Schedule
The audit system implements tiered retention policies:

| Tier | Duration | Storage Type | Access Level |
|------|----------|--------------|--------------|
| Hot | 90 days | SSD Storage | Immediate access |
| Warm | 1 year | Standard Storage | Near real-time access |
| Cold | 7 years | Archive Storage | Delayed access (hours) |
| Legal Hold | Indefinite | Immutable Storage | Restricted access |

### Policy Configuration
Retention policies can be configured per organization:

```json
{
  "retention_policy": {
    "default_retention_days": 90,
    "extended_retention_days": 365,
    "legal_hold_enabled": true,
    "auto_archive_after_days": 90,
    "purge_schedule": "monthly",
    "compliance_override": {
      "financial_data": 2555,
      "security_events": 2555,
      "user_activity": 365
    }
  }
}
```

### Data Lifecycle Management
- Automated archival to cold storage
- Intelligent compression algorithms
- Efficient deletion of expired records
- Backup and disaster recovery integration

## Error Handling

### Standard Error Responses
```json
{
  "error": {
    "code": "AUDIT_QUERY_TIMEOUT",
    "message": "Query execution exceeded timeout threshold",
    "details": {
      "timeout_seconds": 30,
      "query_complexity": "high",
      "suggested_action": "Reduce query scope or increase timeout"
    },
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
| Error Code | HTTP Status | Description | Resolution |
|------------|-------------|-------------|------------|
| AUDIT_QUERY_TIMEOUT | 408 | Query took too long | Simplify query or increase timeout |
| AUDIT_RATE_LIMITED | 429 | Too many requests | Wait and retry with backoff |
| AUDIT_PERMISSION_DENIED | 403 | Insufficient privileges | Contact administrator |
| AUDIT_DATA_NOT_FOUND | 404 | No matching records | Adjust filters |
| AUDIT_EXPORT_FAILED | 500 | Export generation failed | Retry or contact support |
| AUDIT_INVALID_FILTER | 400 | Malformed filter syntax | Review filter syntax |

### Retry Logic
Implement exponential backoff for transient errors:
- Initial delay: 1 second
- Maximum retries: 5
- Maximum delay: 60 seconds
- Jitter: Randomized delay component

## Examples

### Complete API Usage Examples

#### Example 1: Retrieve Recent Security Events
```bash
curl -X GET "https://api.example.com/api/v1/audit/trail?action_type=SECURITY_EVENT&severity=HIGH&limit=100&sort_by=timestamp&sort_order=desc" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Accept: application/json"
```

#### Example 2: Generate Monthly Compliance Report
```bash
curl -X POST "https://api.example.com/api/v1/audit/compliance/report" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "REGULATORY_COMPLIANCE",
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "format": "PDF",
    "include_details": true
  }'
```

#### Example 3: Export User Activity Data
```bash
curl -X POST "https://api.example.com/api/v1/audit/export" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "CSV",
    "filters": {
      "user_ids": ["user_123", "user_456"],
      "date_range": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-12-31T23:59:59Z"
      }
    },
    "options": {
      "compression": "gzip",
      "max_rows": 1000000
    }
  }'
```

#### Example 4: Advanced Search Query
```bash
curl -X GET "https://api.example.com/api/v1/audit/trail?q=(action_type:RESOURCE_DELETE OR action_type:CONFIG_CHANGE) AND severity:HIGH AND timestamp:[2024-01-01T00:00:00Z TO 2024-12-31T23:59:59Z]" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Performance Issues
**Problem**: Slow query response times
**Solution**: 
- Optimize query filters
- Use pagination effectively
- Implement query caching
- Consider read replicas for analytical queries

#### Authentication Problems
**Problem**: 401 Unauthorized errors
**Solution**:
- Verify token expiration
- Check permission scopes
- Validate API key format
- Ensure proper header formatting

#### Data Consistency Issues
**Problem**: Missing audit entries
**Solution**:
- Check service health
- Verify database connectivity
- Review replication status
- Monitor queue depths

#### Export Failures
**Problem**: Export generation fails
**Solution**:
- Check available disk space
- Verify memory limits
- Reduce export size
- Use batch processing for large datasets

### Monitoring and Alerting
Key metrics to monitor:
- Query response times (P95, P99)
- Error rates by endpoint
- Database connection pool utilization
- Cache hit ratios
- Export job completion rates

### Debug Tools
Built-in debugging capabilities:
- Request tracing with correlation IDs
- Query performance profiling
- Audit log sampling for analysis
- Health check endpoints

## Conclusion

The Audit Logging API provides a comprehensive solution for tracking, analyzing, and reporting on system activities. With robust filtering capabilities, secure access controls, and scalable architecture, it meets the demands of modern compliance requirements while maintaining optimal performance for large-scale deployments.

The API's design emphasizes security, performance, and usability, making it suitable for organizations requiring detailed audit trails for regulatory compliance, security investigations, and operational insights. The flexible filtering and export capabilities enable both automated processing and manual analysis workflows.

For optimal results, implement proper authentication, use efficient query patterns, leverage caching strategies, and monitor performance metrics. The provided examples and troubleshooting guidance should help ensure successful integration and operation of the audit logging system.