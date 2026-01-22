# Migration: Add Admin RBAC and Audit Log

## Date
2026-01-22

## Description
This migration adds Role-Based Access Control (RBAC) for administrators and a comprehensive audit logging system.

## Changes

### 1. User Model - Add Role Field
- **Field**: `role` (TEXT, default: 'user')
- **Values**: 'user', 'admin', 'superadmin'
- **Purpose**: DB-based admin role management instead of environment variable only
- **Index**: Added index on `role` column for performance

### 2. AdminAuditLog Table
New table to track all administrative actions for security and compliance.

**Fields**:
- `id`: Primary key
- `createdAt`: Timestamp of action
- `adminEmail`: Email of admin performing action
- `adminUserId`: User ID of admin (optional for backward compatibility)
- `action`: Type of action (e.g., 'refund_completed', 'ban_user')
- `targetType`: Type of target (e.g., 'subscription', 'user')
- `targetId`: ID of target
- `metadata`: JSON field for additional details
- `success`: Whether action succeeded
- `errorMessage`: Error message if failed
- `ipAddress`: IP address of admin
- `userAgent`: User agent string

**Indexes**:
- `(adminEmail, createdAt)`: Query admin's action history
- `(action, createdAt)`: Query specific action types
- `(targetType, targetId)`: Query all actions on specific target

## Migration Steps

```bash
# 1. Apply migration
npx prisma migrate deploy

# 2. (Optional) Promote existing admins from environment variable to DB
# Run this script to sync ADMIN_EMAILS to database:
npm run admin:sync-roles

# 3. Generate Prisma Client
npx prisma generate
```

## Security Improvements

### Before
- ❌ Admin access controlled only by `ADMIN_EMAILS` environment variable
- ❌ No audit trail for admin actions (only console logs)
- ❌ Environment variable could be accidentally exposed

### After
- ✅ DB-based role system with proper foreign keys
- ✅ Persistent audit log in database (tamper-resistant)
- ✅ IP address and user agent tracking
- ✅ Supports role hierarchy (user < admin < superadmin)
- ✅ Environment variable only used as fallback during migration

## Rollback

If needed, rollback with:

```sql
-- Remove role column
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
DROP INDEX IF EXISTS "User_role_idx";

-- Remove audit log table
DROP TABLE IF EXISTS "AdminAuditLog";
```

## Related Files
- `/src/lib/auth/admin.ts` - Updated with DB-based role checks
- `/src/lib/auth/adminAudit.ts` - New audit logging utilities
- `/src/app/api/admin/refund-subscription/route.ts` - Updated to use new audit system
- `/prisma/schema.prisma` - Schema updated

## Testing

After migration, verify:

1. Existing admins still have access
2. New audit logs are created for admin actions
3. Non-admins cannot access admin endpoints
4. Audit log queries work correctly

```typescript
// Example: Query recent admin actions
import { getAdminActionHistory } from '@/lib/auth/adminAudit';

const recentActions = await getAdminActionHistory(
  { adminEmail: 'admin@example.com' },
  { limit: 50 }
);
```
