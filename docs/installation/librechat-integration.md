# LibreChat Integration Guide

This guide explains how to integrate the ERPNext MCP Server with LibreChat to enable AI-powered ERPNext operations through conversational interfaces.

## Overview

LibreChat is an open-source ChatGPT clone that supports Model Context Protocol (MCP) servers. By integrating the ERPNext MCP Server with LibreChat, users can:

- Query ERPNext data through natural language
- Create and manage ERPNext documents via chat
- Perform HR, Sales, Purchase, Inventory, and Finance operations
- Access ERPNext workflows and reports conversationally

## Prerequisites

- LibreChat instance (v0.6.0 or higher)
- ERPNext MCP Server installed and running
- Access to LibreChat configuration files

## Configuration Steps

### 1. LibreChat MCP Configuration

Add the ERPNext MCP Server to your LibreChat configuration file (`librechat.yaml`):

```yaml
# MCP Servers Configuration
mcpServers:
  erpnext:
    # For local installation
    command: "erpnext-mcp-server"
    env:
      ERPNEXT_BASE_URL: "https://your-erpnext-instance.com"
      ERPNEXT_API_KEY: "your-api-key-here"
      ERPNEXT_API_SECRET: "your-api-secret-here"
      LOG_LEVEL: "info"

    # For Docker installation
    # command: "docker"
    # args: ["exec", "erpnext-mcp-server", "node", "dist/index.js"]

    # Server metadata
    description: "ERPNext ERP System Integration"
    timeout: 30000
    capabilities:
      - tools
      - resources
```

### 2. Environment Configuration

Ensure your ERPNext MCP Server environment is properly configured:

```bash
# In your .env file
ERPNEXT_BASE_URL=https://your-erpnext-instance.com
ERPNEXT_API_KEY=your-api-key-here
ERPNEXT_API_SECRET=your-api-secret-here
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379  # Optional but recommended
```

### 3. LibreChat Restart

After configuration changes, restart LibreChat:

```bash
# If running with Docker Compose
docker-compose restart

# If running as service
sudo systemctl restart librechat
```

## Available Tools

Once integrated, the following ERPNext tools will be available in LibreChat:

### Core ERP Tools (19 tools)
- **Document Operations**: Create, read, update, delete ERPNext documents
- **Authentication**: User authentication and session management
- **Workflows**: Execute and manage ERPNext workflows
- **Reports**: Generate and access ERPNext reports
- **Files & Comments**: Handle document attachments and comments
- **Permissions**: Manage user permissions and roles

### HR Domain Tools (6 tools)
- **hr.checkin**: Record employee check-ins
- **hr.checkout**: Record employee check-outs
- **hr.get_leave_balance**: Check employee leave balance
- **hr.apply_leave**: Submit leave applications
- **hr.get_pending_approvals**: Get pending HR approvals
- **hr.approve_document**: Approve HR documents

### Sales Domain Tools (5 tools)
- **sales.create_lead**: Create sales leads
- **sales.convert_lead_to_customer**: Convert leads to customers
- **sales.create_quotation**: Create sales quotations
- **sales.create_sales_order**: Create sales orders
- **sales.get_sales_pipeline**: View sales pipeline

### Purchase & Inventory Tools (5 tools)
- **purchase.create_purchase_request**: Create purchase requests
- **purchase.create_purchase_order**: Create purchase orders
- **purchase.receive_purchase_order**: Receive purchase orders
- **inventory.get_stock_levels**: Check inventory stock levels
- **inventory.get_low_stock_items**: Get low stock alerts

### Finance Domain Tools (4 tools)
- **finance.create_sales_invoice**: Create sales invoices
- **finance.record_payment**: Record payments
- **finance.get_outstanding_invoices**: Get outstanding invoices
- **finance.create_expense_claim**: Create expense claims

## Usage Examples

### Example Conversations

**HR Operations:**
```
User: "Check my leave balance"
AI: I'll check your leave balance using the hr.get_leave_balance tool...

User: "Apply for 3 days of vacation leave from January 25th"
AI: I'll submit your vacation leave application using hr.apply_leave...
```

**Sales Operations:**
```
User: "Create a lead for John Smith at ABC Corp, email john@abccorp.com"
AI: I'll create a new sales lead using sales.create_lead...

User: "Show me the current sales pipeline"
AI: Let me fetch the sales pipeline data using sales.get_sales_pipeline...
```

**Inventory Management:**
```
User: "What are the current stock levels for item ABC123?"
AI: I'll check the stock levels using inventory.get_stock_levels...

User: "Show me all items that are running low on stock"
AI: I'll get the low stock items using inventory.get_low_stock_items...
```

## Troubleshooting Integration

### Common Issues

1. **MCP Server Not Found**
   - Verify ERPNext MCP Server is installed and in PATH
   - Check LibreChat configuration syntax
   - Review LibreChat logs for connection errors

2. **Authentication Failures**
   - Verify ERPNext API credentials
   - Check ERPNext API key permissions
   - Ensure ERPNext instance is accessible

3. **Tool Execution Errors**
   - Check ERPNext user permissions for specific operations
   - Review ERPNext MCP Server logs
   - Verify data validation requirements

### Log Analysis

Enable debug logging to troubleshoot issues:

```bash
# In ERPNext MCP Server
LOG_LEVEL=debug

# Check LibreChat logs
docker-compose logs -f librechat

# Check ERPNext MCP Server logs
docker-compose logs -f erpnext-mcp-server
```

## Security Considerations

1. **API Key Security**: Store API keys securely, never in version control
2. **Network Security**: Use HTTPS for all connections
3. **User Permissions**: Configure ERPNext permissions appropriately
4. **Access Control**: Limit LibreChat access to authorized users
5. **Audit Logging**: Monitor tool usage through ERPNext audit logs

## Performance Optimization

1. **Redis Caching**: Enable Redis for improved performance
2. **Connection Pooling**: Configure appropriate connection limits
3. **Rate Limiting**: Implement rate limiting in LibreChat
4. **Resource Monitoring**: Monitor server resources and performance

## Support and Maintenance

- Monitor health check endpoints
- Review logs regularly
- Keep ERPNext MCP Server updated
- Test integrations after ERPNext updates
- Backup configuration files

For additional support, see:
- [Troubleshooting Guide](./troubleshooting.md)
- [Monitoring and Maintenance](./monitoring.md)
- [Security Configuration](./security-checklist.md)