// scripts/csv-to-cities-json.mjs

import fs from 'fs';
import path from 'path';

const SRC = process.argv[2];
if (!SRC) {
  console.error('Usage: node scripts/csv-to-cities-json.mjs "<path-to-csv>"');
  process.exit(1);
}

const OUT = path.join(process.cwd(), 'public', 'data', 'cities.min.json');

const text = fs.readFileSync(SRC, 'utf-8').replace(/\uFEFF/g, '').trim();
const firstLine = text.split(/\r?\n/, 1)[0];

// 구분자 자동 감지
function detectSep(line) {
  const counts = { ',': (line.match(/,/g) || []).length, ';': (line.match(/;/g) || []).length, '\t': (line.match(/\t/g) || []).length };
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}
const SEP = detectSep(firstLine);

// 안전한 CSV split (따옴표 지원)
function splitLine(line, sep) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i+1] === '"') { cur += '"'; i++; }
      else { q = !q; }
    } else if (c === sep && !q) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const lines = text.split(/\r?\n/).filter(Boolean);
if (lines.length < 2) {
  console.error('CSV가 비어 있거나 행이 없습니다.');
  process.exit(1);
}

const headers = splitLine(lines[0], SEP).map(h => h.trim());
const norm = s => s.toLowerCase().trim();

function findIndex(names) {
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (names.some(n => h === n)) return i;
  }
  return -1;
}

// 다양한 헤더명 대응
const idx = {
  name: findIndex(['name','city','asciiname','ascii name']),
  country: findIndex(['country code','country','iso2','cc']),
  lat: findIndex(['lat','latitude']),
  lon: findIndex(['lon','lng','longitude']),
  coords: findIndex(['coordinates','coord','coordintes']), // 오타까지
  population: findIndex(['population','pop'])
};

if (idx.name === -1 || idx.country === -1 || (idx.coords === -1 && (idx.lat === -1 || idx.lon === -1))) {
  console.error('헤더를 찾지 못했습니다.');
  console.error('감지된 헤더:', headers);
  console.error('필요: name, country code, 그리고 coordinates 또는 latitude+longitude');
  process.exit(1);
}

const out = [];
for (let i = 1; i < lines.length; i++) {
  const cols = splitLine(lines[i], SEP);
  const name = cols[idx.name]?.trim();
  const country = cols[idx.country]?.trim().toUpperCase();
  if (!name || !country) continue;

  let lat, lon;
  if (idx.coords !== -1) {
    // "lon, lat" 또는 "lat, lon" 모두 지원: 숫자 범위로 판별
    const parts = (cols[idx.coords] || '').split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const a = parseFloat(parts[0]); // first
      const b = parseFloat(parts[1]); // second
      if (isFinite(a) && isFinite(b)) {
        // 어느 쪽이 lat인지 판단: |lat| <= 90, |lon| <= 180
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) { lat = a; lon = b; }
        else if (Math.abs(b) <= 90 && Math.abs(a) <= 180) { lat = b; lon = a; }
      }
    }
  } else {
    lat = parseFloat(cols[idx.lat]);
    lon = parseFloat(cols[idx.lon]);
  }

  if (!isFinite(lat) || !isFinite(lon)) continue;
  // 범위 체크
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

  out.push({ name, country, lat: +lat.toFixed(6), lon: +lon.toFixed(6) });
}

// 비어있으면 실패 메시지
if (out.length === 0) {
  console.error('파싱 결과가 0개입니다. 구분자/헤더/좌표 형식을 다시 확인하세요.');
  process.exit(1);
}

// 서울 안전망
if (!out.some(r => r.country === 'KR' && norm(r.name) === 'seoul')) {
  out.push({ name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.9780 });
}

// 중복 제거(name+country)
const key = r => `${norm(r.name)}|${r.country}`;
const map = new Map();
for (const r of out) if (!map.has(key(r))) map.set(key(r), r);
const final = Array.from(map.values());

// 출력
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(final));
console.warn(`Wrote ${final.length} cities to ${OUT}`);
console.warn(`-> ${OUT}`);