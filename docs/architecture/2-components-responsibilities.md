# 2) Components & Responsibilities

## 2.1 ERPNext MCP Server (Node.js/TypeScript)
- **Framework**: MCP SDK
- **Modules**:
  - **Core Spine**: auth, CRUD, workflow, child tables/links, reports/print, files/comments, permissions/safety
  - **Domain Packs**: `hr`, `sales`, `purchase`, `inventory`, `finance` (compose Core)
  - **Security**: RBAC gate, confirmation guard, PII scrubbing
  - **Caching**: Redis-backed get/list lookups, link autocomplete
  - **Observability**: Winston JSON logs, request IDs, metrics hooks
  - **Error Normalizer**: map ERPNext/Frappe exceptions→canonical error codes

## 2.2 ERPNext (Frappe/ERPNext REST)
- Source of truth for DocTypes, workflow states, permissions matrix

## 2.3 Redis
- Read-through cache (TTL 5–10m), distributed locks (e.g., duplicate check-in window)
- Rate limiting (per user, per tool)

## 2.4 Log/Audit Sink
- Winston→JSON file or HTTP (e.g., ELK/Vector). Immutable audit stream recommended

---
