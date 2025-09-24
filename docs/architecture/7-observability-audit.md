# 7) Observability & Audit

- **Structured Logs**: `{ts, level, requestId, tool, user, params_sanitized, durationMs, ok, code}`
- **Metrics**: counters (calls by tool), histograms (latency), error rates by code
- **Audit**: Append-only; store before/after summaries where safe; link to ERPNext doc name

---
