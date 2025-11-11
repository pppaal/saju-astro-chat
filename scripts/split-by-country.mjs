// scripts/split-by-country.mjs
import fs from 'fs';
import path from 'path';

const SRC = './public/data/cities.min.json';
const OUTDIR = './public/data/countries';

const arr = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const map = new Map();
for (const r of arr) {
  const cc = (r.country || 'XX').toUpperCase();
  if (!map.has(cc)) map.set(cc, []);
  map.get(cc).push(r);
}
fs.mkdirSync(OUTDIR, { recursive: true });
for (const [cc, list] of map) {
  list.sort((a,b)=> a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(OUTDIR, `${cc}.json`), JSON.stringify(list));
}
console.log('countries:', map.size, 'files at', OUTDIR);