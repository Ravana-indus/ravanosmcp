# 3. Functional Requirements

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
