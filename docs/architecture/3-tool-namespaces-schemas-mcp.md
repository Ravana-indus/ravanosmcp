# 3) Tool Namespaces & Schemas (MCP)

> **Convention**: `erp.*` (core), `hr.*`, `sales.*`, `purchase.*`, `inventory.*`, `finance.*`

## 3.1 Core Spine (erp)
- `erp.auth.connect { baseUrl, apiKey, apiSecret } → { ok }`
- `erp.auth.whoami {} → { user, roles }`
- `erp.doc.create { doctype, doc } → { name }`
- `erp.doc.get { doctype, name, fields? } → { doc }`
- `erp.doc.list { doctype, filters?, fields?, limit? } → { docs }`
- `erp.doc.update { doctype, name, patch } → { name }`
- `erp.doc.delete { doctype, name } → { ok }`
- `erp.doc.submit { doctype, name } → { ok }`
- `erp.doc.cancel { doctype, name } → { ok }`
- `erp.workflow.action { doctype, name, action } → { state }`
- `erp.child.replace_table { parent_doctype, parent_name, tablefield, rows } → { ok }`
- `erp.link.autocomplete { doctype, txt, limit? } → { options[] }`
- `erp.report.run { report_name, filters? } → { columns[], rows[] }`
- `erp.print.get_pdf { doctype, name, print_format? } → { pdf_base64 }`
- `erp.file.upload { doctype, name, file_base64, filename } → { fileUrl }`
- `erp.comment.add { doctype, name, comment } → { ok }`
- `erp.permissions.check { doctype, action } → { allowed }`
- `erp.txn.preview { doctype, doc } → { valid, issues[] }`
- `erp.bulk.run { operations[] } → { results[], rolledBack? }`

## 3.2 Domain Packs (wrappers over Core)
- **HR**: `hr.check_in`, `hr.check_out`, `hr.get_leave_balance`, `hr.apply_leave`, `hr.get_pending_approvals`, `hr.approve_document`
- **Sales**: `sales.create_lead`, `sales.convert_lead_to_customer`, `sales.create_quotation`, `sales.create_sales_order`, `sales.get_sales_pipeline`
- **Purchase**: `purchase.create_purchase_request`, `purchase.create_purchase_order`, `purchase.receive_purchase_order`
- **Inventory**: `inventory.get_stock_levels`, `inventory.get_low_stock_items`
- **Finance**: `finance.create_sales_invoice`, `finance.record_payment`, `finance.get_outstanding_invoices`, `finance.create_expense_claim`

> Each tool publishes JSON Schema for inputs/outputs; LibreChat can auto-generate UI affordances.

---
