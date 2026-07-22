"""ECS instance lifecycle via Alibaba Cloud SDK v2 (RunInstances / DeleteInstance)."""
import time

from alibabacloud_ecs20140526 import models as ecs_models

from app.models.template import EcsTemplate
from app.services.aliyun_vpc import _ecs_client
from app.services.settings_service import AliyunConfig

# Fixed constants applied to every instance (not configurable per template)
INSTANCE_CHARGE_TYPE = "PostPaid"        # Pay-As-You-Go
INTERNET_CHARGE_TYPE = "PayByTraffic"
PUBLIC_BANDWIDTH_MBPS = 20

_IP_POLL_ATTEMPTS = 24
_IP_POLL_INTERVAL_SECONDS = 5


def create_instance(
    cfg: AliyunConfig,
    template: EcsTemplate,
    instance_name: str,
    password: str,
    vswitch_id: str,
    security_group_id: str,
) -> dict:
    """Create one ECS instance from a template and return its id and IPs."""
    client = _ecs_client(cfg)
    req = ecs_models.RunInstancesRequest(
        region_id=cfg.region_id,
        image_id=template.image_id,
        instance_type=template.instance_type,
        security_group_id=security_group_id,
        v_switch_id=vswitch_id,
        instance_name=instance_name,
        password=password,
        instance_charge_type=INSTANCE_CHARGE_TYPE,
        amount=1,
        system_disk=ecs_models.RunInstancesRequestSystemDisk(
            category=template.system_disk_category,
            size=str(template.system_disk_size_gb),
        ),
    )
    if template.public_ip_enabled:
        req.internet_charge_type = INTERNET_CHARGE_TYPE
        req.internet_max_bandwidth_out = PUBLIC_BANDWIDTH_MBPS

    resp = client.run_instances(req)
    instance_id = resp.body.instance_id_sets.instance_id_set[0]

    public_ip, private_ip = _wait_for_ips(cfg, instance_id, template.public_ip_enabled)
    return {"instance_id": instance_id, "public_ip": public_ip, "private_ip": private_ip}


def _wait_for_ips(cfg: AliyunConfig, instance_id: str, expect_public: bool):
    """Poll DescribeInstances until IP addresses are assigned (or time out)."""
    client = _ecs_client(cfg)
    public_ip, private_ip = None, None
    for _ in range(_IP_POLL_ATTEMPTS):
        req = ecs_models.DescribeInstancesRequest(
            region_id=cfg.region_id, instance_ids=f'["{instance_id}"]'
        )
        resp = client.describe_instances(req)
        instances = resp.body.instances.instance if resp.body.instances else []
        if instances:
            inst = instances[0]
            if inst.vpc_attributes and inst.vpc_attributes.private_ip_address:
                ips = inst.vpc_attributes.private_ip_address.ip_address
                private_ip = ips[0] if ips else None
            if inst.public_ip_address and inst.public_ip_address.ip_address:
                public_ip = inst.public_ip_address.ip_address[0]
            elif inst.eip_address and inst.eip_address.ip_address:
                public_ip = inst.eip_address.ip_address
            if private_ip and (public_ip or not expect_public):
                break
        time.sleep(_IP_POLL_INTERVAL_SECONDS)
    return public_ip, private_ip


def delete_instance(cfg: AliyunConfig, instance_id: str) -> None:
    """Terminate an instance (ForceStop=true so running instances are killed)."""
    client = _ecs_client(cfg)
    req = ecs_models.DeleteInstanceRequest(instance_id=instance_id, force=True)
    client.delete_instance(req)
