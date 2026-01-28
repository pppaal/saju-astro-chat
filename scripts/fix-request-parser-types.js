/**
 * Fix parseRequestBody calls to include type parameter
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/admin/refund-subscription/route.ts',
  'src/app/api/astrology/chat-stream/route.ts',
  'src/app/api/checkout/route.ts',
  'src/app/api/consultation/route.ts',
  'src/app/api/content-access/route.ts',
  'src/app/api/counselor/chat-history/route.ts',
  'src/app/api/cron/notifications/route.ts',
  'src/app/api/destiny-map/chat-stream/handlers/requestValidator.ts',
  'src/app/api/destiny-map/chat-stream/route.ts',
  'src/app/api/destiny-map/chat/route.ts',
  'src/app/api/destiny-map/route.ts',
  'src/app/api/me/credits/route.ts',
  'src/app/api/me/profile/route.ts',
  'src/app/api/persona-memory/update-from-chat/route.ts',
  'src/app/api/personality/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/saju/route.ts',
  'src/app/api/user/update-birth-info/route.ts',
];

let fixedCount = 0;

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skip (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;

  // Fix parseRequestBody calls without type parameter
  // Match: parseRequestBody(req, { context: '...' })
  // Replace with: parseRequestBody<Record<string, unknown>>(req, { context: '...' })
  content = content.replace(
    /parseRequestBody\(req,\s*\{\s*context:/g,
    'parseRequestBody<Record<string, unknown>>(req, { context:'
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
