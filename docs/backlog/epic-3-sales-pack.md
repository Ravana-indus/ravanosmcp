# Epic 3: Sales Pack

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
