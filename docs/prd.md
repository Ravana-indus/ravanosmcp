# 📋 Product Requirements Document (PRD) — LibreChat ERPNext Agent MCP

---

## 1. Objectives

**Product Objective**  
The LibreChat ERPNext Agent MCP enables employees to perform **all core ERPNext tasks via chat**, eliminating UI friction and reducing ERP training needs. It accelerates adoption of ERPNext, improves employee productivity, and ensures compliance with role-based controls and audit trails.

**Business Outcomes**  
- Reduced ERP training/onboarding costs by **30%**.  
- Increased employee adoption of ERPNext workflows by **50%** in the first 6 months.  
- Reduced time-to-complete for HR and Sales tasks by **40%**.  

**Success Metrics**  
- ✅ 90% of daily ERP tasks supported through chat tools.  
- ✅ P95 response latency under 2s.  
- ✅ <2% functional error rate across all packs.  
- ✅ 100% of operations logged with RBAC + audit compliance.  
- ✅ Employee satisfaction ≥ 4.5/5 for “ease of ERP task execution”.  

---

## 2. Scope

**In-Scope Features**  
- **Core Spine Tools**: Authentication, CRUD, workflow, child tables, links, reports, printing, files, comments, permissions, bulk/safety.  
- **HR Pack**: Check-in/out, leave management, approvals.  
- **Sales Pack**: Lead management, quotations, sales orders, pipeline tracking.  
- **Purchase & Inventory Pack**: Requests, orders, goods receipt, stock lookup, low stock alerts.  
- **Finance Pack**: Sales invoices, payments, outstanding invoices, expense claims.  
- **Audit & Security**: RBAC enforcement, confirmation prompts, structured audit logs.  

**Out-of-Scope (MVP)**  
- External integrations (Calendar, WhatsApp, etc).  
- Analytics dashboards (usage, adoption, performance).  
- Voice & accessibility extensions.  
- AI-powered reasoning or auto-decisions.  
- ERPNext server configuration or schema migrations.  

---

## 3. Functional Requirements

**Core Spine**  
- Authenticate and identify users via ERPNext API key/secret.  
- Perform CRUD operations on ERPNext DocTypes.  
- Support workflow transitions (`submit`, `cancel`, custom actions).  
- Replace child tables and autocomplete link fields.  
- Run ERPNext reports and generate PDFs.  
- Upload files and add comments to documents.  
- Enforce permissions and preview transactions before commit.  
- Support bulk operations with rollback on failure.  

**HR Pack**  
- Record employee check-in/check-out.  
- View leave balances.  
- Apply for leave with type, dates, and reason.  
- Retrieve pending approvals.  
- Approve documents with proper RBAC enforcement.  

**Sales Pack**  
- Create and convert leads into customers.  
- Create quotations and sales orders.  
- Retrieve sales pipeline grouped by status.  

**Purchase & Inventory Pack**  
- Create purchase requests and orders.  
- Receive purchase orders with quantity validation.  
- Lookup stock levels by item and warehouse.  
- Retrieve low-stock items below re-order thresholds.  

**Finance Pack**  
- Create sales invoices.  
- Record payments against invoices.  
- Retrieve outstanding invoices by customer.  
- Create expense claims with validation.  

---

## 4. Non-Functional Requirements

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

## 5. Success Criteria

**Adoption & Productivity**  
- ≥ 50% increase in ERPNext adoption for HR and Sales tasks within 6 months.  
- ≥ 40% reduction in time-to-complete core tasks (leave requests, sales orders, invoices).  
- ≥ 30% reduction in ERPNext training/onboarding costs.  

**System Quality**  
- P95 latency < 2s for CRUD and transactional flows.  
- Error rate < 2% across all domain packs.  
- 100% of actions logged with RBAC and audit details.  
- ≥ 99.9% uptime of MCP service.  

**User Satisfaction**  
- Employee ease-of-use rating ≥ 4.5/5 in post-launch survey.  
- Managers report ≥ 25% faster approval turnaround.  

---

## 6. Constraints & Assumptions

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

