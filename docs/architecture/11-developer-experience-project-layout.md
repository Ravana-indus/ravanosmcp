# 11) Developer Experience & Project Layout

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
