#!/usr/bin/env node
/**
 * Script to replace console.log/error/warn/info/debug with winston logger
 * Usage: node scripts/replace-console-logs.mjs
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Replace console statements in a file
 */
function replaceConsoleInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already imports logger
  if (content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"')) {
    if (VERBOSE) console.log(`⏭️  Skipping ${filePath} (already has logger import)`);
    return { modified: false, count: 0 };
  }

  // Check if file has console statements
  const consoleRegex = /console\.(log|error|warn|info|debug)/g;
  const matches = content.match(consoleRegex);

  if (!matches || matches.length === 0) {
    if (VERBOSE) console.log(`⏭️  Skipping ${filePath} (no console statements)`);
    return { modified: false, count: 0 };
  }

  let newContent = content;
  let changeCount = 0;

  // Add logger import after last import statement
  const lastImportMatch = newContent.match(/^import .+ from .+$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const importIndex = newContent.lastIndexOf(lastImport);
    const afterImport = importIndex + lastImport.length;

    newContent =
      newContent.slice(0, afterImport) +
      "\nimport { logger } from '@/lib/logger'" +
      newContent.slice(afterImport);
  } else {
    // No imports found, add at the beginning
    newContent = "import { logger } from '@/lib/logger'\n\n" + newContent;
  }

  // Replace console.error -> logger.error
  newContent = newContent.replace(
    /console\.error\((.*?)\)/g,
    (match, args) => {
      changeCount++;
      // If it's a simple string, convert to logger format
      if (args.match(/^['"`].*['"`]$/)) {
        return `logger.error(${args})`;
      }
      // If it has multiple args, try to structure them
      const argParts = args.split(',').map(a => a.trim());
      if (argParts.length === 1) {
        return `logger.error(${args})`;
      }
      // Try to convert to structured format
      const message = argParts[0];
      const rest = argParts.slice(1).join(', ');
      return `logger.error(${message}, { data: ${rest} })`;
    }
  );

  // Replace console.warn -> logger.warn
  newContent = newContent.replace(
    /console\.warn\((.*?)\)/g,
    (match, args) => {
      changeCount++;
      if (args.match(/^['"`].*['"`]$/)) {
        return `logger.warn(${args})`;
      }
      const argParts = args.split(',').map(a => a.trim());
      if (argParts.length === 1) {
        return `logger.warn(${args})`;
      }
      const message = argParts[0];
      const rest = argParts.slice(1).join(', ');
      return `logger.warn(${message}, { data: ${rest} })`;
    }
  );

  // Replace console.log and console.info -> logger.info
  newContent = newContent.replace(
    /console\.(log|info)\((.*?)\)/g,
    (match, method, args) => {
      changeCount++;
      if (args.match(/^['"`].*['"`]$/)) {
        return `logger.info(${args})`;
      }
      const argParts = args.split(',').map(a => a.trim());
      if (argParts.length === 1) {
        return `logger.info(${args})`;
      }
      const message = argParts[0];
      const rest = argParts.slice(1).join(', ');
      return `logger.info(${message}, { data: ${rest} })`;
    }
  );

  // Replace console.debug -> logger.debug
  newContent = newContent.replace(
    /console\.debug\((.*?)\)/g,
    (match, args) => {
      changeCount++;
      return `logger.debug(${args})`;
    }
  );

  if (!DRY_RUN && changeCount > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { modified: changeCount > 0, count: changeCount };
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding TypeScript files with console statements...\n');

  // Find all TS/TSX files in src directory
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    absolute: true
  });

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  if (DRY_RUN) {
    console.log('🏃 DRY RUN MODE - No files will be modified\n');
  }

  let totalModified = 0;
  let totalReplacements = 0;
  const modifiedFiles = [];

  for (const file of files) {
    const result = replaceConsoleInFile(file);
    if (result.modified) {
      totalModified++;
      totalReplacements += result.count;
      modifiedFiles.push({ file, count: result.count });
      console.log(`✅ ${path.relative(process.cwd(), file)} (${result.count} replacements)`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total files scanned: ${files.length}`);
  console.log(`   Files modified: ${totalModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✨ Done! All console statements have been replaced with winston logger');
    console.log('\n⚠️  IMPORTANT: Review the changes and test your application!');
    console.log('   Some complex console statements may need manual adjustment.');
  }
}

main().catch(console.error);
