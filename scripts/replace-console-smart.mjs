#!/usr/bin/env node
/**
 * Smart console.log replacement script with context-aware conversion
 * Usage: node scripts/replace-console-smart.mjs [--dry-run] [--file path]
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const fileArg = process.argv.find(arg => arg.startsWith('--file='));
const specificFile = fileArg ? fileArg.split('=')[1] : null;

/**
 * Smart replacement that preserves context
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
  const importMatches = [...newContent.matchAll(/^import\s+.+\s+from\s+['"].+['"];?$/gm)];
  if (importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const importIndex = lastImport.index + lastImport[0].length;

    newContent =
      newContent.slice(0, importIndex) +
      "\nimport { logger } from '@/lib/logger';" +
      newContent.slice(importIndex);
  } else {
    // No imports found, add at the beginning
    newContent = "import { logger } from '@/lib/logger';\n\n" + newContent;
  }

  // Replace console.error with logger.error
  newContent = newContent.replace(
    /console\.error\(([^)]+)\)/g,
    (match, args) => {
      changeCount++;
      // Clean up the arguments
      const cleanArgs = args.trim();

      // If it's just a string literal
      if (/^['"`][^'"]*['"`]$/.test(cleanArgs)) {
        return `logger.error(${cleanArgs})`;
      }

      // If it has a message and data
      const parts = splitArgs(cleanArgs);
      if (parts.length === 1) {
        return `logger.error(${parts[0]})`;
      } else if (parts.length === 2) {
        return `logger.error(${parts[0]}, { error: ${parts[1]} })`;
      } else {
        const message = parts[0];
        const data = parts.slice(1).join(', ');
        return `logger.error(${message}, { ${data} })`;
      }
    }
  );

  // Replace console.warn with logger.warn
  newContent = newContent.replace(
    /console\.warn\(([^)]+)\)/g,
    (match, args) => {
      changeCount++;
      const cleanArgs = args.trim();

      if (/^['"`][^'"]*['"`]$/.test(cleanArgs)) {
        return `logger.warn(${cleanArgs})`;
      }

      const parts = splitArgs(cleanArgs);
      if (parts.length === 1) {
        return `logger.warn(${parts[0]})`;
      } else {
        const message = parts[0];
        const data = parts.slice(1).join(', ');
        return `logger.warn(${message}, { data: ${data} })`;
      }
    }
  );

  // Replace console.log and console.info with logger.info
  newContent = newContent.replace(
    /console\.(log|info)\(([^)]+)\)/g,
    (match, method, args) => {
      changeCount++;
      const cleanArgs = args.trim();

      if (/^['"`][^'"]*['"`]$/.test(cleanArgs)) {
        return `logger.info(${cleanArgs})`;
      }

      const parts = splitArgs(cleanArgs);
      if (parts.length === 1) {
        return `logger.info(${parts[0]})`;
      } else {
        const message = parts[0];
        const data = parts.slice(1).join(', ');
        return `logger.info(${message}, { data: ${data} })`;
      }
    }
  );

  // Replace console.debug with logger.debug
  newContent = newContent.replace(
    /console\.debug\(([^)]+)\)/g,
    (match, args) => {
      changeCount++;
      return `logger.debug(${args.trim()})`;
    }
  );

  if (!DRY_RUN && changeCount > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return { modified: changeCount > 0, count: changeCount };
}

/**
 * Simple argument splitter (handles basic cases)
 */
function splitArgs(argsString) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    const prevChar = i > 0 ? argsString[i - 1] : '';

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '(' || char === '{' || char === '[') depth++;
      if (char === ')' || char === '}' || char === ']') depth--;

      if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Smart console.log replacement\n');

  let files = [];

  if (specificFile) {
    if (fs.existsSync(specificFile)) {
      files = [path.resolve(specificFile)];
      console.log(`📄 Processing specific file: ${specificFile}\n`);
    } else {
      console.error(`❌ File not found: ${specificFile}`);
      process.exit(1);
    }
  } else {
    // Find all TS/TSX files in src directory
    files = await glob('src/**/*.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      absolute: true,
      cwd: process.cwd()
    });
    console.log(`📁 Found ${files.length} TypeScript files\n`);
  }

  if (DRY_RUN) {
    console.log('🏃 DRY RUN MODE - No files will be modified\n');
  }

  let totalModified = 0;
  let totalReplacements = 0;
  const modifiedFiles = [];

  for (const file of files) {
    try {
      const result = replaceConsoleInFile(file);
      if (result.modified) {
        totalModified++;
        totalReplacements += result.count;
        modifiedFiles.push({ file, count: result.count });
        console.log(`✅ ${path.relative(process.cwd(), file)} (${result.count} replacements)`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files modified: ${totalModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else if (totalModified > 0) {
    console.log('\n✨ Done! Console statements replaced with winston logger');
    console.log('\n⚠️  IMPORTANT: Review changes and test your application!');
  } else {
    console.log('\n✨ No changes needed - all files already use logger!');
  }
}

main().catch(console.error);
