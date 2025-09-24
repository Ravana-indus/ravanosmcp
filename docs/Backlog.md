# 📂 Story Backlog Document – LibreChat ERPNext Agent MCP

## Epic 1: Core Spine (System Backbone)

**Story 1: Authentication & Identity**  
As a user of the MCP server, I want to authenticate with ERPNext using API key/secret so that I can securely connect and perform actions.  
**Acceptance Criteria:** Valid key/secret establishes session; invalid returns `{code: "AUTH_FAILED"}`; `erp.auth.whoami` returns user + roles.

**Story 2: CRUD – Create Document**  
As a user, I want to create a document in ERPNext so that I can add new records via chat.  
**Acceptance Criteria:** Valid doctype creates doc; invalid → `{code: "INVALID_DOCTYPE"}`; response includes document ID.

**Story 3: CRUD – Get Document**  
As a user, I want to fetch a document by name so that I can view ERPNext data directly in chat.  
**Acceptance Criteria:** Returns requested fields; missing doc → `{code: "NOT_FOUND"}`.

**Story 4: CRUD – List Documents**  
As a user, I want to list documents with filters so that I can browse ERPNext records.  
**Acceptance Criteria:** Supports filters + limit; empty result → `[]`.

**Story 5: CRUD – Update Document**  
As a user, I want to update a document so that I can modify fields via chat.  
**Acceptance Criteria:** Valid patch updates doc; invalid → `{code: "FIELD_ERROR"}`.

**Story 6: CRUD – Delete Document**  
As a user, I want to delete a document so that I can remove obsolete records.  
**Acceptance Criteria:** Valid doc deletes; protected docs → `{code: "DELETE_NOT_ALLOWED"}`.

**Story 7: Workflow – Submit Document**  
As a user, I want to submit a document so that I can move it to the next workflow state.  
**Acceptance Criteria:** Allowed per workflow; unauthorized → `{code: "PERMISSION_DENIED"}`.

**Story 8: Workflow – Cancel Document**  
As a user, I want to cancel a document so that I can invalidate incorrect records.  
**Acceptance Criteria:** Cancels valid doc; already cancelled → `{code: "ALREADY_CANCELLED"}`.

**Story 9: Workflow – Take Action**  
As a user, I want to perform workflow actions so that I can progress approvals.  
**Acceptance Criteria:** Valid action succeeds; invalid → `{code: "INVALID_ACTION"}`.

**Story 10: Child Tables & Links**  
As a user, I want to replace child tables and autocomplete links so that I can manage complex ERPNext docs.  
**Acceptance Criteria:** Replaces table rows; autocomplete returns matches.

**Story 11: Reports & Printing**  
As a user, I want to run reports and generate PDFs so that I can fetch analytics and share docs.  
**Acceptance Criteria:** Valid reports run; invalid → `{code: "REPORT_NOT_FOUND"}`; PDF ≤ 2s.

**Story 12: Files & Comments**  
As a user, I want to upload files and add comments so that I can enrich ERPNext records.  
**Acceptance Criteria:** Upload succeeds; comment visible in ERPNext.

**Story 13: Permissions & Safety**  
As a user, I want RBAC and safe transaction previews so that I don’t break ERPNext unintentionally.  
**Acceptance Criteria:** Unauthorized → `{code: "PERMISSION_DENIED"}`; preview validates; bulk rollback works.

---

## Epic 2: HR Pack

**Story 14: HR – Check-In**  
As an employee, I want to check in via chat so that my attendance is logged.  
**Acceptance Criteria:** Logs time/location; duplicate within 5 mins rejected.

**Story 15: HR – Check-Out**  
As an employee, I want to check out via chat so that my shift ends properly.  
**Acceptance Criteria:** Ends shift; no active shift → `{code: "NO_ACTIVE_SHIFT"}`.

**Story 16: HR – Leave Balance**  
As an employee, I want to view my leave balance so that I know my available days.  
**Acceptance Criteria:** Returns balance; invalid type → `{code: "INVALID_LEAVE_TYPE"}`.

**Story 17: HR – Apply for Leave**  
As an employee, I want to apply for leave so that I don’t need ERPNext UI.  
**Acceptance Criteria:** Requires type, dates, reason; overlap → `{code: "LEAVE_OVERLAP"}`; insufficient balance → `{code: "ERR_LEAVE_BALANCE"}`; triggers manager approval.

**Story 18: HR – Pending Approvals**  
As a manager, I want to view pending approvals so that I can take action.  
**Acceptance Criteria:** Returns pending docs; empty → `[]`.

**Story 19: HR – Approve Document**  
As a manager, I want to approve HR documents so that workflows can progress.  
**Acceptance Criteria:** Requires permission; unauthorized → `{code: "PERMISSION_DENIED"}`.

---

## Epic 3: Sales Pack

**Story 20: Sales – Create Lead**  
As a sales rep, I want to create a lead so that I can start tracking opportunities.  
**Acceptance Criteria:** Requires name + contact; missing → `{code: "MISSING_FIELD"}`.

**Story 21: Sales – Convert Lead**  
As a sales rep, I want to convert a lead to customer so that I can progress sales.  
**Acceptance Criteria:** Valid lead converts; already customer → `{code: "ALREADY_CUSTOMER"}`.

**Story 22: Sales – Create Quotation**  
As a sales rep, I want to create a quotation so that I can send offers.  
**Acceptance Criteria:** Valid customer + items; invalid → `{code: "INVALID_ITEM"}`.

**Story 23: Sales – Create Sales Order**  
As a sales rep, I want to create a sales order so that I can confirm deals in chat.  
**Acceptance Criteria:** Valid order succeeds; insufficient stock → `{code: "ERR_STOCK"}`; order visible in ERPNext within 2s.

**Story 24: Sales – Sales Pipeline**  
As a sales manager, I want to view the pipeline so that I can track opportunities.  
**Acceptance Criteria:** Returns grouped by status; empty → `[]`.

---

## Epic 4: Purchase & Inventory Pack

**Story 25: Purchase – Create Request**  
As a purchase officer, I want to create a purchase request so that I can initiate procurement.  
**Acceptance Criteria:** Requires item list; invalid → `{code: "INVALID_ITEM"}`.

**Story 26: Purchase – Create Order**  
As a purchase officer, I want to create a purchase order so that I can formalize supplier agreements.  
**Acceptance Criteria:** Supplier exists; delivery date valid; failure → `{code: "PO_CREATION_FAILED"}`.

**Story 27: Purchase – Receive Order**  
As a storekeeper, I want to receive goods against a PO so that stock updates correctly.  
**Acceptance Criteria:** PO must exist & submitted; received qty ≤ ordered; over-receipt → `{code: "RECEIPT_QTY_ERROR"}`.

**Story 28: Inventory – Stock Levels**  
As a storekeeper, I want to check stock levels so that I can plan reordering.  
**Acceptance Criteria:** Returns qty; invalid query → `{code: "INVALID_QUERY"}`.

**Story 29: Inventory – Low Stock Alerts**  
As a storekeeper, I want to see low stock items so that I can trigger reordering.  
**Acceptance Criteria:** Returns low-stock items; empty → `[]`.

---

## Epic 5: Finance Pack

**Story 30: Finance – Create Invoice**  
As a finance officer, I want to create sales invoices so that I can bill customers.  
**Acceptance Criteria:** Valid customer/items required; invalid → `{code: "FINANCE_INVOICE_ERROR"}`.

**Story 31: Finance – Record Payment**  
As a finance officer, I want to record payments so that outstanding balances update.  
**Acceptance Criteria:** Amount ≤ outstanding; invalid method → `{code: "INVALID_PAYMENT_METHOD"}`.

**Story 32: Finance – Outstanding Invoices**  
As a finance officer, I want to view outstanding invoices so that I can track receivables.  
**Acceptance Criteria:** Returns unpaid invoices; empty → `[]`.

**Story 33: Finance – Expense Claim**  
As an employee, I want to file an expense claim so that I can get reimbursed.  
**Acceptance Criteria:** Requires description + amount; total = sum; invalid → `{code: "EXPENSE_CLAIM_ERROR"}`.

---

# ✅ Backlog Summary
- **5 Epics**
- **33 Stories**
- Testable **Acceptance Criteria** included
- Dependencies: Core Spine → prerequisite for all packs