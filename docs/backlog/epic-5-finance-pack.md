# Epic 5: Finance Pack

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
