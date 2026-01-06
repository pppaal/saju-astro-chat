/**
 * console.log를 logger로 자동 변환하는 스크립트
 *
 * 사용법:
 * node scripts/migrate-console-to-logger.js src/app/api/saju/route.ts
 */

const fs = require('fs');
const path = require('path');

// 변환 규칙
const replacements = [
  // console.log → logger.info
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
  },
  // console.error → logger.error
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
  },
  // console.warn → logger.warn
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
  },
  // console.debug → logger.debug
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
  },
];

function shouldSkipFile(filePath) {
  const skipPatterns = [
    /node_modules/,
    /\.next/,
    /\.git/,
    /dist/,
    /build/,
    /coverage/,
  ];

  return skipPatterns.some(pattern => pattern.test(filePath));
}

function addLoggerImport(content, filePath) {
  // 이미 logger import가 있는지 확인
  if (content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"')) {
    return content;
  }

  // 파일 타입에 따라 적절한 logger import 결정
  let loggerImport = "import { logger } from '@/lib/logger';\n";

  if (filePath.includes('/api/')) {
    if (filePath.includes('stripe') || filePath.includes('payment') || filePath.includes('checkout')) {
      loggerImport = "import { paymentLogger as logger } from '@/lib/logger';\n";
    } else if (filePath.includes('auth')) {
      loggerImport = "import { authLogger as logger } from '@/lib/logger';\n";
    } else if (filePath.includes('saju')) {
      loggerImport = "import { sajuLogger as logger } from '@/lib/logger';\n";
    } else if (filePath.includes('astro')) {
      loggerImport = "import { astroLogger as logger } from '@/lib/logger';\n";
    } else if (filePath.includes('tarot')) {
      loggerImport = "import { tarotLogger as logger } from '@/lib/logger';\n";
    } else {
      loggerImport = "import { apiLogger as logger } from '@/lib/logger';\n";
    }
  }

  // import 문 찾기
  const importMatch = content.match(/^import .+ from .+;$/m);

  if (importMatch) {
    // 첫 번째 import 다음에 추가
    const insertPosition = content.indexOf(importMatch[0]) + importMatch[0].length;
    return content.slice(0, insertPosition) + '\n' + loggerImport + content.slice(insertPosition);
  }

  // import가 없으면 파일 맨 위에 추가
  return loggerImport + '\n' + content;
}

function migrateFile(filePath, dryRun = false) {
  if (shouldSkipFile(filePath)) {
    return { changed: false, reason: 'skipped' };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let hasConsole = false;

  // console.* 패턴이 있는지 확인
  replacements.forEach(({ pattern }) => {
    if (pattern.test(content)) {
      hasConsole = true;
    }
  });

  if (!hasConsole) {
    return { changed: false, reason: 'no console statements' };
  }

  // 변환 수행
  replacements.forEach(({ pattern, replacement }) => {
    newContent = newContent.replace(pattern, replacement);
  });

  // logger import 추가
  newContent = addLoggerImport(newContent, filePath);

  // dry-run 모드
  if (dryRun) {
    console.log(`\n📝 Would modify: ${filePath}`);
    return { changed: true, reason: 'dry-run' };
  }

  // 파일 쓰기
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Migrated: ${filePath}`);

  return { changed: true, reason: 'migrated' };
}

function migrateDirectory(dirPath, dryRun = false) {
  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    noChanges: 0,
  };

  function walk(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walk(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        stats.total++;
        const result = migrateFile(filePath, dryRun);

        if (result.changed && result.reason === 'migrated') {
          stats.migrated++;
        } else if (result.reason === 'skipped') {
          stats.skipped++;
        } else {
          stats.noChanges++;
        }
      }
    });
  }

  walk(dirPath);
  return stats;
}

// CLI 실행
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/migrate-console-to-logger.js [file or directory] [--dry-run]');
    console.log('\nExamples:');
    console.log('  node scripts/migrate-console-to-logger.js src/app/api/saju/route.ts');
    console.log('  node scripts/migrate-console-to-logger.js src/app/api --dry-run');
    console.log('  node scripts/migrate-console-to-logger.js src/lib');
    process.exit(1);
  }

  const target = args[0];
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const stat = fs.statSync(target);

  if (stat.isDirectory()) {
    console.log(`📁 Migrating directory: ${target}\n`);
    const stats = migrateDirectory(target, dryRun);
    console.log('\n📊 Summary:');
    console.log(`  Total files: ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  No changes: ${stats.noChanges}`);
    console.log(`  Skipped: ${stats.skipped}`);
  } else {
    console.log(`📄 Migrating file: ${target}\n`);
    const result = migrateFile(target, dryRun);
    if (result.changed) {
      console.log(`✅ Done! (${result.reason})`);
    } else {
      console.log(`ℹ️  No changes needed (${result.reason})`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, migrateDirectory };
