# 8) Deployment Topology

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
