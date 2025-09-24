# ERPNext MCP Server

A production-ready **Model Context Protocol (MCP) Server** for ERPNext integration, enabling AI assistants and applications to interact seamlessly with ERPNext instances through a comprehensive set of tools and domain packs.

[![Docker Build](https://img.shields.io/badge/docker-ready-blue)](./Dockerfile)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](./tsconfig.json)
[![Tests](https://img.shields.io/badge/tests-475%2B-green)](#testing)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## 🚀 Features

### **Core Functionality**
- **Authentication & Authorization** - Secure ERPNext API integration
- **CRUD Operations** - Complete Create, Read, Update, Delete functionality
- **Workflow Management** - Document submission, cancellation, and workflow actions
- **Child Tables & Links** - Complex document relationships and auto-complete
- **File Management** - Attachments, comments, and file operations
- **Reports & Printing** - Document generation and report management
- **Security & Permissions** - Role-based access control and safety checks

### **Domain Packs**
- 🧑‍💼 **HR Pack** - Employee management, attendance, leave management
- 💼 **Sales Pack** - Lead management, quotations, sales orders
- 🛒 **Purchase Pack** - Purchase requests, orders, supplier management
- 💰 **Finance Pack** - Invoicing, payments, expense claims, financial reporting
- 📦 **Inventory Pack** - Item management, stock levels, warehouse operations

### **Production Features**
- 🐳 **Docker Deployment** - Multi-stage optimized containers
- 📊 **Comprehensive Testing** - 475+ tests with integration and performance testing
- 🔒 **Security Hardening** - Non-root containers, input validation
- 📈 **Monitoring & Logging** - Health checks, structured logging
- ⚡ **Performance Optimization** - Redis caching, connection pooling
- 📚 **Complete Documentation** - Architecture, API, and deployment guides

## 🏃‍♂️ Quick Start

### **Prerequisites**
- Node.js 18+ and npm 8+
- Docker and Docker Compose (for containerized deployment)
- Access to an ERPNext instance with API credentials

### **1. Clone and Install**
```bash
git clone https://github.com/Ravana-indus/ravanosmcp.git
cd ravanosmcp
npm install
```

### **2. Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit with your ERPNext credentials
nano .env
```

Required environment variables:
```env
ERPNEXT_URL=https://your-erpnext-instance.com
ERPNEXT_API_KEY=your-api-key
ERPNEXT_API_SECRET=your-api-secret
```

### **3. Quick Test**
```bash
# Run authentication test
npm run test:auth

# Start development server
npm run dev
```

### **4. Docker Deployment (Recommended)**
```bash
# Build and start with Docker Compose
npm run docker:compose

# Check health
curl http://localhost:3000/health
```

## 📋 Installation Methods

### **Method 1: Docker Compose (Recommended)**
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your ERPNext credentials

# 2. Start services
docker-compose up -d

# 3. Verify deployment
curl http://localhost:3000/health
```

### **Method 2: Local Development**
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your settings

# 3. Build and start
npm run build
npm start
```

### **Method 3: PM2 Production**
```bash
# 1. Build production version
npm run build:prod

# 2. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production

# 3. Monitor
pm2 logs erpnext-mcp-server
```

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ERPNEXT_URL` | ERPNext instance URL | - | ✅ |
| `ERPNEXT_API_KEY` | API key from ERPNext | - | ✅ |
| `ERPNEXT_API_SECRET` | API secret from ERPNext | - | ✅ |
| `PORT` | Server port | 3000 | ❌ |
| `NODE_ENV` | Environment mode | development | ❌ |
| `LOG_LEVEL` | Logging level | info | ❌ |
| `REDIS_HOST` | Redis server for caching | localhost | ❌ |
| `ENABLE_CACHE` | Enable Redis caching | true | ❌ |

### **ERPNext Setup**
1. Create API credentials in ERPNext:
   - Go to **Settings** → **API Key**
   - Create new API Key/Secret pair
   - Assign appropriate roles and permissions

2. Required ERPNext permissions:
   - Read/Write access to relevant doctypes
   - Workflow action permissions
   - File attachment permissions

## 🧪 Testing

### **Run Test Suites**
```bash
# All tests
npm test

# Specific domain tests
npm run test:crud        # CRUD operations
npm run test:hr          # HR domain pack
npm run test:sales       # Sales domain pack
npm run test:purchase    # Purchase domain pack
npm run test:finance     # Finance domain pack
npm run test:workflow    # Workflow operations

# Performance tests
npm run test:performance
```

### **Integration Testing**
```bash
# Full integration test with real ERPNext instance
npm run test:integration

# Test specific features
npm run test:auth        # Authentication
npm run test:permissions # Security & permissions
```

## 📊 API Usage Examples

### **Basic CRUD Operations**
```javascript
// Create a customer
const customer = await createDocument('Customer', {
  customer_name: 'Acme Corp',
  customer_type: 'Company',
  territory: 'All Territories'
});

// Read customer data
const customerData = await getDocument('Customer', customer.name);

// List customers with filters
const customers = await listDocuments('Customer', {
  customer_type: 'Company'
}, ['name', 'customer_name', 'territory']);

// Update customer
await updateDocument('Customer', customer.name, {
  mobile_no: '+1-555-0123'
});
```

### **HR Operations**
```javascript
// Employee check-in
await hrCheckIn('Office Building A', 'DEVICE-001');

// Get leave balance
const balance = await getLeaveBalance('Annual Leave');

// Apply for leave
await applyLeave('Annual Leave', '2024-01-15', '2024-01-20', 'Vacation');
```

### **Sales Operations**
```javascript
// Create and convert lead
const lead = await createLead({
  lead_name: 'John Doe',
  company_name: 'Tech Corp',
  email_id: 'john@techcorp.com'
});

await convertLeadToCustomer(lead.name);

// Create quotation
const quotation = await createQuotation('CUST-001', [
  { item_code: 'ITEM-001', qty: 10, rate: 100 }
]);
```

### **Workflow Operations**
```javascript
// Submit document
await submitDocument('Sales Order', 'SO-001');

// Take workflow action
await workflowAction('Leave Application', 'LA-001', 'Approve');

// Cancel document
await cancelDocument('Purchase Order', 'PO-001');
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │    │  MCP Client     │    │  ERPNext MCP    │
│   (Claude, etc) │◄──►│  (LibreChat,    │◄──►│  Server         │
│                 │    │   etc)          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  ERPNext        │
                                              │  Instance       │
                                              │                 │
                                              └─────────────────┘
```

### **Core Components**
- **MCP Tools Registry** - Exposes ERPNext functionality as MCP tools
- **Authentication Layer** - Secure ERPNext API integration
- **Domain Packs** - Specialized business logic for HR, Sales, etc.
- **CRUD Engine** - Generic document operations
- **Workflow Engine** - Document state management
- **Safety & Security** - Input validation and permission checks

## 🚢 Deployment

### **Production Checklist**
- [ ] Configure production environment variables
- [ ] Set up Redis for caching
- [ ] Configure proper logging levels
- [ ] Set up monitoring and health checks
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS termination
- [ ] Configure backup procedures

### **Docker Production Setup**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  erpnext-mcp-server:
    image: erpnext-mcp-server:latest
    environment:
      - NODE_ENV=production
      - ERPNEXT_URL=${ERPNEXT_URL}
      - ERPNEXT_API_KEY=${ERPNEXT_API_KEY}
      - ERPNEXT_API_SECRET=${ERPNEXT_API_SECRET}
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### **Monitoring**
The server provides several monitoring endpoints:
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics (if enabled)
- `GET /status` - Detailed status information

## 🛠️ Development

### **Project Structure**
```
src/
├── core/           # Core functionality
│   ├── auth.ts     # Authentication
│   ├── crud.ts     # CRUD operations
│   └── workflow.ts # Workflow management
├── packs/          # Domain-specific packs
│   ├── hr.ts       # HR operations
│   ├── sales.ts    # Sales operations
│   └── finance.ts  # Finance operations
├── mcp/            # MCP protocol integration
└── config/         # Configuration management

test/               # Test suites
scripts/            # Utility scripts
docs/               # Documentation
```

### **Development Commands**
```bash
# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

### **Adding New Features**
1. Create feature branch: `git checkout -b feature/new-domain-pack`
2. Implement in appropriate `src/packs/` or `src/core/`
3. Add comprehensive tests in `test/`
4. Update documentation
5. Submit pull request

## 🔒 Security

### **Security Features**
- 🔐 **Authentication** - ERPNext API key/secret validation
- 🛡️ **Input Validation** - Comprehensive input sanitization
- 🚫 **Permission Checks** - Role-based access control
- 📝 **Audit Logging** - All operations logged with user context
- 🏗️ **Container Security** - Non-root containers, read-only filesystems

### **Security Best Practices**
- Store API credentials securely (use secrets management)
- Enable HTTPS in production
- Regularly rotate API keys
- Monitor access logs
- Keep dependencies updated

## 📚 Documentation

- [📖 **Complete Documentation**](./docs/) - Architecture, APIs, deployment guides
- [🏗️ **Architecture Guide**](./docs/Architecture.md) - System design and components
- [🚀 **Installation Guide**](./docs/installation/README.md) - Detailed setup instructions
- [🔧 **API Reference**](./docs/api/) - Complete API documentation
- [🐛 **Troubleshooting**](./docs/installation/troubleshooting.md) - Common issues and solutions
- [📊 **Monitoring Guide**](./docs/installation/monitoring.md) - Observability setup

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:
- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/your-username/ravanosmcp.git
cd ravanosmcp

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Ravana-indus/ravanosmcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Ravana-indus/ravanosmcp/discussions)
- 📧 **Email**: support@ravanos.com
- 📚 **Documentation**: [Complete Docs](./docs/)

## 🙏 Acknowledgments

- **ERPNext Community** - For the amazing ERP platform
- **MCP Protocol** - For the model context protocol specification
- **Contributors** - All developers who have contributed to this project

---

**Made with ❤️ by the Ravanos Team**

*For more information, visit our [documentation](./docs/) or [contact us](mailto:support@ravanos.com).*
