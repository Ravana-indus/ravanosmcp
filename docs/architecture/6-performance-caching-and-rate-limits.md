# 6) Performance, Caching, and Rate Limits

- **Budget**: P50 < 1000ms, P95 < 2000ms for common ops
- **Cache**: Redis read-through for `doc.get`, `doc.list`, links, and stock lookups; TTL 5–10m
- **Invalidation**: On `create/update/delete/submit/cancel`, purge affected keys
- **Rate Limits**: Sliding window per user/tool (e.g., 60/min default; stricter for `bulk.run`)
- **Idempotency**: Request-ID to de-duplicate (`check_in` duplicate window = 5 min)

---
