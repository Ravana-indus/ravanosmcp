# 4) Error Model & Result Envelope

**Canonical error**: `{ code: string, message: string, hint?: string, details?: any }`

**Common codes**
- Auth: `AUTH_FAILED`
- CRUD: `INVALID_DOCTYPE`, `NOT_FOUND`, `FIELD_ERROR`, `DELETE_NOT_ALLOWED`
- Workflow: `INVALID_ACTION`, `ALREADY_CANCELLED`
- Permission: `PERMISSION_DENIED`
- HR: `NO_ACTIVE_SHIFT`, `INVALID_LEAVE_TYPE`, `LEAVE_OVERLAP`, `ERR_LEAVE_BALANCE`
- Sales/Inventory: `INVALID_ITEM`, `ERR_STOCK`, `ALREADY_CUSTOMER`, `MISSING_FIELD`
- Purchase: `PO_CREATION_FAILED`, `RECEIPT_QTY_ERROR`
- Finance: `FINANCE_INVOICE_ERROR`, `INVALID_PAYMENT_METHOD`
- Integrations: `REPORT_NOT_FOUND`, `INTEGRATION_NOT_AVAILABLE`

**Envelope**
```json
{
  "requestId": "uuid",
  "tool": "sales.create_sales_order",
  "ok": true,
  "data": { "name": "SO-00045" },
  "meta": { "durationMs": 420, "user": "jane@acme", "roles": ["Sales User"] }
}
```
On failure: `ok:false` with `error:{...}`; always log.

---
