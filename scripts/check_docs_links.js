#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();
const roots = [
  'README.md',
  'OVERVIEW.md',
  'docs/README.md',
  'docs/RUNBOOK.md',
  'docs/RAG_AND_GRAPHRAG.md',
  'docs/DESTINY_MATRIX.md',
  'docs/PDF_REPORTING.md',
  'docs/DEMO_AND_SEO.md',
  'docs/TESTING_AND_GUARDRAILS.md',
];

function collectMarkdownFiles(targetPath, out) {
  const full = path.join(repoRoot, targetPath);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isFile() && full.endsWith('.md')) {
    out.push(full);
    return;
  }
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(full)) {
      collectMarkdownFiles(path.join(targetPath, name), out);
    }
  }
}

function stripCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

function normalizeLinkTarget(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return null;
  if (trimmed.startsWith('mailto:')) return null;
  if (trimmed.startsWith('#')) return null;
  const withoutAnchor = trimmed.split('#')[0];
  // Support markdown links that include :line or :line:col suffix.
  const lineRefMatch = withoutAnchor.match(/^(.*?\.[a-z0-9]+):\d+(?::\d+)?$/i);
  if (lineRefMatch) {
    return lineRefMatch[1];
  }
  return withoutAnchor;
}

function resolveLink(filePath, linkTarget) {
  if (linkTarget.startsWith('/')) {
    return path.join(repoRoot, linkTarget.slice(1));
  }
  return path.resolve(path.dirname(filePath), linkTarget);
}

const mdFiles = [];
for (const root of roots) collectMarkdownFiles(root, mdFiles);

const missing = [];

for (const file of mdFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const text = stripCodeBlocks(raw);
  const regex = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const target = normalizeLinkTarget(match[1]);
    if (!target) continue;
    const resolved = resolveLink(file, target);
    if (!fs.existsSync(resolved)) {
      missing.push({ file: path.relative(repoRoot, file), target });
    }
  }
}

if (missing.length > 0) {
  console.error('Broken markdown links found:');
  for (const item of missing) {
    console.error(`- ${item.file} -> ${item.target}`);
  }
  process.exit(1);
}

console.log(`Docs link check passed (${mdFiles.length} markdown files scanned).`);
