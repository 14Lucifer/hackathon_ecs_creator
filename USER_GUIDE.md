# User Guide — ECS Resource Request & Approval System

This guide explains how to use the system as an **end user** (requesting ECS
resources) and as an **administrator** (managing templates, users, and approvals).

---

## 1. Signing In

Open the system URL in your browser (e.g., `http://<server-address>/`) and sign
in with the email and password provided by your administrator.

- Sessions last **24 hours**; after that you are redirected back to the login page.
- Where you land depends on your role:
  - **User** → the User Portal (*My ECS Resources*)
  - **Admin** → the Admin Portal (*Approval Management*)

> The default administrator account is `admin@system.local` / `admin123`.
> Administrators should change this password immediately (see [Settings](#27-settings)).

---

## 2. User Portal

### 2.1 Submitting a Resource Request

1. In **New Resource Request**, open the dropdown and select an ECS template.
   Each entry shows the key specs: instance type, disk category/size, and
   whether a public IP is included.
2. Click **Submit Request**.
3. The request appears under **My Active Requests** with a *Pending Approval* badge.

**Limit**: you may have at most **2 active requests** at any time. A request is
"active" while it is *pending*, *approved*, or *pending deletion*. If you are at
the limit, you will see:

> "You have reached the maximum of 2 active requests. Delete an existing request
> to submit a new one."

### 2.2 Request Statuses

| Badge | Meaning | What you see |
|-------|---------|--------------|
| **Pending Approval** | Waiting for admin review | Template name and submit time only — no instance details |
| **Approved** | Instance is running | Full connection details (see below) |
| **Rejected** | Admin declined the request | The admin's rejection reason |
| **Deletion Pending** | You requested deletion; awaiting admin decision | Details remain visible; still counts toward your limit |
| **Deleted** | Instance terminated | Row remains in history as *Inactive* |
| **Removed by Admin** | An admin removed the resource directly | Row remains in history as *Inactive*; the admin's remark (if any) appears in the Remark column |

### 2.3 Accessing an Approved Instance

Approved requests show a credentials panel:

- **Public Domain Name**: `<instance-name>.<domain>` (e.g. `luke-1.demo.com`) — a DNS
  A record created at approval, pointing at the public IP (or the private IP when
  the template has no public IP)
- **Domain Access**: `root@<fqdn>` — the preferred connection string
- **Public Access**: `root@<public-ip>` (only when the template includes a public IP)
- **Private Access**: `root@<private-ip>`
- **Password**: hidden by default — click the **eye icon** to reveal the
  auto-generated 16-character root password

Connect via SSH, for example:

```bash
ssh root@luke-1.demo.com     # or ssh root@<public-ip>
```

### 2.4 Requesting Deletion

1. On an approved resource, click **Request Deletion**.
2. The status changes to *Deletion Pending*. The request **still counts** toward
   your 2-active limit until the admin acts.
3. If the admin **approves**, the cloud instance is terminated and the request
   becomes *Deleted* (no longer counts toward your limit).
4. If the admin **denies**, the request reverts to *Approved* and the instance
   keeps running.

### 2.5 Request History

The **Request History** table lists every request you have ever submitted, with
its status, an **Active / Inactive** tag, and a **Remark** column:

- **Active** = pending, approved, or deletion pending
- **Inactive** = deleted, rejected, or removed by admin
- **Remark** = the admin's rejection reason (for *Rejected*) or removal remark
  (for *Removed by Admin*), when provided

---

## 3. Admin Portal

The admin portal uses a left sidebar with six sections.

### 3.1 Approvals

The landing page shows two queues plus summary cards (pending count, deletion
requests, current selection).

**Approving resource requests**

1. Click **Approve** on a single row, or tick checkboxes and click
   **Batch Approve (n)**.
2. A step-by-step modal opens:
   - **Step 1 — Region ID**: read-only, taken from Settings.
   - **Step 2 — VPC**: click **Fetch VPCs**, then pick one from the dropdown.
   - **Step 3 — vSwitch**: unlocked after a VPC is selected; click
     **Fetch vSwitches** (filtered by the chosen VPC).
   - **Step 4 — Security Group**: unlocked after a vSwitch is selected; click
     **Fetch Security Groups**.
   - **Step 5 — Domain**: unlocked after a security group is selected; click
     **Fetch Domains** to list the public zones hosted on Alibaba Cloud DNS and
     pick the zone for the instances' A records.
   - **Step 6 — Confirm Approve**: appears once all selections are made.
3. On confirm, the system calls the Alibaba Cloud `RunInstances` API for each
   request **sequentially**. Every instance gets:
   - Pay-As-You-Go billing, `root` user, an auto-generated 16-character password
   - Instance name `<user-name>-<sequence>` — the display name is lowercased
     and spaces/punctuation become single hyphens (per-user counter starting
     at 1, e.g. "Phyo Hein Pyae" → `phyo-hein-pyae-1`)
   - Public IP with Pay-By-Traffic / 20 Mbps bandwidth, if enabled in the template
   - A DNS **A record** `<instance-name>.<domain>` (e.g. `luke-1.demo.com`)
     pointing at the public IP — or the private IP when the template has no
     public IP
4. A result summary is shown, e.g. *"3 approved successfully, 2 failed"* with a
   per-request error message for each failure. **Partial success is preserved** —
   requests that succeeded stay approved even if later ones fail; failed
   requests remain pending and can be retried.
5. If the DNS record cannot be created, the just-created instance is
   **rolled back (terminated)** and the request stays pending, so an approved
   request always has both a running instance and a valid domain name.

**Rejecting resource requests**

Click **Reject** (or **Batch Reject**), enter a **rejection reason** (required),
and confirm. The reason is shown to the requesting user.

**Deletion requests**

The lower table lists resources whose owners asked for deletion:

- **Approve Deletion** → calls `DeleteInstance` (force-stop), deletes the
  instance's DNS A record, and marks the request *Deleted*. If the record
  cleanup fails, the deletion still completes and a warning tells you which
  record to remove manually.
- **Deny** → the request reverts to *Approved*; the instance keeps running.

All Alibaba Cloud calls show a *"Calling Alibaba Cloud API..."* spinner; API
failures appear in a dismissible red error banner.

### 3.2 ECS Templates

Templates define what users can request. **Maximum 6 templates** — at the limit
the *Create Template* button is disabled with a tooltip.

Form fields:

| Field | Notes |
|-------|-------|
| Template Name | Display name shown to users |
| Instance Type | e.g. `ecs.g7.large` |
| Image ID | Alibaba Cloud image ID |
| System Disk Category | `cloud_essd`, `cloud_ssd`, or `cloud_efficiency` |
| System Disk Size (GB) | Minimum 20 |
| Public IP | Enable/disable toggle |

Fixed constants (applied automatically, not shown in the form): Pay-As-You-Go
billing, `root` username, auto-generated password, instance naming scheme, and
20 Mbps Pay-By-Traffic bandwidth when public IP is enabled. The **region is not
per-template** — it comes from Settings.

Templates referenced by active requests cannot be deleted.

### 3.3 Users

- **Create User**: email (must be unique), name, and password.
- **Edit**: change a user's name and/or password (changing the password logs
  that user out everywhere).
- **Disable / Enable**: disabled users cannot sign in; the admin account cannot
  be disabled.
- **Batch Upload (Excel)**:
  1. Click **Download Template** to get an `.xlsx` with columns *Email, Name, Password*.
  2. Fill it in and use **Batch Upload (Excel)**.
  3. Upsert logic: if the email **already exists**, its name and password are
     **overwritten**; **new** emails are **appended** as new users.
  4. Rows with missing fields are reported as errors and skipped.

### 3.4 Active Resources

A live overview of every *approved* (running) instance: owner, template,
instance name, and an expandable **Credential** cell (click **View**) showing
the public domain name, domain/IP access strings, and the password behind an
eye-icon toggle.

**Remove**: each row has a **Remove** action that terminates the instance
(force-stop), deletes its DNS A record, and sets the request status to
*Removed by Admin* on the user side — no user deletion request needed. The
modal accepts an **optional remark** that the user sees in their Request
History (e.g. "Removed during cost cleanup"). Removals are recorded in the
Audit Log with the **Remove** action, and the freed slot no longer counts
toward the user's 2-active limit.

### 3.5 Audit Log

A read-only record of every approve/reject/remove action: timestamp, action,
affected user, template, acting admin, and remark (rejection reason or removal
remark, if any). Sortable by timestamp and filterable by action type.

### 3.6 Settings

| Field | Notes |
|-------|-------|
| API Endpoint | Optional custom ECS endpoint (defaults to `ecs.<region>.aliyuncs.com`) |
| Access Key ID | Stored **encrypted (AES-256)**; displayed as `****` once saved |
| Access Key Secret | Stored **encrypted (AES-256)**; displayed as `****` once saved |
| Region ID | Used globally for **all** Alibaba Cloud API calls (e.g. `cn-hangzhou`) |

The same AccessKey is used for ECS, VPC **and DNS (Alidns)** calls, so it must
also be allowed to manage the public zones used in approvals. The domain
itself must already be hosted on Alibaba Cloud DNS — the system lists existing
zones but never creates them.

Leaving a `****` mask untouched keeps the stored secret; typing a new value
replaces it.

**Change Admin Password**: requires the current password. Changing it
immediately **invalidates all admin sessions**, including your own — you will be
returned to the login page.

---

## 4. Tips & Troubleshooting

- **"Alibaba Cloud credentials are not configured"** — an admin must fill in
  Access Key ID/Secret and Region ID under Settings before any approval.
- **Approval fails with a cloud API error** — the error message from Alibaba
  Cloud is shown per request (e.g. unsupported instance type in the selected
  zone, out-of-stock, insufficient quota). Fix the cause and approve again; the
  request stays pending.
- **Session expired** — sign in again; sessions last 24 hours.
- **Can't submit a request** — check whether you already have 2 active
  requests; request deletion of one and wait for admin approval.
