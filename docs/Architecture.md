# 🏗️ System Architecture — LibreChat ERPNext Agent MCP

**Owner:** Architect • **Version:** v1.0 • **Scope:** Expanded MVP (Core Spine + HR + Sales + Purchase/Inventory + Finance)

---

## 1) Architecture Summary

```
LibreChat (UI + LLM) ──MCP──▶ ERPNext MCP Server (Node/TS)
                                   │
                                   ├──▶ ERPNext REST API (Frappe)
                                   │
                                   ├──▶ Redis (cache, rate limits, locks)
                                   │
                                   └──▶ Log Sink (Winston→JSON→File/HTTP)
```

**Guiding principles**
- Safety first (RBAC, confirmations, audit) • Predictable latency (<2s for common ops)
- Thin orchestration in MCP; business logic defers to ERPNext; domain packs wrap Core Spine
- Modular tool namespaces; strict schemas; consistent error contract `{code,message,hint}`

---

## 2) Components & Responsibilities

### 2.1 ERPNext MCP Server (Node.js/TypeScript)
- **Framework**: MCP SDK
- **Modules**:
  - **Core Spine**: auth, CRUD, workflow, child tables/links, reports/print, files/comments, permissions/safety
  - **Domain Packs**: `hr`, `sales`, `purchase`, `inventory`, `finance` (compose Core)
  - **Security**: RBAC gate, confirmation guard, PII scrubbing
  - **Caching**: Redis-backed get/list lookups, link autocomplete
  - **Observability**: Winston JSON logs, request IDs, metrics hooks
  - **Error Normalizer**: map ERPNext/Frappe exceptions→canonical error codes

### 2.2 ERPNext (Frappe/ERPNext REST)
- Source of truth for DocTypes, workflow states, permissions matrix

### 2.3 Redis
- Read-through cache (TTL 5–10m), distributed locks (e.g., duplicate check-in window)
- Rate limiting (per user, per tool)

### 2.4 Log/Audit Sink
- Winston→JSON file or HTTP (e.g., ELK/Vector). Immutable audit stream recommended

---

## 3) Tool Namespaces & Schemas (MCP)

> **Convention**: `erp.*` (core), `hr.*`, `sales.*`, `purchase.*`, `inventory.*`, `finance.*`

### 3.1 Core Spine (erp)
- `erp.auth.connect { baseUrl, apiKey, apiSecret } → { ok }`
- `erp.auth.whoami {} → { user, roles }`
- `erp.doc.create { doctype, doc } → { name }`
- `erp.doc.get { doctype, name, fields? } → { doc }`
- `erp.doc.list { doctype, filters?, fields?, limit? } → { docs }`
- `erp.doc.update { doctype, name, patch } → { name }`
- `erp.doc.delete { doctype, name } → { ok }`
- `erp.doc.submit { doctype, name } → { ok }`
- `erp.doc.cancel { doctype, name } → { ok }`
- `erp.workflow.action { doctype, name, action } → { state }`
- `erp.child.replace_table { parent_doctype, parent_name, tablefield, rows } → { ok }`
- `erp.link.autocomplete { doctype, txt, limit? } → { options[] }`
- `erp.report.run { report_name, filters? } → { columns[], rows[] }`
- `erp.print.get_pdf { doctype, name, print_format? } → { pdf_base64 }`
- `erp.file.upload { doctype, name, file_base64, filename } → { fileUrl }`
- `erp.comment.add { doctype, name, comment } → { ok }`
- `erp.permissions.check { doctype, action } → { allowed }`
- `erp.txn.preview { doctype, doc } → { valid, issues[] }`
- `erp.bulk.run { operations[] } → { results[], rolledBack? }`

### 3.2 Domain Packs (wrappers over Core)
- **HR**: `hr.check_in`, `hr.check_out`, `hr.get_leave_balance`, `hr.apply_leave`, `hr.get_pending_approvals`, `hr.approve_document`
- **Sales**: `sales.create_lead`, `sales.convert_lead_to_customer`, `sales.create_quotation`, `sales.create_sales_order`, `sales.get_sales_pipeline`
- **Purchase**: `purchase.create_purchase_request`, `purchase.create_purchase_order`, `purchase.receive_purchase_order`
- **Inventory**: `inventory.get_stock_levels`, `inventory.get_low_stock_items`
- **Finance**: `finance.create_sales_invoice`, `finance.record_payment`, `finance.get_outstanding_invoices`, `finance.create_expense_claim`

> Each tool publishes JSON Schema for inputs/outputs; LibreChat can auto-generate UI affordances.

---

## 4) Error Model & Result Envelope

**Canonical error**: `{ code: string, message: string, hint?: string, details?: any }`

**Common codes**
- Auth: `AUTH_FAILED`
- CRUD: `INVALID_DOCTYPE`, `NOT_FOUND`, `FIELD_ERROR`, `DELETE_NOT_ALLOWED`
- Workflow: `INVALID_ACTION`, `ALREADY_CANCELLED`
- Permission: `PERMISSION_DENIED`
- HR: `NO_ACTIVE_SHIFT`, `INVALID_LEAVE_TYPE`, `LEAVE_OVERLAP`, `ERR_LEAVE_BALANCE`
- Sales/Inventory: `INVALID_ITEM`, `ERR_STOCK`, `ALREADY_CUSTOMER`, `MISSING_FIELD`
- Purchase: `PO_CREATION_FAILED`, `RECEIPT_QTY_ERROR`
- Finance: `FINANCE_INVOICE_ERROR`, `INVALID_PAYMENT_METHOD`
- Integrations: `REPORT_NOT_FOUND`, `INTEGRATION_NOT_AVAILABLE`

**Envelope**
```json
{
  "requestId": "uuid",
  "tool": "sales.create_sales_order",
  "ok": true,
  "data": { "name": "SO-00045" },
  "meta": { "durationMs": 420, "user": "jane@acme", "roles": ["Sales User"] }
}
```
On failure: `ok:false` with `error:{...}`; always log.

---

## 5) Security & RBAC

- **Auth**: Per-user ERPNext API key/secret preferred; service account only for automation
- **RBAC**: Evaluate via `erp.permissions.check` before mutating tools
- **Sensitive Ops**: Require `confirm: true` flag (delete, cancel, finance ops)
- **PII Scrubbing**: Logs redact tokens, salaries, card data; configurable field allow/deny lists
- **Multi-tenancy (optional)**: Isolate by `tenantId`→config & Redis key prefix; never share tokens across tenants
- **Transport**: HTTPS to ERPNext; TLS verification required

---

## 6) Performance, Caching, and Rate Limits

- **Budget**: P50 < 1000ms, P95 < 2000ms for common ops
- **Cache**: Redis read-through for `doc.get`, `doc.list`, links, and stock lookups; TTL 5–10m
- **Invalidation**: On `create/update/delete/submit/cancel`, purge affected keys
- **Rate Limits**: Sliding window per user/tool (e.g., 60/min default; stricter for `bulk.run`)
- **Idempotency**: Request-ID to de-duplicate (`check_in` duplicate window = 5 min)

---

## 7) Observability & Audit

- **Structured Logs**: `{ts, level, requestId, tool, user, params_sanitized, durationMs, ok, code}`
- **Metrics**: counters (calls by tool), histograms (latency), error rates by code
- **Audit**: Append-only; store before/after summaries where safe; link to ERPNext doc name

---

## 8) Deployment Topology

- **Artifact**: Docker image `mcp-librechat-agent`
- **Config**: Twelve-Factor via env vars (see §9)
- **Runtime**: Single stateless container (scale horizontally)
- **Dependencies**: Redis (managed or self-hosted), ERPNext URL(s)
- **Health**: `/healthz` (liveness), `/readyz` (Redis + ERPNext ping)

**ASCII topology**
```
[LibreChat]──MCP──>[MCP Server pods]──REST──>[ERPNext]
                         │
                         ├──TCP──>[Redis]
                         └──HTTP──>[Log Collector]
```

---

## 9) Configuration (env)

```ini
# Core
MCP_PORT=3000
ERP_BASE_URL=https://erp.example.com
# Prefer per-user tokens; service account only if necessary
ERP_API_KEY=
ERP_API_SECRET=

# Redis
REDIS_URL=redis://redis:6379
CACHE_TTL_SECONDS=600

# Security
REQUIRE_CONFIRM_FOR=["erp.doc.delete","erp.doc.cancel","finance.*","purchase.*"]
REDACT_FIELDS=["password","apiSecret","salary","cardNumber"]

# Limits
RATE_DEFAULT_PER_MIN=60
RATE_BULK_PER_MIN=10
CHECKIN_DUP_WINDOW_SEC=300

# Logging
LOG_LEVEL=info
LOG_DEST=file:/var/log/mcp.json
REQUEST_LOG_SAMPLE=1.0
```

---

## 10) Key API Flows (Sequence Sketches)

### 10.1 Sales Order Creation
```
LibreChat → sales.create_sales_order → MCP(Server)
  → permissions.check(Sales Order, create)
  → inventory.get_stock_levels (cached)
  → erp.doc.create("Sales Order", payload)
  → erp.doc.submit("Sales Order", name)
  → log + return {name}
```

### 10.2 HR Check-In (idempotent)
```
LibreChat → hr.check_in → MCP
  → lock(user, 5m) → if exists → error DUP
  → erp.doc.create("Employee Checkin", {...})
  → cache bust user attendance summary
```

---

## 11) Developer Experience & Project Layout

```
/ (repo)
  ├─ src/
  │   ├─ core/
  │   │   ├─ auth.ts
  │   │   ├─ crud.ts
  │   │   ├─ workflow.ts
  │   │   ├─ child_links.ts
  │   │   ├─ reports_print.ts
  │   │   ├─ files_comments.ts
  │   │   ├─ permissions.ts
  │   │   ├─ safety.ts (confirm guard, preview, bulk)
  │   │   └─ error.ts
  │   ├─ packs/
  │   │   ├─ hr.ts
  │   │   ├─ sales.ts
  │   │   ├─ purchase.ts
  │   │   ├─ inventory.ts
  │   │   └─ finance.ts
  │   ├─ adapters/
  │   │   ├─ erpnext_client.ts (REST)
  │   │   └─ redis_cache.ts
  │   ├─ mcp/
  │   │   ├─ schemas/
  │   │   └─ register_tools.ts
  │   └─ observability/
  │       ├─ logger.ts
  │       └─ metrics.ts
  ├─ test/ (unit + integration)
  ├─ docker/
  └─ docs/
```

---

## 12) Testing Strategy

- **Unit**: Core helpers, error mapping, schema validators
- **Contract**: Mock ERPNext responses; golden files for tool I/O
- **Integration**: Against a dev ERPNext instance (docker-compose)
- **Performance**: k6/Artillery scenarios for CRUD, stock, sales order
- **Security**: RBAC matrix tests; confirmation-required tests

---

## 13) Rollout & Migration Plan

1. **M0**: Core Spine complete, read-only tools GA (get/list/report)
2. **M1**: HR + Sales create/submit flows
3. **M2**: Purchase/Inventory + Finance flows
4. **Hardening**: rate limits, audit reviews, dashboards

> Although MVP bundles all packs, ship in guarded flags to allow staged enablement per tenant.

---

## 14) Open Questions / Decisions Needed

- **Per-user vs service account** default? (recommend per-user)
- **Multi-tenancy**: single MCP for multiple ERP sites now or later?
- **Log sink**: file vs HTTP forwarder (Vector/FluentBit)?
- **Print/PDF**: which `print_format` defaults per DocType?

---

## 15) Example JSON Schemas (snippets)

```jsonc
// sales.create_sales_order (input)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["customer", "items"],
  "properties": {
    "customer": { "type": "string" },
    "delivery_date": { "type": "string", "format": "date" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["item_code", "qty"],
        "properties": {
          "item_code": { "type": "string" },
          "qty": { "type": "number", "minimum": 0.001 },
          "rate": { "type": "number", "minimum": 0 }
        }
      }
    }
  }
}
```

```jsonc
// canonical error envelope (output)
{
  "ok": false,
  "error": {
    "code": "ERR_STOCK",
    "message": "Insufficient stock for 2 items",
    "hint": "Check warehouse availability",
    "details": { "missing": ["ITM-001", "ITM-007"] }
  }
}
```

---

## 16) Acceptance Traceability

- All MVP acceptance criteria are mapped to tools and guards:
  - **Latency**: metrics & budgets in §6, perf test in §12
  - **RBAC/Confirm**: §5 security, `REQUIRE_CONFIRM_FOR` env, tests
  - **Audit**: §7 audit fields, immutable sink
  - **Error codes**: §4 canonical map

---

**End of Architecture v1** — ready for PO validation and Dev story implementation.

