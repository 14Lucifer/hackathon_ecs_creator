---
kind: external_dependency
name: Alibaba Cloud VPC (Virtual Private Cloud)
slug: alibaba-cloud-vpc
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
scope:
    - '**'
source_files:
    - backend/app/services/aliyun_vpc.py
---

### Identity & role
- Used exclusively for read-only discovery of VPCs, vSwitches and security groups that appear in the admin approval cascade modal.
- Implemented via the `alibabacloud-vpc20160428` SDK v2 alongside the ECS SDK.

### Integration shape
- Uses the same `AliyunConfig` (AK/SK + region) as the ECS service; no write operations are performed.

Verify exact method/params against the official Alibaba Cloud OpenAPI docs for `DescribeVpcs` / `DescribeVSwitches` / `DescribeSecurityGroups`.