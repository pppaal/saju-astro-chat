/**
 * Extract karma-narratives.ts to JSON files
 * Splits the 153KB file by narrative type for better code splitting
 */

import fs from 'fs';
import path from 'path';

// Dynamic import to avoid TypeScript compilation issues
async function main() {
  const module = await import('../src/components/destiny-map/fun-insights/tabs/data/karma-narratives');

  // Create output directory
  const outputDir = path.join(__dirname, '../public/data/karma');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('📦 Extracting karma narratives to JSON...\n');

  let totalSize = 0;
  const files: string[] = [];

  // Extract each narrative type
  const narrativeTypes = [
    'dayMasterNarratives',
    'northNodeNarratives',
    'saturnNarratives',
    'shinsalNarratives'
  ];

  for (const narrativeType of narrativeTypes) {
    const data = (module as any)[narrativeType];
    if (!data) {
      console.warn(`⚠️  ${narrativeType} not found in module`);
      continue;
    }

    const filename = `${narrativeType}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    const size = fs.statSync(filepath).size;
    totalSize += size;
    files.push(filename);
    console.log(`✓ ${filename} (${(size / 1024).toFixed(2)}KB)`);
  }

  // Create index file
  const indexData = {
    files,
    totalSize,
    lastUpdated: new Date().toISOString()
  };

  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  console.log(`\n✓ Created index.json`);
  console.log(`\n🎉 Successfully extracted all karma narratives!`);
  console.log(`📊 Total size: ${(totalSize / 1024).toFixed(2)}KB across ${files.length} files`);
}

main().catch(console.error);
