// scripts/fix-lat-lon.mjs

import fs from 'fs';
const file = './public/data/cities.min.json';
const arr = JSON.parse(fs.readFileSync(file, 'utf-8'));

let swapped = 0;
for (const r of arr) {
  if (typeof r.lat !== 'number' || typeof r.lon !== 'number') continue;
  const badLat = Math.abs(r.lat) > 90;
  const badLon = Math.abs(r.lon) > 180;
  if (badLat || badLon) {
    const t = r.lat; r.lat = r.lon; r.lon = t;
    swapped++;
    // 다시 한 번 범위 검증, 여전히 이상하면 제거 플래그
    if (Math.abs(r.lat) > 90 || Math.abs(r.lon) > 180) {
      r._invalid = true;
    }
  }
}
// 완전 무효 레코드 제거
const cleaned = arr.filter(r => !r._invalid);

fs.writeFileSync(file, JSON.stringify(cleaned));
console.log(`lat/lon fix complete. swapped=${swapped}, kept=${cleaned.length}`);