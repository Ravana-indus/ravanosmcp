# Epic 1: Core Spine (System Backbone)

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
