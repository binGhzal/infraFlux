# Monitoring Documentation

Comprehensive observability and alerting documentation for InfraFlux.

## 📊 Monitoring Stack Overview

InfraFlux implements a **complete observability stack** with metrics, logs, traces, and alerting:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards  
- **Loki**: Log aggregation and analysis
- **AlertManager**: Alert routing and notifications
- **Hubble UI**: Network observability

## 🎯 Quick Access

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana** | http://grafana.local.cluster | Dashboards and visualization |
| **Prometheus** | http://prometheus.local.cluster | Metrics and queries |
| **AlertManager** | http://alertmanager.local.cluster | Alert management |
| **Hubble UI** | http://hubble.local.cluster | Network monitoring |

Default credentials: `admin` / `admin` (change on first login)

## 📈 Metrics Collection

### System Metrics
- **Node metrics**: CPU, memory, disk, network
- **Pod metrics**: Resource usage, restart counts
- **Kubernetes metrics**: API server, etcd, scheduler
- **Application metrics**: Custom metrics via /metrics endpoints

### Key Performance Indicators (KPIs)

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| **CPU Usage** | >80% | Warning |
| **Memory Usage** | >85% | Warning |
| **Disk Usage** | >90% | Critical |
| **Pod Restart Rate** | >5/hour | Warning |
| **API Server Latency** | >500ms | Critical |

## 📋 Dashboard Categories

### Infrastructure Dashboards
1. **Cluster Overview**: High-level cluster health
2. **Node Details**: Per-node resource utilization
3. **Kubernetes API**: API server performance
4. **Storage**: Persistent volume usage
5. **Network**: Traffic patterns and policies

### Application Dashboards
1. **Application Performance**: Response times, error rates
2. **Database Metrics**: PostgreSQL/Redis performance
3. **AI/ML Workloads**: GPU utilization, model performance
4. **Security**: Authentication, authorization events

### Custom Dashboards
Available in `/cluster/base/monitoring/grafana-dashboards/`:
- `k3s-cluster-overview.json`
- `application-performance.json`
- `authentik-sso-metrics.json`

## 🔍 Log Management

### Log Sources
- **System logs**: Kubernetes components, nodes
- **Application logs**: Container stdout/stderr
- **Access logs**: Ingress controller, authentication
- **Audit logs**: Kubernetes API access

### Log Aggregation with Loki
```bash
# Query logs via LogQL
{namespace="applications"} |= "error"

# View application logs
{app="nextcloud"} | json | line_format "{{.timestamp}} {{.level}} {{.message}}"

# Filter by time range
{namespace="monitoring"} [1h]
```

### Log Retention
- **Debug logs**: 3 days
- **Info logs**: 7 days  
- **Warning logs**: 14 days
- **Error logs**: 30 days
- **Audit logs**: 90 days

## 🚨 Alerting Configuration

### Alert Categories

#### Infrastructure Alerts
```yaml
# High CPU usage
alert: HighCPUUsage
expr: (100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
for: 5m
labels:
  severity: warning
annotations:
  summary: "High CPU usage on {{ $labels.instance }}"

# Out of disk space
alert: DiskSpaceLow
expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
for: 2m
labels:
  severity: critical
```

#### Application Alerts
```yaml
# Pod crash loop
alert: PodCrashLooping
expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
for: 5m
labels:
  severity: warning

# High error rate
alert: HighErrorRate
expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
for: 5m
labels:
  severity: critical
```

### Notification Channels
- **Discord**: General alerts and updates
- **Slack**: Critical infrastructure alerts
- **Email**: Escalation for unacknowledged alerts
- **Webhook**: Integration with external systems

## 🔧 Monitoring Setup

### Prometheus Configuration
```yaml
# Custom scrape config
- job_name: 'my-application'
  static_configs:
  - targets: ['my-app:8080']
  metrics_path: /metrics
  scrape_interval: 30s
```

### Custom Metrics Example
```python
# Python application metrics
from prometheus_client import Counter, Histogram, start_http_server

REQUEST_COUNT = Counter('app_requests_total', 'Total requests')
REQUEST_LATENCY = Histogram('app_request_duration_seconds', 'Request latency')

@REQUEST_LATENCY.time()
def process_request():
    REQUEST_COUNT.inc()
    # Application logic here
    pass

# Start metrics server
start_http_server(8080)
```

## 📊 Observability Best Practices

### 1. The Four Golden Signals
- **Latency**: Request response times
- **Traffic**: Request volume
- **Errors**: Error rate and types
- **Saturation**: Resource utilization

### 2. Alert Design Principles
- **Actionable**: Every alert should require action
- **Contextual**: Include relevant information
- **Escalated**: Multiple notification channels
- **Documented**: Clear resolution procedures

### 3. Dashboard Design
- **Hierarchical**: Overview → Details → Root cause
- **Time-based**: Consistent time ranges
- **Annotated**: Clear labels and descriptions
- **Automated**: Template-based where possible

## 🔍 Troubleshooting Monitoring

### Common Issues

#### Prometheus Not Scraping Targets
```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# Visit: http://localhost:9090/targets

# Check service discovery
kubectl get servicemonitor -A
kubectl describe servicemonitor <name> -n <namespace>
```

#### Grafana Dashboard Issues
```bash
# Check Grafana logs
kubectl logs -n monitoring deployment/kube-prometheus-stack-grafana

# Verify data source
kubectl get secrets -n monitoring | grep grafana
```

#### Alert Not Firing
```bash
# Check AlertManager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
# Visit: http://localhost:9093

# Verify alert rules
kubectl get prometheusrules -A
```

## 📈 Performance Monitoring

### Resource Monitoring
```bash
# Top pods by CPU
kubectl top pods -A --sort-by=cpu

# Top pods by memory  
kubectl top pods -A --sort-by=memory

# Node resource usage
kubectl top nodes
```

### Application Performance
- **Response time percentiles**: P50, P95, P99
- **Throughput**: Requests per second
- **Error rates**: 4xx and 5xx responses
- **Database performance**: Query times, connection pools

### Capacity Planning
- **Growth trends**: Resource usage over time
- **Scaling triggers**: When to add resources
- **Bottleneck identification**: Performance constraints
- **Cost optimization**: Resource right-sizing

## 🎯 Monitoring Runbooks

### Daily Operations
1. Check dashboard for anomalies
2. Review overnight alerts
3. Verify backup completion
4. Monitor capacity trends

### Weekly Review
1. Analyze performance trends
2. Review alert accuracy
3. Update alert thresholds
4. Clean up old metrics

### Monthly Maintenance
1. Review and update dashboards
2. Archive old logs
3. Performance optimization
4. Capacity planning updates

## 📚 Additional Resources

### Monitoring Tools
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Loki Documentation](https://grafana.com/docs/loki/)

### Best Practices
- [SRE Monitoring Guidelines](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Observability Patterns](https://observability.github.io/)
- [Alert Fatigue Prevention](https://docs.honeycomb.io/working-with-your-data/alerts/)