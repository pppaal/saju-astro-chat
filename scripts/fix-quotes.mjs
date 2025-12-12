import fs from 'fs';

let c = fs.readFileSync('c:/dev/saju-astro-chat/src/i18n/I18nProvider.tsx', 'utf8');
let lines = c.split('\n');
let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let original = line;

  // Fix German low quote pattern
  line = line.replace(/"ž/g, "'");
  line = line.replace(/ž"/g, "'");

  // Fix Russian/Chinese patterns - quotes inside options
  // Pattern: options: { A: "...\"word\"...", B: "..." }
  // We need to find embedded double quotes and replace with single quotes

  // Simple regex approach for common patterns
  line = line.replace(/"да, поехали"/g, "'да, поехали'");
  line = line.replace(/"Почему"/g, "'Почему'");
  line = line.replace(/"vamos"/g, "'vamos'");
  line = line.replace(/"走起"/g, "'走起'");
  line = line.replace(/"为什么"/g, "'为什么'");

  if (line !== original) {
    lines[i] = line;
    fixCount++;
    console.log('Fixed line', i + 1);
  }
}

fs.writeFileSync('c:/dev/saju-astro-chat/src/i18n/I18nProvider.tsx', lines.join('\n'), 'utf8');
console.log('Total fixed:', fixCount);
