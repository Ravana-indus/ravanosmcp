# 15) Example JSON Schemas (snippets)

```jsonc
// sales.create_sales_order (input)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["customer", "items"],
  "properties": {
    "customer": { "type": "string" },
    "delivery_date": { "type": "string", "format": "date" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["item_code", "qty"],
        "properties": {
          "item_code": { "type": "string" },
          "qty": { "type": "number", "minimum": 0.001 },
          "rate": { "type": "number", "minimum": 0 }
        }
      }
    }
  }
}
```

```jsonc
// canonical error envelope (output)
{
  "ok": false,
  "error": {
    "code": "ERR_STOCK",
    "message": "Insufficient stock for 2 items",
    "hint": "Check warehouse availability",
    "details": { "missing": ["ITM-001", "ITM-007"] }
  }
}
```

---
