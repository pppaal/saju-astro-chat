const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));

// Overall summary
console.log('========================================');
console.log('OVERALL COVERAGE SUMMARY');
console.log('========================================');
console.log('');
console.log('Lines:      ' + data.total.lines.pct + '% (' + data.total.lines.covered + '/' + data.total.lines.total + ')');
console.log('Statements: ' + data.total.statements.pct + '%');
console.log('Functions:  ' + data.total.functions.pct + '% (' + data.total.functions.covered + '/' + data.total.functions.total + ')');
console.log('Branches:   ' + data.total.branches.pct + '% (' + data.total.branches.covered + '/' + data.total.branches.total + ')');
console.log('');

// Aggregate by folder
const folders = {};

for (const [path, coverage] of Object.entries(data)) {
  if (path === 'total') continue;
  if (path.indexOf('src') === -1 || path.indexOf('lib') === -1) continue;
  
  const parts = path.split(/[\\/]/);
  const libIdx = parts.findIndex(p => p === 'lib');
  
  let folder = parts.length > libIdx + 2 ? parts[libIdx + 1] : '(root)';
  
  if (folders[folder] === undefined) {
    folders[folder] = { 
      lines: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 }
    };
  }
  
  folders[folder].lines.total += coverage.lines.total;
  folders[folder].lines.covered += coverage.lines.covered;
  folders[folder].branches.total += coverage.branches.total;
  folders[folder].branches.covered += coverage.branches.covered;
  folders[folder].functions.total += coverage.functions.total;
  folders[folder].functions.covered += coverage.functions.covered;
}

// Calculate percentages and sort
const folderList = Object.entries(folders).map(([name, stats]) => ({
  name,
  linesPct: stats.lines.total > 0 ? Math.round(stats.lines.covered / stats.lines.total * 100) : 0,
  lines: stats.lines.covered + '/' + stats.lines.total,
  branchesPct: stats.branches.total > 0 ? Math.round(stats.branches.covered / stats.branches.total * 100) : 100,
  functionsPct: stats.functions.total > 0 ? Math.round(stats.functions.covered / stats.functions.total * 100) : 100
})).sort((a, b) => a.linesPct - b.linesPct);

console.log('========================================');
console.log('src/lib MODULE COVERAGE (sorted by line %)');
console.log('========================================');
console.log('');

folderList.forEach(f => {
  console.log(f.name.padEnd(25) + ' Lines: ' + String(f.linesPct).padStart(3) + '%  Branches: ' + String(f.branchesPct).padStart(3) + '%  Functions: ' + String(f.functionsPct).padStart(3) + '%');
});

// Now find top 10 files with lowest coverage
console.log('');
console.log('========================================');
console.log('TOP 10 src/lib/*.ts FILES WITH LOWEST LINE COVERAGE');
console.log('========================================');
console.log('');

const files = [];
for (const [path, coverage] of Object.entries(data)) {
  if (path === 'total') continue;
  if (path.indexOf('src') === -1 || path.indexOf('lib') === -1) continue;
  if (coverage.lines.total === 0) continue;
  
  const parts = path.split(/[\\/]/);
  const libIdx = parts.findIndex(p => p === 'lib');
  const relativePath = parts.slice(libIdx).join('/');
  
  files.push({
    path: 'src/' + relativePath,
    lines: coverage.lines.pct,
    branches: coverage.branches.pct,
    functions: coverage.functions.pct,
    totalLines: coverage.lines.total,
    coveredLines: coverage.lines.covered
  });
}

files.sort((a, b) => a.lines - b.lines);

files.slice(0, 10).forEach((f, i) => {
  console.log((i+1) + '. ' + f.path);
  console.log('   Lines: ' + f.lines + '% (' + f.coveredLines + '/' + f.totalLines + ')');
  console.log('   Branches: ' + f.branches + '% | Functions: ' + f.functions + '%');
  console.log('');
});
