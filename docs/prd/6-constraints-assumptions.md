# 6. Constraints & Assumptions

**Constraints**  
- ERPNext REST API is the single integration surface (no DB access).  
- Deployment must be containerized (Docker).  
- Redis required for caching, locks, and rate-limiting.  
- Service must enforce confirmation prompts for destructive operations.  
- Logging must redact sensitive fields (API secrets, salary, card data).  

**Assumptions**  
- Employees have access to LibreChat and are trained to use chat commands.  
- ERPNext instance(s) are reachable with stable API access.  
- ERPNext workflow rules and permissions are already configured.  
- Organizational buy-in exists for replacing ERP UI interactions with chat workflows.  

---

✅ **PRD v1 Finalized** — ready for architecture, backlog, and sprint planning.

