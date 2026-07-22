"""End-to-end API tests covering the core business rules."""
from app.services.settings_service import AliyunConfig

TEMPLATE = {
    "name": "Small Web Server",
    "instance_type": "ecs.g7.large",
    "image_id": "aliyun_3_x64_20G_alibase.vhd",
    "system_disk_category": "cloud_essd",
    "system_disk_size_gb": 40,
    "public_ip_enabled": True,
}


def _create_template(admin_client, name="Small Web Server"):
    resp = admin_client.post("/api/templates", json={**TEMPLATE, "name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()


# --- Auth --------------------------------------------------------------------

def test_login_wrong_password(client):
    resp = client.post(
        "/api/auth/login", json={"email": "admin@system.local", "password": "nope"}
    )
    assert resp.status_code == 401


def test_me_requires_session(client):
    assert client.get("/api/auth/me").status_code == 401


def test_login_and_me(admin_client):
    resp = admin_client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


# --- Templates ---------------------------------------------------------------

def test_max_six_templates(admin_client):
    for i in range(6):
        _create_template(admin_client, name=f"T{i}")
    resp = admin_client.post("/api/templates", json={**TEMPLATE, "name": "T7"})
    assert resp.status_code == 400
    assert "max 6" in resp.json()["detail"]


def test_template_crud_requires_admin(user_client):
    assert user_client.post("/api/templates", json=TEMPLATE).status_code == 403
    # but users can list templates
    assert user_client.get("/api/templates").status_code == 200


# --- Requests ----------------------------------------------------------------

def test_request_limit_two_active(admin_client, user_client):
    tpl = _create_template(admin_client)
    for _ in range(2):
        resp = user_client.post("/api/requests", json={"template_id": tpl["id"]})
        assert resp.status_code == 201
    resp = user_client.post("/api/requests", json={"template_id": tpl["id"]})
    assert resp.status_code == 400
    assert "maximum of 2 active requests" in resp.json()["detail"]


def test_pending_request_hides_details(admin_client, user_client):
    tpl = _create_template(admin_client)
    user_client.post("/api/requests", json={"template_id": tpl["id"]})
    mine = user_client.get("/api/requests/mine").json()
    assert mine[0]["status"] == "pending"
    assert mine[0]["password"] is None
    assert mine[0]["public_ip"] is None


# --- Approval flow (Alibaba Cloud mocked) ------------------------------------

def _mock_cloud(monkeypatch):
    monkeypatch.setattr(
        "app.services.approval.get_aliyun_config",
        lambda db: AliyunConfig("", "ak", "sk", "cn-hangzhou"),
    )
    created = []

    def fake_create(cfg, template, instance_name, password, vswitch_id, security_group_id):
        created.append(instance_name)
        return {
            "instance_id": f"i-test{len(created)}",
            "public_ip": "47.1.2.3",
            "private_ip": "192.168.0.10",
        }

    monkeypatch.setattr("app.services.approval.aliyun_ecs.create_instance", fake_create)
    deleted = []
    monkeypatch.setattr(
        "app.services.approval.aliyun_ecs.delete_instance",
        lambda cfg, iid: deleted.append(iid),
    )
    return created, deleted


def _approve(admin_client, ids):
    return admin_client.post(
        "/api/approvals/approve",
        json={
            "request_ids": ids,
            "vpc_id": "vpc-1",
            "vswitch_id": "vsw-1",
            "security_group_id": "sg-1",
        },
    )


def test_approve_flow(admin_client, user_client, monkeypatch):
    _mock_cloud(monkeypatch)
    tpl = _create_template(admin_client)
    req = user_client.post("/api/requests", json={"template_id": tpl["id"]}).json()

    pending = admin_client.get("/api/approvals/pending").json()
    assert len(pending) == 1

    result = _approve(admin_client, [req["id"]]).json()
    assert result["succeeded"] == 1 and result["failed"] == 0

    # User now sees full details with instance name Alice_1
    mine = user_client.get("/api/requests/mine").json()[0]
    assert mine["status"] == "approved"
    assert mine["instance_name"] == "Alice_1"
    assert mine["public_ip"] == "47.1.2.3"
    assert len(mine["password"]) == 16

    # Active resources + audit log
    active = admin_client.get("/api/active-resources").json()
    assert len(active) == 1 and active[0]["password"] == mine["password"]
    audit = admin_client.get("/api/audit").json()
    assert audit[0]["action"] == "approve"


def test_partial_batch_failure(admin_client, user_client, monkeypatch):
    _mock_cloud(monkeypatch)
    tpl = _create_template(admin_client)
    ids = [
        user_client.post("/api/requests", json={"template_id": tpl["id"]}).json()["id"]
        for _ in range(2)
    ]

    calls = {"n": 0}

    def flaky_create(cfg, template, instance_name, password, vswitch_id, security_group_id):
        calls["n"] += 1
        if calls["n"] == 2:
            raise RuntimeError("InvalidInstanceType.NotSupported")
        return {"instance_id": "i-ok", "public_ip": None, "private_ip": "192.168.0.11"}

    monkeypatch.setattr("app.services.approval.aliyun_ecs.create_instance", flaky_create)

    result = _approve(admin_client, ids).json()
    assert result["succeeded"] == 1 and result["failed"] == 1
    assert "InvalidInstanceType" in result["results"][1]["error"]


def test_reject_flow(admin_client, user_client, monkeypatch):
    _mock_cloud(monkeypatch)
    tpl = _create_template(admin_client)
    req = user_client.post("/api/requests", json={"template_id": tpl["id"]}).json()

    resp = admin_client.post(
        "/api/approvals/reject", json={"request_ids": [req["id"]], "reason": "No budget"}
    )
    assert resp.json()["succeeded"] == 1

    mine = user_client.get("/api/requests/mine").json()[0]
    assert mine["status"] == "rejected"
    assert mine["reject_reason"] == "No budget"
    assert mine["is_active"] is False


def test_deletion_flow(admin_client, user_client, monkeypatch):
    _, deleted = _mock_cloud(monkeypatch)
    tpl = _create_template(admin_client)
    req = user_client.post("/api/requests", json={"template_id": tpl["id"]}).json()
    _approve(admin_client, [req["id"]])

    # user requests deletion — still counts as active
    resp = user_client.post(f"/api/requests/{req['id']}/request-deletion")
    assert resp.json()["status"] == "delete_pending"
    assert resp.json()["is_active"] is True

    # admin denies -> reverts to approved
    admin_client.post("/api/approvals/deletions/reject", json={"request_ids": [req["id"]]})
    assert user_client.get("/api/requests/mine").json()[0]["status"] == "approved"

    # request again and approve -> instance terminated, request deleted
    user_client.post(f"/api/requests/{req['id']}/request-deletion")
    admin_client.post("/api/approvals/deletions/approve", json={"request_ids": [req["id"]]})
    mine = user_client.get("/api/requests/mine").json()[0]
    assert mine["status"] == "deleted" and mine["is_active"] is False
    assert deleted == ["i-test1"]


# --- Users & settings ---------------------------------------------------------

def test_user_management(admin_client):
    resp = admin_client.post(
        "/api/users", json={"email": "bob@example.com", "name": "Bob", "password": "pass1234"}
    )
    assert resp.status_code == 201
    # duplicate email rejected
    resp = admin_client.post(
        "/api/users", json={"email": "bob@example.com", "name": "Bob2", "password": "x"}
    )
    assert resp.status_code == 409


def test_settings_masking(admin_client):
    resp = admin_client.put(
        "/api/settings",
        json={
            "api_endpoint": "ecs.cn-hangzhou.aliyuncs.com",
            "access_key_id": "LTAI-example",
            "access_key_secret": "super-secret",
            "region_id": "cn-hangzhou",
        },
    )
    body = resp.json()
    assert body["access_key_id"] == "****"
    assert body["access_key_secret"] == "****"
    assert body["region_id"] == "cn-hangzhou"


def test_admin_password_change_invalidates_session(admin_client):
    resp = admin_client.post(
        "/api/settings/admin-password",
        json={"current_password": "admin123", "new_password": "newpass456"},
    )
    assert resp.status_code == 200
    # old session no longer valid
    assert admin_client.get("/api/auth/me").status_code == 401
