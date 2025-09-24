# 1) Architecture Summary

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
