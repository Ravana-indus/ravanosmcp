# 4. Non-Functional Requirements

**Performance**  
- P95 response latency < 2 seconds for CRUD and transaction operations.  
- System must scale to 1,000 concurrent chat users.  

**Reliability**  
- 99.9% uptime target for MCP server.  
- Bulk operations must roll back fully on partial failure.  

**Security**  
- RBAC enforced for all operations.  
- Sensitive actions (delete, cancel, finance ops) require confirmation flags.  
- API keys/secrets stored securely; no logging of sensitive credentials.  

**Compliance & Audit**  
- All actions logged with user, timestamp, parameters (sanitized), and outcome.  
- Audit logs must be tamper-proof and immutable.  

**Maintainability**  
- Modular pack design: HR, Sales, Purchase, Inventory, Finance are independent extensions of Core Spine.  
- JSON schemas define tool inputs/outputs for validation and testing.  

**Usability**  
- Chat command syntax should be predictable, concise, and consistent.  
- Error responses must include `{code, message, hint}` for clarity.  

---
