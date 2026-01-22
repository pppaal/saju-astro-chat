# Distributed Tracing Guide

OpenTelemetry를 사용한 분산 추적 설정 및 사용 가이드입니다.

## Setup

### 1. Environment Variables

`.env.local`에 추가:

```bash
# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # Jaeger collector
OTEL_SERVICE_NAME=saju-astro-chat
OTEL_TRACES_SAMPLER=always_on  # or parentbased_always_on
```

### 2. Install Dependencies

```bash
npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http @opentelemetry/instrumentation-http @opentelemetry/instrumentation-fetch
```

### 3. Run Jaeger (Local Development)

```bash
# Using Docker
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Access UI: http://localhost:16686
```

## Usage

### Basic Tracing

```typescript
import { traceAsync, createSpan } from '@/lib/telemetry/tracing';

// Trace an async function
const result = await traceAsync('user.fetch', async () => {
  return await prisma.user.findUnique({ where: { id: userId } });
}, { userId });
```

### Route Handler Tracing

```typescript
import { traceRouteHandler } from '@/lib/telemetry/tracing';

export const POST = traceRouteHandler('api.saju', async (req: Request) => {
  const body = await req.json();
  // Your logic here
  return NextResponse.json({ success: true });
});
```

### Database Query Tracing

```typescript
import { traceQuery } from '@/lib/telemetry/tracing';

const users = await traceQuery('select', 'users', async () => {
  return await prisma.user.findMany();
});
```

### External API Call Tracing

```typescript
import { traceExternalCall } from '@/lib/telemetry/tracing';

const response = await traceExternalCall(
  'openai',
  'https://api.openai.com/v1/chat/completions',
  async () => {
    return await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
);
```

### Manual Span Control

```typescript
import { createSpan, addSpanEvent, setSpanAttributes } from '@/lib/telemetry/tracing';
import { SpanStatusCode } from '@opentelemetry/api';

const span = createSpan('complex.operation', { step: 'initial' });

try {
  // Step 1
  addSpanEvent('processing.start');
  const data = await fetchData();

  // Step 2
  setSpanAttributes({ dataSize: data.length });
  addSpanEvent('processing.transform');
  const transformed = transform(data);

  // Step 3
  addSpanEvent('processing.save');
  await saveData(transformed);

  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  throw error;
} finally {
  span.end();
}
```

### Class Method Decorator

```typescript
import { Trace } from '@/lib/telemetry/tracing';

class SajuService {
  @Trace('saju.calculate')
  async calculateSaju(birthDate: string) {
    // Your logic here
  }
}
```

## Best Practices

### 1. Naming Conventions

- **HTTP routes**: `http.{route}` → `http.api.saju`
- **Database**: `db.{operation}` → `db.select`, `db.insert`
- **External APIs**: `external.{service}` → `external.openai`
- **Business logic**: `{domain}.{action}` → `saju.calculate`, `tarot.interpret`

### 2. Attributes to Include

**Always include:**
- `service.name`: Your service name
- `service.version`: Current version
- `http.method`: HTTP method (GET, POST, etc.)
- `http.status_code`: Response status code
- `error`: true/false
- `error.type`: Error class name

**Context-specific:**
- `user.id`: User identifier (anonymized in production)
- `db.operation`: Database operation type
- `db.table`: Table name
- `peer.service`: External service name
- `http.url`: Request URL (sanitized)

### 3. Error Handling

```typescript
const span = createSpan('operation');
try {
  // Your code
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  // Record exception with full stack trace
  span.recordException(error as Error);

  // Set error status
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });

  // Add error attributes
  setSpanAttributes({
    'error': true,
    'error.type': error.constructor.name,
    'error.message': error.message,
  });

  throw error; // Re-throw to preserve error flow
} finally {
  span.end(); // Always end span
}
```

### 4. Sampling Strategy

**Development:**
```bash
OTEL_TRACES_SAMPLER=always_on
```

**Production (high traffic):**
```bash
# Sample 10% of traces
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

**Production (error-focused):**
```bash
# Always sample errors, 1% of successes
OTEL_TRACES_SAMPLER=parentbased_always_on
```

### 5. Performance Tips

- **Don't trace too granular**: Trace at API/service boundaries, not individual functions
- **Use async tracing**: Avoid blocking with sync tracing
- **Batch exports**: Configure batching to reduce overhead
- **Filter sensitive data**: Never log PII, passwords, or secrets

## Integration Examples

### API Route with Full Tracing

```typescript
// src/app/api/saju/route.ts
import { NextResponse } from 'next/server';
import { traceRouteHandler, traceQuery, traceExternalCall } from '@/lib/telemetry/tracing';

export const POST = traceRouteHandler('api.saju', async (req: Request) => {
  const body = await req.json();

  // Trace database query
  const user = await traceQuery('select', 'users', async () => {
    return await prisma.user.findUnique({ where: { id: body.userId } });
  });

  // Trace calculation
  const sajuResult = await traceAsync('saju.calculate', async () => {
    return calculateSajuData(body.birthDate, body.birthTime, body.gender);
  });

  // Trace AI call
  const interpretation = await traceExternalCall('openai', '/v1/chat/completions', async () => {
    return await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4', messages: [...] }),
    });
  });

  return NextResponse.json({ sajuResult, interpretation });
});
```

### Prisma Middleware for Auto-Tracing

```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { createSpan } from '@/lib/telemetry/tracing';
import { SpanStatusCode } from '@opentelemetry/api';

export const prisma = new PrismaClient();

// Auto-trace all queries
prisma.$use(async (params, next) => {
  const span = createSpan(`db.${params.action}`, {
    'db.table': params.model || 'unknown',
    'db.operation': params.action,
  });

  try {
    const result = await next(params);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

## Viewing Traces

### Jaeger UI

1. Open http://localhost:16686
2. Select service: `saju-astro-chat`
3. Click "Find Traces"
4. Click on a trace to see details:
   - Request flow
   - Timing breakdown
   - Error details
   - Custom attributes

### Analyzing Performance

**Find slow requests:**
```
Duration > 1000ms
```

**Find errors:**
```
error=true
```

**Find specific operations:**
```
db.operation=select AND db.table=users
```

### Common Patterns

**Waterfall view**: Shows sequential vs parallel operations
**Service dependencies**: Visualize service calls
**Error hotspots**: Identify failing services

## Troubleshooting

### No traces appearing

1. Check OTEL_EXPORTER_OTLP_ENDPOINT is set
2. Verify Jaeger is running (docker ps)
3. Check logs for "OpenTelemetry initialized"
4. Ensure OTEL_TRACES_SAMPLER=always_on for dev

### High overhead

1. Reduce sampling rate in production
2. Use async exports (non-blocking)
3. Don't trace individual functions, only boundaries
4. Enable batching: OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512

### Missing context

1. Ensure spans are properly nested
2. Use `context.with()` for async operations
3. Propagate trace headers in HTTP calls

## Production Deployment

### Recommended Services

**Managed OpenTelemetry:**
- [Honeycomb](https://www.honeycomb.io/)
- [Datadog APM](https://www.datadoghq.com/product/apm/)
- [New Relic](https://newrelic.com/products/application-monitoring)
- [Lightstep](https://lightstep.com/)

**Self-hosted:**
- [Jaeger](https://www.jaegertracing.io/)
- [Zipkin](https://zipkin.io/)
- [Tempo](https://grafana.com/oss/tempo/) (with Grafana)

### Configuration

```bash
# Production settings
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.com:4318
OTEL_SERVICE_NAME=saju-astro-chat
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=1.0.0
```

## Next Steps

1. ✅ Enable tracing in instrumentation.ts
2. ✅ Add tracing to critical API routes
3. ⏭️ Set up Jaeger/Datadog
4. ⏭️ Create custom dashboards
5. ⏭️ Set up alerts for slow traces
6. ⏭️ Integrate with CI/CD for trace analysis
