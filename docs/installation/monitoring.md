# Monitoring and Maintenance Guide

This guide covers monitoring, maintenance, and operational procedures for the ERPNext MCP Server.

## Health Monitoring

### Built-in Health Checks

The ERPNext MCP Server provides several health check endpoints:

#### Basic Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "erpnext-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "uptime": 3600
}
```

#### Readiness Check
```bash
curl http://localhost:3000/health/ready
```

Response:
```json
{
  "status": "ready",
  "service": "erpnext-mcp-server",
  "dependencies": {
    "erpnext": "configured"
  },
  "timestamp": "2025-01-23T10:30:00.000Z"
}
```

### Docker Health Checks

If using Docker, health checks are automatically configured:

```bash
# Check container health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect erpnext-mcp-server | grep -A 10 Health
```

## Logging and Log Analysis

### Log Levels

Configure logging levels based on your environment:

- **Production**: `LOG_LEVEL=info`
- **Development**: `LOG_LEVEL=debug`
- **Troubleshooting**: `LOG_LEVEL=debug`

### Log Structure

Logs are structured in JSON format for easy parsing:

```json
{
  "timestamp": "2025-01-23T10:30:00.000Z",
  "level": "info",
  "service": "erpnext-mcp-server",
  "message": "Tool executed successfully",
  "tool": "hr.checkin",
  "duration": 245,
  "userId": "user123"
}
```

### Log Analysis Commands

```bash
# View recent logs
tail -f erpnext-mcp-server.log

# Count errors by type
grep '"level":"error"' erpnext-mcp-server.log | \
  jq -r '.message' | sort | uniq -c | sort -rn

# Monitor performance
grep '"tool":"' erpnext-mcp-server.log | \
  jq -r '"\(.tool): \(.duration)ms"' | sort

# Find slow operations (>5 seconds)
grep '"duration":' erpnext-mcp-server.log | \
  jq 'select(.duration > 5000)'

# Monitor authentication failures
grep '"message":"Authentication failed"' erpnext-mcp-server.log
```

### Log Rotation

Configure log rotation to prevent disk space issues:

#### Using logrotate (Linux)
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/erpnext-mcp-server << EOF
/var/log/erpnext-mcp-server.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 erpnext erpnext
    postrotate
        docker kill -s SIGUSR1 erpnext-mcp-server 2>/dev/null || true
    endscript
}
EOF
```

#### Using Docker with log drivers
```yaml
# In docker-compose.yml
services:
  erpnext-mcp-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Performance Monitoring

### Key Metrics

Monitor these key performance indicators:

1. **Response Time**: Tool execution duration
2. **Error Rate**: Percentage of failed operations
3. **Throughput**: Operations per second
4. **Memory Usage**: Server memory consumption
5. **CPU Usage**: Server CPU utilization
6. **Disk Usage**: Log file and cache storage

### Performance Commands

```bash
# Monitor system resources
top -p $(pgrep -f "erpnext-mcp-server")

# Memory usage
ps aux | grep erpnext-mcp-server

# Check network connections
netstat -an | grep :3000

# Monitor file descriptors
lsof -p $(pgrep -f "erpnext-mcp-server")
```

### Performance Optimization

#### Enable Redis Caching
```bash
# Add to .env
REDIS_URL=redis://localhost:6379

# Monitor Redis
redis-cli info stats
redis-cli monitor
```

#### Connection Pooling
```bash
# Monitor active connections
netstat -an | grep :443 | grep ESTABLISHED | wc -l

# Check ERPNext server load
curl -s "https://your-erpnext.com/api/method/frappe.utils.get_system_info"
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks
- [ ] Check server health status
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Verify ERPNext connectivity

#### Weekly Tasks
- [ ] Analyze performance metrics
- [ ] Review security logs
- [ ] Update log rotation
- [ ] Check disk space usage
- [ ] Test backup procedures

#### Monthly Tasks
- [ ] Update dependencies
- [ ] Review and rotate API keys
- [ ] Performance optimization review
- [ ] Security vulnerability scan
- [ ] Documentation updates

### Update Procedures

#### NPM Package Updates
```bash
# Check for updates
npm outdated

# Update to latest versions
npm update

# Security audit
npm audit
npm audit fix
```

#### Docker Image Updates
```bash
# Pull latest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d --force-recreate

# Cleanup old images
docker image prune
```

### Backup and Recovery

#### Configuration Backup
```bash
#!/bin/bash
# backup_config.sh

BACKUP_DIR="/backup/erpnext-mcp-server"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup configuration files
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  .env* \
  docker-compose.yml \
  package*.json

# Backup logs (last 7 days)
find . -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/" \;

echo "Backup completed: $BACKUP_DIR/config_$DATE.tar.gz"
```

#### Recovery Procedures
```bash
#!/bin/bash
# restore_config.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.tar.gz>"
  exit 1
fi

# Stop services
docker-compose down

# Restore configuration
tar -xzf "$BACKUP_FILE"

# Start services
docker-compose up -d

echo "Recovery completed from: $BACKUP_FILE"
```

## Alerting and Notifications

### Monitoring Setup with Prometheus

#### Docker Compose with Monitoring
```yaml
version: '3.8'

services:
  erpnext-mcp-server:
    # ... existing configuration
    ports:
      - "3000:3000"
      - "9090:9090"  # Metrics port

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'erpnext-mcp-server'
    static_configs:
      - targets: ['erpnext-mcp-server:9090']
    scrape_interval: 5s
```

### Simple Alerting Scripts

#### Health Check Alert
```bash
#!/bin/bash
# health_alert.sh

HEALTH_URL="http://localhost:3000/health"
WEBHOOK_URL="https://hooks.slack.com/your-webhook-url"

if ! curl -f -s "$HEALTH_URL" > /dev/null; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 ERPNext MCP Server health check failed!"}' \
    "$WEBHOOK_URL"
fi
```

#### Log Error Alert
```bash
#!/bin/bash
# error_alert.sh

ERROR_COUNT=$(grep -c '"level":"error"' erpnext-mcp-server.log | tail -n 100)

if [ "$ERROR_COUNT" -gt 5 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ High error count detected: $ERROR_COUNT errors in last 100 log entries\"}" \
    "$WEBHOOK_URL"
fi
```

### Cron Job Setup
```bash
# Add to crontab (crontab -e)
# Health check every 5 minutes
*/5 * * * * /path/to/health_alert.sh

# Error monitoring every 15 minutes
*/15 * * * * /path/to/error_alert.sh

# Daily log rotation check
0 2 * * * logrotate /etc/logrotate.d/erpnext-mcp-server
```

## Troubleshooting Tools

### Diagnostic Script
```bash
#!/bin/bash
# diagnose.sh

echo "=== ERPNext MCP Server Diagnostics ==="
echo "Date: $(date)"
echo

echo "=== System Information ==="
uname -a
echo "Memory: $(free -h | grep Mem:)"
echo "Disk: $(df -h / | tail -1)"
echo

echo "=== Service Status ==="
if command -v docker &> /dev/null; then
  echo "Docker containers:"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
  echo "Process status:"
  ps aux | grep erpnext-mcp-server | grep -v grep
fi
echo

echo "=== Health Checks ==="
curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "Health check failed"
echo

echo "=== Recent Errors ==="
tail -20 erpnext-mcp-server.log | grep '"level":"error"' | tail -5
echo

echo "=== Network Connectivity ==="
if curl -s -I "${ERPNEXT_BASE_URL}" > /dev/null; then
  echo "ERPNext: ✅ Reachable"
else
  echo "ERPNext: ❌ Not reachable"
fi

echo "=== End Diagnostics ==="
```

### Performance Analysis Script
```bash
#!/bin/bash
# performance_analysis.sh

echo "=== Performance Analysis ==="

echo "=== Top 10 Slowest Operations ==="
grep '"duration":' erpnext-mcp-server.log | \
  jq -r '"\(.timestamp) \(.tool) \(.duration)ms"' | \
  sort -k3 -rn | head -10

echo "=== Tool Usage Statistics ==="
grep '"tool":' erpnext-mcp-server.log | \
  jq -r '.tool' | sort | uniq -c | sort -rn

echo "=== Error Summary ==="
grep '"level":"error"' erpnext-mcp-server.log | \
  jq -r '.message' | sort | uniq -c | sort -rn

echo "=== Performance Trends (Last 24h) ==="
since_date=$(date -d '24 hours ago' -Iseconds)
grep '"timestamp":' erpnext-mcp-server.log | \
  jq -r "select(.timestamp >= \"$since_date\") | \
    \"\(.timestamp | split(\"T\")[0]) \(.tool) \(.duration)\"" | \
  awk '{sum[$1 " " $2]+=$3; count[$1 " " $2]++} \
    END {for (i in sum) print i, sum[i]/count[i] "ms avg"}' | \
  sort
```

## Best Practices

### Operational Excellence
1. **Automate monitoring**: Use scripts and tools for automated monitoring
2. **Document procedures**: Keep maintenance procedures documented
3. **Regular reviews**: Schedule regular system health reviews
4. **Proactive maintenance**: Address issues before they become critical
5. **Capacity planning**: Monitor trends and plan for capacity needs
6. **Incident response**: Have clear incident response procedures

### Monitoring Strategy
1. **Layer monitoring**: Monitor application, system, and network layers
2. **Set baselines**: Establish normal performance baselines
3. **Alert thoughtfully**: Avoid alert fatigue with meaningful alerts
4. **Trend analysis**: Look for performance trends over time
5. **User experience**: Monitor from user perspective
6. **Business metrics**: Track business-relevant metrics

For additional guidance, see:
- [Installation Guide](./README.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Security Configuration](./security-checklist.md)
- [LibreChat Integration](./librechat-integration.md)