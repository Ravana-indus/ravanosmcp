# 10) Key API Flows (Sequence Sketches)

## 10.1 Sales Order Creation
```
LibreChat → sales.create_sales_order → MCP(Server)
  → permissions.check(Sales Order, create)
  → inventory.get_stock_levels (cached)
  → erp.doc.create("Sales Order", payload)
  → erp.doc.submit("Sales Order", name)
  → log + return {name}
```

## 10.2 HR Check-In (idempotent)
```
LibreChat → hr.check_in → MCP
  → lock(user, 5m) → if exists → error DUP
  → erp.doc.create("Employee Checkin", {...})
  → cache bust user attendance summary
```

---
