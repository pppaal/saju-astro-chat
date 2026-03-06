import fs from 'node:fs'
import path from 'node:path'

const metricsPath = process.env.OPS_METRICS_PATH || path.join(process.cwd(), 'data', 'ops', 'service-metrics.json')

function loadMetrics() {
  if (!fs.existsSync(metricsPath)) {
    throw new Error(`Metrics file not found: ${metricsPath}`)
  }
  return JSON.parse(fs.readFileSync(metricsPath, 'utf8'))
}

function summarize(metrics) {
  const totalRequests = Number(metrics.totalRequests || 0)
  const failedRequests = Number(metrics.failedRequests || 0)
  const p95LatencyMs = Number(metrics.p95LatencyMs || 0)
  const availability = totalRequests === 0 ? 100 : ((totalRequests - failedRequests) / totalRequests) * 100
  const errorRate = totalRequests === 0 ? 0 : (failedRequests / totalRequests) * 100
  return {
    totalRequests,
    failedRequests,
    p95LatencyMs,
    availability: Number(availability.toFixed(3)),
    errorRate: Number(errorRate.toFixed(3)),
  }
}

const summary = summarize(loadMetrics())
console.log(JSON.stringify(summary, null, 2))
