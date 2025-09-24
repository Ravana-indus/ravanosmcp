# Epic 4: Purchase & Inventory Pack

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
