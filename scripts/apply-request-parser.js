/**
 * Script to apply requestParser utility to API route files
 * Replaces: await req.json().catch(() => null)
 * With: await parseRequestBody(req, { context: '...' })
 */

const fs = require('fs');
const path = require('path');

// Files to process
const files = [
  'src/app/api/dream/route.ts',
  'src/app/api/destiny-map/chat/route.ts',
  'src/app/api/destiny-map/chat-stream/route.ts',
  'src/app/api/astrology/chat-stream/route.ts',
  'src/app/api/destiny-map/route.ts',
  'src/app/api/dream/chat/route.ts',
  'src/app/api/dream/chat/save/route.ts',
  'src/app/api/dream/stream/route.ts',
  'src/app/api/feedback/route.ts',
  'src/app/api/me/credits/route.ts',
  'src/app/api/me/profile/route.ts',
  'src/app/api/personality/route.ts',
  'src/app/api/saju/route.ts',
  'src/app/api/tarot/chat/route.ts',
  'src/app/api/tarot/chat/stream/route.ts',
  'src/app/api/tarot/prefetch/route.ts',
  'src/app/api/tarot/route.ts',
  'src/app/api/admin/refund-subscription/route.ts',
  'src/app/api/checkout/route.ts',
  'src/app/api/consultation/route.ts',
  'src/app/api/numerology/route.ts',
  'src/app/api/persona-memory/update-from-chat/route.ts',
  'src/app/api/past-life/route.ts',
  'src/app/api/user/update-birth-info/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/content-access/route.ts',
  'src/app/api/counselor/chat-history/route.ts',
  'src/app/api/cron/notifications/route.ts',
];

// Extract context name from file path
function getContextName(filePath) {
  const parts = filePath.split('/');
  const apiIndex = parts.indexOf('api');
  if (apiIndex === -1) return 'API request';

  const routeParts = parts.slice(apiIndex + 1).filter(p => p !== 'route.ts');
  return routeParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

let processedCount = 0;
let skippedCount = 0;

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skip (not found): ${filePath}`);
    skippedCount++;
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');

  // Check if already has parseRequestBody import
  if (content.includes('parseRequestBody')) {
    console.log(`⏭️  Skip (already updated): ${filePath}`);
    skippedCount++;
    return;
  }

  // Check if file uses req.json().catch()
  if (!content.includes('.json().catch')) {
    console.log(`⏭️  Skip (no pattern): ${filePath}`);
    skippedCount++;
    return;
  }

  const contextName = getContextName(filePath);

  // Add import if not present
  if (!content.includes("from '@/lib/api/requestParser'")) {
    // Find the best place to add import (after other imports)
    const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.indexOf(lastImport) + lastImport.length;

      content = content.slice(0, lastImportIndex) +
                '\nimport { parseRequestBody } from \'@/lib/api/requestParser\';' +
                content.slice(lastImportIndex);
    } else {
      // No imports found, add at the beginning
      content = 'import { parseRequestBody } from \'@/lib/api/requestParser\';\n' + content;
    }
  }

  // Replace patterns
  // Pattern 1: await req.json().catch(() => null)
  content = content.replace(
    /await\s+req\.json\(\)\.catch\(\s*\(\s*\)\s*=>\s*null\s*\)/g,
    `await parseRequestBody(req, { context: '${contextName}' })`
  );

  // Pattern 2: (await req.json().catch(() => null)) as Type | null
  content = content.replace(
    /\(await\s+req\.json\(\)\.catch\(\s*\(\s*\)\s*=>\s*null\s*\)\)\s+as\s+([^;]+)/g,
    (match, typeAnnotation) => {
      return `await parseRequestBody<${typeAnnotation.replace(/\s*\|\s*null\s*$/, '')}>(req, { context: '${contextName}' })`;
    }
  );

  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ Updated: ${filePath}`);
  processedCount++;
});

console.log('\n📊 Summary:');
console.log(`✅ Processed: ${processedCount}`);
console.log(`⏭️  Skipped: ${skippedCount}`);
console.log(`📁 Total: ${files.length}`);
