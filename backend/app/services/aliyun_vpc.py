"""VPC / vSwitch / Security Group listing via Alibaba Cloud SDK v2.

All lookups used by the approval cascade live here so cloud-side issues
can be debugged in one place.
"""
from alibabacloud_ecs20140526.client import Client as EcsClient
from alibabacloud_ecs20140526 import models as ecs_models
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_vpc20160428.client import Client as VpcClient
from alibabacloud_vpc20160428 import models as vpc_models

from app.services.settings_service import AliyunConfig


def _vpc_client(cfg: AliyunConfig) -> VpcClient:
    return VpcClient(
        open_api_models.Config(
            access_key_id=cfg.access_key_id,
            access_key_secret=cfg.access_key_secret,
            region_id=cfg.region_id,
            endpoint=f"vpc.{cfg.region_id}.aliyuncs.com",
        )
    )


def _ecs_client(cfg: AliyunConfig) -> EcsClient:
    endpoint = cfg.endpoint or f"ecs.{cfg.region_id}.aliyuncs.com"
    return EcsClient(
        open_api_models.Config(
            access_key_id=cfg.access_key_id,
            access_key_secret=cfg.access_key_secret,
            region_id=cfg.region_id,
            endpoint=endpoint,
        )
    )


def list_vpcs(cfg: AliyunConfig) -> list[dict]:
    req = vpc_models.DescribeVpcsRequest(region_id=cfg.region_id, page_size=50)
    resp = _vpc_client(cfg).describe_vpcs(req)
    vpcs = resp.body.vpcs.vpc if resp.body.vpcs else []
    return [
        {"vpc_id": v.vpc_id, "name": v.vpc_name or v.vpc_id, "cidr_block": v.cidr_block}
        for v in vpcs
    ]


def list_vswitches(cfg: AliyunConfig, vpc_id: str) -> list[dict]:
    req = vpc_models.DescribeVSwitchesRequest(
        region_id=cfg.region_id, vpc_id=vpc_id, page_size=50
    )
    resp = _vpc_client(cfg).describe_vswitches(req)
    vsws = resp.body.v_switches.v_switch if resp.body.v_switches else []
    return [
        {
            "vswitch_id": s.v_switch_id,
            "name": s.v_switch_name or s.v_switch_id,
            "zone_id": s.zone_id,
            "cidr_block": s.cidr_block,
        }
        for s in vsws
    ]


def list_security_groups(cfg: AliyunConfig, vpc_id: str) -> list[dict]:
    req = ecs_models.DescribeSecurityGroupsRequest(
        region_id=cfg.region_id, vpc_id=vpc_id, page_size=50
    )
    resp = _ecs_client(cfg).describe_security_groups(req)
    sgs = resp.body.security_groups.security_group if resp.body.security_groups else []
    return [
        {"security_group_id": g.security_group_id, "name": g.security_group_name or g.security_group_id}
        for g in sgs
    ]
