#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const shouldWrite = args.includes('--write');
const failOnFindings = args.includes('--fail');

const ROOT = process.cwd();
const TARGET_DIRS = ['src'];
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  'public',
]);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const CONSOLE_REGEX = /\bconsole\.(log|info|warn|error|debug)\b/g;

const replacementMap = {
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS.has(ext)) files.push(fullPath);
    }
  }
  return files;
}

function hasLoggerImport(content) {
  return /from\s+['"]@\/lib\/logger['"]/g.test(content);
}

function insertLoggerImport(content) {
  const lines = content.split(/\r?\n/);
  let insertAt = 0;

  if (lines[0] && /^\s*['"]use client['"];?\s*$/.test(lines[0])) {
    insertAt = 1;
  }

  while (insertAt < lines.length && /^\s*import\s+/.test(lines[insertAt])) {
    insertAt += 1;
  }

  lines.splice(insertAt, 0, "import { logger } from '@/lib/logger';");
  return lines.join('\n');
}

function replaceConsole(content) {
  return content.replace(CONSOLE_REGEX, (match, level) => {
    const mapped = replacementMap[level] || 'info';
    return `logger.${mapped}`;
  });
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  let match;

  while ((match = CONSOLE_REGEX.exec(content)) !== null) {
    const index = match.index;
    const before = content.slice(0, index);
    const line = before.split(/\r?\n/).length;
    matches.push({
      filePath,
      line,
      match: match[0],
    });
  }

  let updated = content;
  let didWrite = false;

  if (shouldWrite && matches.length > 0) {
    const ext = path.extname(filePath);
    const canAddImport = ext === '.ts' || ext === '.tsx';

    updated = replaceConsole(updated);

    if (canAddImport && !hasLoggerImport(updated)) {
      updated = insertLoggerImport(updated);
    }

    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf8');
      didWrite = true;
    }
  }

  return { matches, didWrite };
}

function main() {
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

  let totalMatches = 0;
  let totalFiles = 0;
  let totalWrites = 0;

  const report = [];

  for (const filePath of files) {
    const { matches, didWrite } = scanFile(filePath);
    if (matches.length > 0) {
      totalMatches += matches.length;
      totalFiles += 1;
      report.push(...matches);
    }
    if (didWrite) totalWrites += 1;
  }

  if (report.length === 0) {
    console.log('No console.* usage found in src.');
    process.exit(0);
  }

  console.log(`Found ${totalMatches} console.* occurrences in ${totalFiles} file(s).`);
  report.slice(0, 200).forEach((item) => {
    console.log(`${path.relative(ROOT, item.filePath)}:${item.line} ${item.match}`);
  });

  if (report.length > 200) {
    console.log(`...and ${report.length - 200} more.`);
  }

  if (shouldWrite) {
    console.log(`Updated ${totalWrites} file(s).`);
  } else {
    console.log('Run with --write to replace console.* with logger.* in src.');
  }

  if (failOnFindings) {
    process.exit(1);
  }
}

main();
