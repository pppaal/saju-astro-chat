const fs = require('fs');
const data = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf-8'));

const libFiles = Object.keys(data)
  .filter(k => k.includes('lib') && !k.includes('node_modules') && !k.includes('test'))
  .filter(k => data[k].lines.total > 0)
  .map(k => ({
    file: k.replace(/.*[\\/]lib[\\/]/, 'lib/'),
    lines: data[k].lines.pct,
    branches: data[k].branches.pct,
    funcs: data[k].functions.pct,
    uncovered: data[k].lines.total - data[k].lines.covered
  }))
  .filter(f => f.lines < 80)
  .sort((a, b) => a.lines - b.lines)
  .slice(0, 15);

console.log('Files with <80% line coverage:');
console.log('Lines% | Branches% | Funcs% | Uncovered | File');
console.log('-------|-----------|--------|-----------|-----');
libFiles.forEach(f => {
  console.log(
    f.lines.toFixed(1).padStart(6) + ' | ' +
    f.branches.toFixed(1).padStart(9) + ' | ' +
    f.funcs.toFixed(1).padStart(6) + ' | ' +
    f.uncovered.toString().padStart(9) + ' | ' +
    f.file
  );
});
