---
kind: external_dependency
name: Alibaba Cloud ECS (Elastic Compute Service)
slug: alibaba-cloud-ecs
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
    - client_constraint
scope:
    - '**'
source_files:
    - backend/app/services/aliyun_ecs.py
    - backend/app/services/aliyun_vpc.py
    - backend/app/services/settings_service.py
---

### Identity & role
- The project provisions and terminates Alibaba Cloud ECS instances through the `alibabacloud-ecs20140526` SDK v2 package.

### Integration shape
- Instance charge type is fixed to Pay-As-You-Go (`PostPaid`) with public bandwidth billed by traffic (`PayByTraffic`) at 20 Mbps — these constants live in `aliyun_ecs.py` and are not templated per request.
- After `run_instances`, the code polls `describe_instances` up to 24 times (5 s interval) until both private IP and (if requested) public IP are assigned before returning.
- Security groups are listed via the ECS SDK's `DescribeSecurityGroupsRequest` scoped to a VPC; VPC/vSwitch lists come from the separate `alibabacloud-vpc20160428` SDK.

### Client constraints
- Endpoint defaults to `ecs.{region_id}.aliyuncs.com` but can be overridden per tenant via the `api_endpoint` setting key, enabling custom endpoints (e.g. internal VPC endpoint or cross-region proxy).
- Region selection is mandatory and drives both ECS and VPC client construction; there is no multi-region fan-out — one region per deployment.

Verify exact method/params against the official Alibaba Cloud OpenAPI docs for `RunInstances` / `DeleteInstance` / `DescribeInstances` / `DescribeSecurityGroups`.