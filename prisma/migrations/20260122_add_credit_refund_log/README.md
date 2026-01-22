# Migration: Add Credit Refund Log System

## Date
2026-01-22

## Description
This migration adds automatic credit refund functionality for API failures. When an API call fails after consuming credits, the system automatically refunds those credits to the user.

## Changes

### CreditRefundLog Table
New table to track all automatic credit refunds.

**Fields**:
- `id`: Primary key
- `createdAt`: Timestamp of refund
- `userId`: User who received refund
- `creditType`: Type of credit refunded (reading, compatibility, followUp)
- `amount`: Number of credits refunded
- `reason`: Reason for refund (e.g., 'api_error', 'timeout', 'backend_failure')
- `apiRoute`: API route that failed
- `errorMessage`: Error message from failure
- `transactionId`: Optional transaction ID for tracking
- `metadata`: JSON field for additional details

**Indexes**:
- `(userId, createdAt)`: Query user's refund history
- `(creditType, createdAt)`: Query refunds by type
- `(apiRoute, createdAt)`: Track which APIs fail most often

## Problem This Solves

### Before (Bad UX)
1. User calls `/api/tarot/chat` → Credits consumed ✅
2. AI backend times out ❌
3. User gets error message ❌
4. **Credits are gone, user got nothing** 💀

### After (Good UX)
1. User calls `/api/tarot/chat` → Credits consumed ✅
2. AI backend times out ❌
3. **System automatically refunds credits** ✅
4. User can retry without losing credits 🎉

## Features

### Automatic Refund Scenarios
- ✅ AI backend timeout (>60s)
- ✅ Backend connection failure
- ✅ Backend returns 5xx error
- ✅ API throws uncaught exception
- ✅ Parsing error in response

### Manual Refund Available
Admin can also trigger refunds manually via:
```typescript
import { refundCredits } from '@/lib/credits/creditRefund';

await refundCredits({
  userId: 'user_123',
  creditType: 'reading',
  amount: 1,
  reason: 'customer_service',
  errorMessage: 'User reported issue',
});
```

## Usage in API Routes

### Example 1: Simple Error Catch
```typescript
export async function POST(req: NextRequest) {
  const { context: apiContext, error } = await initializeApiContext(req, guardOptions);
  if (error) return error;

  try {
    // ... API logic ...
    const response = await callBackend();
    return NextResponse.json(response);
  } catch (err) {
    // 🔄 Automatic refund on error
    if (apiContext.refundCreditsOnError) {
      await apiContext.refundCreditsOnError(
        err.message,
        { errorType: err.constructor.name }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### Example 2: Conditional Refund
```typescript
// Backend fallback - only refund if using fallback due to backend failure
if (!response.ok && apiContext.refundCreditsOnError) {
  await apiContext.refundCreditsOnError(`Backend failed: ${response.status}`, {
    backendStatus: response.status,
    usingFallback: true,
  });
}
```

## Migration Steps

```bash
# 1. Apply migration
npx prisma migrate deploy

# 2. Generate Prisma Client
npx prisma generate

# 3. Verify refund system works
npm run test:credits
```

## Monitoring

### Check Refund Statistics
```typescript
import { getRefundStatsByRoute } from '@/lib/credits/creditRefund';

const stats = await getRefundStatsByRoute('/api/tarot/chat', startDate, endDate);
console.log(`Total refunds: ${stats.totalRefunds}`);
console.log(`Total amount: ${stats.totalAmount}`);
console.log(`By type:`, stats.byType);
```

### User Refund History
```typescript
import { getCreditRefundHistory } from '@/lib/credits/creditRefund';

const history = await getCreditRefundHistory('user_123', { limit: 10 });
```

## Rollback

If needed, rollback with:

```sql
DROP TABLE IF EXISTS "CreditRefundLog";
```

## Related Files
- `/src/lib/credits/creditRefund.ts` - Refund service
- `/src/lib/api/middleware.ts` - Automatic refund integration
- `/src/app/api/tarot/chat/route.ts` - Example implementation
- `/prisma/schema.prisma` - Schema updated

## Testing

After migration, test:

1. Trigger API timeout → Credits should be refunded
2. Backend failure → Credits should be refunded
3. Normal API success → No refund
4. Check refund logs in database

## Impact

**Positive**:
- ✅ Improved user satisfaction (no lost credits)
- ✅ Better error recovery
- ✅ Transparent refund tracking
- ✅ Easier debugging (know which APIs fail)

**Neutral**:
- ⚪ Slightly more complex error handling
- ⚪ Additional database table

**None**:
- ✅ No performance impact (async operation)
- ✅ No breaking changes
