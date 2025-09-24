# 12) Testing Strategy

- **Unit**: Core helpers, error mapping, schema validators
- **Contract**: Mock ERPNext responses; golden files for tool I/O
- **Integration**: Against a dev ERPNext instance (docker-compose)
- **Performance**: k6/Artillery scenarios for CRUD, stock, sales order
- **Security**: RBAC matrix tests; confirmation-required tests

---
