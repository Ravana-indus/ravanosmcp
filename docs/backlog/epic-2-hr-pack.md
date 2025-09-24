# Epic 2: HR Pack

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
