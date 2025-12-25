#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [
  'src/app/api/astrology/chat-stream/route.ts',
  'src/app/api/astrology/route.ts',
  'src/app/api/compatibility/chat/route.ts',
  'src/app/api/compatibility/route.ts',
  'src/app/api/daily-fortune/route.ts',
  'src/app/api/destiny-map/chat/route.ts',
  'src/app/api/destiny-map/chat-stream/route.ts',
  'src/app/api/dream/chat/route.ts',
  'src/app/api/dream/route.ts',
  'src/app/api/numerology/route.ts',
  'src/app/api/saju/chat-stream/route.ts',
  'src/app/api/saju/route.ts',
  'src/app/api/tarot/chat/route.ts',
  'src/app/api/tarot/chat/stream/route.ts',
  'src/app/api/tarot/interpret/route.ts',
  'src/app/api/tarot/interpret/stream/route.ts',
  'src/app/api/tarot/prefetch/route.ts',
];

const IMPORT_LINE = 'import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";';

// pickBackendUrl 함수 정의를 찾는 정규식
const FUNCTION_PATTERN = /function pickBackendUrl\(\) \{[\s\S]*?\n\}\n\n/g;

files.forEach((filePath) => {
  console.log(`Processing: ${filePath}`);

  try {
    let content = readFileSync(filePath, 'utf-8');

    // 1. pickBackendUrl 함수 정의 제거
    const beforeRemoval = content;
    content = content.replace(FUNCTION_PATTERN, '');

    if (content === beforeRemoval) {
      console.log(`  ⚠️  No pickBackendUrl function found`);
    } else {
      console.log(`  ✓ Removed pickBackendUrl function`);
    }

    // 2. import 문 추가 (첫 번째 import 다음에)
    if (!content.includes('@/lib/backend-url')) {
      // 첫 번째 import 구문 찾기
      const firstImportMatch = content.match(/^import .+?;\n/m);
      if (firstImportMatch) {
        const insertPosition = firstImportMatch.index + firstImportMatch[0].length;
        content =
          content.slice(0, insertPosition) +
          IMPORT_LINE + '\n' +
          content.slice(insertPosition);
        console.log(`  ✓ Added import statement`);
      }
    } else {
      console.log(`  ℹ️  Import already exists`);
    }

    // 3. 파일 저장
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Updated successfully\n`);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}\n`);
  }
});

console.log('🎉 Refactoring complete!');
