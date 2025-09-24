# 9) Configuration (env)

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
