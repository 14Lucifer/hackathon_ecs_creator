---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### ECS Template
- Definition：An admin-defined blueprint (up to 6 per system) specifying the image, instance type, disk category/size, and whether a public IP should be attached; users select a template when submitting a resource request.
- Aliases：template、instance template

### Resource Request
- Definition：A user-submitted intent to provision an ECS instance based on a chosen template; limited to 2 concurrent active requests per user, and transitions through pending → approved/rejected states after admin action.
- Aliases：request、resource request

### Approval Cascade
- Definition：The admin workflow where approving a request opens a nested Region → VPC → vSwitch → Security Group selector; the selected network resources are then passed to the ECS `RunInstances` call.
- Aliases：cascade approve、approve modal

### Active Resources
- Definition：The admin view listing currently running ECS instances provisioned by this system, with expandable credential cells showing the generated root password and IPs.
- Aliases：active resources page

### Audit Log
- Definition：Immutable record of all state-changing actions (login, user/template CRUD, request submission, approve/reject/deletion decisions) used for compliance and troubleshooting.
- Aliases：audit log、audit trail

### Settings (System Settings)
- Definition：Global KV store for the system, primarily holding Alibaba Cloud Access Key ID, Access Key Secret (AES-256 encrypted), Region ID, and optional API endpoint override; AK/SK values are masked as `****` in responses.
- Aliases：system settings、settings
