import fs from 'fs';
const c = fs.readFileSync('c:/dev/saju-astro-chat/src/i18n/I18nProvider.tsx', 'utf8');
const lines = c.split('\n');
let errors = [];
lines.forEach((line, i) => {
  const dq = (line.match(/"/g) || []).length;
  if (dq % 2 !== 0) {
    errors.push((i+1) + ': ' + line.substring(0, 120));
  }
});
if (errors.length > 0) {
  console.log('Lines with odd quotes:');
  errors.slice(0, 15).forEach(e => console.log(e));
} else {
  console.log('No obvious quote issues');
}
