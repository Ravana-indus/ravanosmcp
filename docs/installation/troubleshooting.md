# Troubleshooting Guide - ERPNext MCP Server

This guide helps diagnose and resolve common issues with the ERPNext MCP Server.

## Common Issues and Solutions

### 1. Server Startup Issues

#### Issue: Configuration Validation Failed
```
Error: Configuration validation failed:
ERPNEXT_BASE_URL is required
ERPNEXT_API_KEY appears to be invalid format
```

**Solution:**
1. Check your `.env` file exists and contains all required variables
2. Verify ERPNext URL format: `https://your-domain.com` (no trailing slash)
3. Verify API key format (should be base64 encoded string)
4. Ensure no extra spaces or quotes around values

#### Issue: Port Already in Use
```
Error: listen EADDRINUSE :::3000
```

**Solution:**
1. Change the PORT in your `.env` file
2. Kill the process using the port: `lsof -ti:3000 | xargs kill -9`
3. Use Docker with different port mapping

### 2. ERPNext Connection Issues

#### Issue: ERPNext API Authentication Failed
```
Error: ERPNext API authentication failed - 401 Unauthorized
```

**Solution:**
1. Verify ERPNext API credentials in `.env` file
2. Check ERPNext user has required permissions
3. Ensure ERPNext API is enabled in System Settings
4. Test credentials with curl:
```bash
curl -X GET "https://your-erpnext.com/api/method/frappe.auth.get_logged_user" \
  -H "Authorization: token your-api-key:your-api-secret"
```

#### Issue: ERPNext Server Unreachable
```
Error: connect ECONNREFUSED your-erpnext.com:443
```

**Solution:**
1. Verify ERPNext server is running and accessible
2. Check DNS resolution: `nslookup your-erpnext.com`
3. Test connectivity: `telnet your-erpnext.com 443`
4. Check firewall and network settings
5. Verify SSL certificate is valid

### 3. Docker Deployment Issues

#### Issue: Docker Build Fails
```
Error: failed to solve with frontend dockerfile.v0
```

**Solution:**
1. Update Docker to latest version
2. Check Dockerfile syntax
3. Ensure all required files are present
4. Clear Docker cache: `docker system prune -a`

#### Issue: Container Exits Immediately
```
Status: Exited (1)
```

**Solution:**
1. Check container logs: `docker-compose logs erpnext-mcp-server`
2. Verify environment variables are set correctly
3. Test configuration locally first
4. Check for missing dependencies

### 4. MCP Integration Issues

#### Issue: Tools Not Registered
```
Warning: Some tools failed to register
```

**Solution:**
1. Check server startup logs for specific tool errors
2. Verify all dependencies are installed
3. Check TypeScript compilation errors
4. Review individual tool implementations

#### Issue: Tool Execution Failures
```
Error: Tool execution failed - Invalid parameters
```

**Solution:**
1. Verify input parameter formats match tool schemas
2. Check ERPNext document type requirements
3. Review ERPNext user permissions for specific operations
4. Enable debug logging for detailed error information

### 5. Performance Issues

#### Issue: Slow Response Times
```
Warning: Tool execution took longer than expected
```

**Solution:**
1. Enable Redis caching:
```bash
REDIS_URL=redis://localhost:6379
```
2. Check ERPNext server performance
3. Monitor network latency
4. Review database query performance in ERPNext
5. Optimize ERPNext database indexes

#### Issue: Memory Usage High
```
Error: JavaScript heap out of memory
```

**Solution:**
1. Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 dist/index.js
```
2. Review for memory leaks in custom code
3. Enable garbage collection monitoring
4. Consider horizontal scaling

### 6. Logging and Debugging

#### Enable Debug Logging
```bash
# In .env file
LOG_LEVEL=debug

# Or environment variable
export LOG_LEVEL=debug
```

#### View Logs in Real-time
```bash
# Docker deployment
docker-compose logs -f erpnext-mcp-server

# NPM/Node deployment
npm start 2>&1 | tee server.log

# View specific log file
tail -f /var/log/erpnext-mcp-server.log
```

#### Log Analysis Commands
```bash
# Search for errors
grep "ERROR" server.log

# Count error types
grep "ERROR" server.log | awk '{print $4}' | sort | uniq -c

# Monitor performance
grep "Tool execution time" server.log | tail -20
```

### 7. Health Check Issues

#### Issue: Health Check Failing
```
Health check failed: HTTP 500 Internal Server Error
```

**Solution:**
1. Check if health check port is accessible
2. Verify server is fully initialized
3. Review health check endpoint logs
4. Test health endpoint manually:
```bash
curl http://localhost:3000/health
```

#### Issue: Readiness Check Failing
```
Readiness check failed: ERPNext connection error
```

**Solution:**
1. Verify ERPNext connectivity
2. Check ERPNext API credentials
3. Review network connectivity
4. Test ERPNext API directly

### 8. Security Issues

#### Issue: API Key Exposed in Logs
```
Warning: Sensitive data in logs detected
```

**Solution:**
1. Review logging configuration
2. Enable log sanitization
3. Update log filters to redact sensitive data
4. Rotate exposed API keys immediately

#### Issue: Unauthorized Access Attempts
```
Error: Authentication failed - Invalid credentials
```

**Solution:**
1. Review access logs for suspicious activity
2. Implement rate limiting
3. Update API credentials if compromised
4. Configure fail2ban or similar protection

## Diagnostic Tools

### Health Check Script
```bash
#!/bin/bash
# health_check.sh

echo "=== ERPNext MCP Server Health Check ==="

# Check if server is running
curl -s http://localhost:3000/health || echo "Health check failed"

# Check if ERPNext is accessible
curl -s -I "${ERPNEXT_BASE_URL}" || echo "ERPNext unreachable"

# Check logs for errors
tail -10 server.log | grep ERROR || echo "No recent errors"

echo "=== Health Check Complete ==="
```

### Configuration Validator
```bash
#!/bin/bash
# validate_config.sh

echo "=== Configuration Validation ==="

# Check required environment variables
required_vars="ERPNEXT_BASE_URL ERPNEXT_API_KEY ERPNEXT_API_SECRET"

for var in $required_vars; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set"
  else
    echo "OK: $var is configured"
  fi
done

# Test ERPNext connectivity
curl -s --max-time 10 "$ERPNEXT_BASE_URL/api/method/ping" > /dev/null && \
  echo "OK: ERPNext is reachable" || \
  echo "ERROR: ERPNext is not reachable"

echo "=== Validation Complete ==="
```

## Getting Help

### Log Files to Include
When reporting issues, include:
1. Server startup logs
2. Error messages and stack traces
3. Environment configuration (sanitized)
4. Docker/system logs if applicable
5. Network connectivity test results

### Information to Provide
1. ERPNext MCP Server version
2. Node.js version
3. Operating system and version
4. ERPNext version and configuration
5. Deployment method (Docker, NPM, source)
6. Steps to reproduce the issue

### Support Channels
1. GitHub Issues: Report bugs and feature requests
2. Documentation: Check latest documentation
3. Community Forums: Seek community help
4. Professional Support: Contact for enterprise support

For additional guidance, see:
- [Installation Guide](./README.md)
- [LibreChat Integration](./librechat-integration.md)
- [Security Configuration](./security-checklist.md)
- [Monitoring and Maintenance](./monitoring.md)