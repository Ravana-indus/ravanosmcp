# 🔗 PRD-to-Backlog Traceability Matrix — LibreChat ERPNext Agent MCP

This document maps **PRD v1 requirements** to **backlog stories** for traceability and coverage.

---

## 1. Core Spine (PRD §3)
- **Authenticate & Identify Users** → Story 1 (Authentication & Identity)
- **CRUD on DocTypes** → Stories 2–6 (Create, Get, List, Update, Delete)
- **Workflow transitions** → Stories 7–9 (Submit, Cancel, Take Action)
- **Child tables & Links** → Story 10 (Replace Table, Autocomplete)
- **Reports & Printing** → Story 11 (Reports & PDF)
- **Files & Comments** → Story 12 (Upload, Comment)
- **Permissions & Safety** → Story 13 (RBAC, Preview, Bulk)

---

## 2. HR Pack (PRD §3)
- **Check-in/out** → Stories 14–15 (Check-In, Check-Out)
- **Leave balances** → Story 16 (Leave Balance)
- **Apply for leave** → Story 17 (Apply Leave)
- **Pending approvals** → Story 18 (Pending Approvals)
- **Approve documents** → Story 19 (Approve Document)

---

## 3. Sales Pack (PRD §3)
- **Create/convert leads** → Stories 20–21 (Create Lead, Convert Lead)
- **Quotations** → Story 22 (Create Quotation)
- **Sales Orders** → Story 23 (Create Sales Order)
- **Pipeline tracking** → Story 24 (Sales Pipeline)

---

## 4. Purchase & Inventory Pack (PRD §3)
- **Purchase requests** → Story 25 (Create Purchase Request)
- **Purchase orders** → Story 26 (Create Purchase Order)
- **Goods receipt** → Story 27 (Receive Purchase Order)
- **Stock lookup** → Story 28 (Stock Levels)
- **Low stock alerts** → Story 29 (Low Stock Items)

---

## 5. Finance Pack (PRD §3)
- **Sales invoices** → Story 30 (Create Invoice)
- **Payments** → Story 31 (Record Payment)
- **Outstanding invoices** → Story 32 (Outstanding Invoices)
- **Expense claims** → Story 33 (Expense Claim)

---

## 6. Non-Functional Requirements (PRD §4)
- **Performance (P95 latency < 2s)** → Linked to performance criteria across all CRUD + transactional stories (Stories 2–6, 7–9, 22–23, 26–27, 30–31)
- **Reliability (rollback bulk)** → Story 13 (Permissions & Safety)
- **Security (RBAC, confirmation)** → Stories 7–9, 13, 19, 23, 26, 30–31
- **Audit logging** → Implied across all stories; validated in architecture & test strategy
- **Usability (consistent syntax, clear errors)** → Applied globally across all stories

---

## 7. Success Criteria (PRD §5)
- **Adoption & Productivity goals** → Supported by HR + Sales Packs (Stories 14–24)
- **System Quality (latency, error, uptime)** → Core Spine + Ops Stories (1–13, 22–23, 26–27, 30–31)
- **User Satisfaction (ease, faster approvals)** → HR & Sales Approvals (Stories 17–19, 22–23)

---

## 8. Constraints & Assumptions (PRD §6)
- **Containerized deployment (Docker)** → Implementation constraint (not mapped to story)
- **Redis for caching/rate limits** → Implicit infra dependency, covered in architecture not stories
- **Confirmation prompts** → Stories 7–9, 13, 19, 23, 26, 30–31
- **Redacted logging** → Global requirement; tied to Story 13 (Permissions & Safety)

---

# ✅ Summary
- All **PRD Functional Requirements** are fully covered by **33 backlog stories**.
- **Non-Functional Requirements & Constraints** are tied to system-wide architecture, test strategy, and specific safety/security stories.
- This matrix ensures **traceability from PRD → Backlog → Delivery**.

