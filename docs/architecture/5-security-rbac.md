# 5) Security & RBAC

- **Auth**: Per-user ERPNext API key/secret preferred; service account only for automation
- **RBAC**: Evaluate via `erp.permissions.check` before mutating tools
- **Sensitive Ops**: Require `confirm: true` flag (delete, cancel, finance ops)
- **PII Scrubbing**: Logs redact tokens, salaries, card data; configurable field allow/deny lists
- **Multi-tenancy (optional)**: Isolate by `tenantId`→config & Redis key prefix; never share tokens across tenants
- **Transport**: HTTPS to ERPNext; TLS verification required

---
