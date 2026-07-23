"""Alibaba Cloud DNS (Alidns) wrapper: domain listing and A record lifecycle.

Domains are hosted as Public Zones by the admin outside this system; we only
list them and manage per-instance A records (<instance-name>.<domain>).
"""
from alibabacloud_alidns20150109.client import Client as DnsClient
from alibabacloud_alidns20150109 import models as dns_models
from alibabacloud_tea_openapi import models as open_api_models

from app.services.settings_service import AliyunConfig

_A_RECORD_TTL = 600


def _dns_client(cfg: AliyunConfig) -> DnsClient:
    return DnsClient(
        open_api_models.Config(
            access_key_id=cfg.access_key_id,
            access_key_secret=cfg.access_key_secret,
            region_id=cfg.region_id,
            endpoint="alidns.aliyuncs.com",
        )
    )


def list_domains(cfg: AliyunConfig) -> list[dict]:
    req = dns_models.DescribeDomainsRequest(page_size=100)
    resp = _dns_client(cfg).describe_domains(req)
    domains = resp.body.domains.domain if resp.body.domains else []
    return [{"domain_name": d.domain_name} for d in domains]


def add_a_record(cfg: AliyunConfig, domain_name: str, rr: str, ip: str) -> str:
    """Create <rr>.<domain_name> → ip and return the Alidns record id."""
    req = dns_models.AddDomainRecordRequest(
        domain_name=domain_name,
        rr=rr,
        type="A",
        value=ip,
        ttl=_A_RECORD_TTL,
    )
    resp = _dns_client(cfg).add_domain_record(req)
    return resp.body.record_id


def delete_record(cfg: AliyunConfig, record_id: str) -> None:
    req = dns_models.DeleteDomainRecordRequest(record_id=record_id)
    _dns_client(cfg).delete_domain_record(req)
