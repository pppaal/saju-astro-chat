/**
 * Add explicit type parameter to parseRequestBody calls
 * Changes: parseRequestBody(req, ...) -> parseRequestBody<any>(req, ...)
 * Changes: parseRequestBody<Record<string, unknown>>(req, ...) -> parseRequestBody<any>(req, ...)
 */

const fs = require('fs');
const path = require('path');

// List of files from previous grep
const files = [
  'src/app/api/admin/refund-subscription/route.ts',
  'src/app/api/astrology/chat-stream/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/checkout/route.ts',
  'src/app/api/consultation/route.ts',
  'src/app/api/content-access/route.ts',
  'src/app/api/counselor/chat-history/route.ts',
  'src/app/api/cron/notifications/route.ts',
  'src/app/api/destiny-map/chat/route.ts',
  'src/app/api/destiny-map/chat-stream/handlers/requestValidator.ts',
  'src/app/api/destiny-map/chat-stream/route.ts',
  'src/app/api/destiny-map/route.ts',
  'src/app/api/dream/chat/route.ts',
  'src/app/api/dream/chat/save/route.ts',
  'src/app/api/dream/route.ts',
  'src/app/api/dream/stream/route.ts',
  'src/app/api/feedback/route.ts',
  'src/app/api/me/credits/route.ts',
  'src/app/api/me/profile/route.ts',
  'src/app/api/numerology/route.ts',
  'src/app/api/past-life/route.ts',
  'src/app/api/persona-memory/update-from-chat/route.ts',
  'src/app/api/personality/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/saju/route.ts',
  'src/app/api/tarot/chat/route.ts',
  'src/app/api/tarot/chat/stream/route.ts',
  'src/app/api/tarot/prefetch/route.ts',
  'src/app/api/tarot/route.ts',
  'src/app/api/user/update-birth-info/route.ts',
];

console.log(`Processing ${files.length} files\n`);

let fixedCount = 0;

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skip (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;

  // Pattern 1: parseRequestBody<Record<string, unknown>>(req, ...) -> parseRequestBody<any>(req, ...)
  content = content.replace(
    /parseRequestBody<Record<string,\s*unknown>>\(req,/g,
    'parseRequestBody<any>(req,'
  );

  // Pattern 2: parseRequestBody(req, ...) -> parseRequestBody<any>(req, ...)
  // But avoid matching already typed calls like parseRequestBody<SomeType>(req, ...)
  content = content.replace(
    /parseRequestBody\(req,/g,
    'parseRequestBody<any>(req,'
  );

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Fixed: ${filePath}`);
    fixedCount++;
  } else {
    console.log(`⏭️  Skip (no changes): ${filePath}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
