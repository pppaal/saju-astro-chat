#!/bin/bash
# Smoke test against running dev server
# Usage:
#   1) Start dev server: PORT=3737 npm run dev
#   2) Run: bash scripts/smoke-api-narration.sh
#
# Hits 4 user-facing API endpoints with 1995-02-09 06:40 male Seoul data,
# checks responses for: literal 조사 leakage / unfilled template / undefined leak.

set -uo pipefail

BASE="${BASE:-http://127.0.0.1:3737}"
TMP="${TMP:-/tmp/smoke-narration}"
mkdir -p "$TMP"

echo "▶ /api/saju"
curl -sS -X POST "$BASE/api/saju" \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1995-02-09","birthTime":"06:40","gender":"male","calendarType":"solar","timezone":"Asia/Seoul"}' \
  > "$TMP/saju.json"

echo "▶ /api/destiny-matrix"
curl -sS -X POST "$BASE/api/destiny-matrix" \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1995-02-09","birthTime":"06:40","gender":"male","timezone":"Asia/Seoul","latitude":37.5665,"longitude":126.978,"lang":"ko"}' \
  > "$TMP/matrix.json"

echo "▶ /api/destiny-matrix/scenario"
curl -sS -X POST "$BASE/api/destiny-matrix/scenario" \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1995-02-09","birthTime":"06:40","gender":"male","action":"careerChange","targetDate":"2026-08-15"}' \
  > "$TMP/scenario.json"

echo "▶ /api/destiny-matrix/compatibility-3layer"
curl -sS -X POST "$BASE/api/destiny-matrix/compatibility-3layer" \
  -H "Content-Type: application/json" \
  -d '{"personA":{"birthDate":"1995-02-09","birthTime":"06:40","gender":"male"},"personB":{"birthDate":"1996-03-15","birthTime":"14:20","gender":"female"}}' \
  > "$TMP/compat3.json"

echo
python3 << PY
import json, re, glob

ENDPOINTS = [
    ('/api/saju', '$TMP/saju.json'),
    ('/api/destiny-matrix', '$TMP/matrix.json'),
    ('/api/destiny-matrix/scenario', '$TMP/scenario.json'),
    ('/api/destiny-matrix/compatibility-3layer', '$TMP/compat3.json'),
]

PATTERNS = [
    (r'이\(가\)', 'literal 이(가)'),
    (r'을\(를\)', 'literal 을(를)'),
    (r'와\(과\)', 'literal 와(과)'),
    (r'은\(는\)', 'literal 은(는)'),
    (r'\\\$\{[^}]+\}', 'unfilled template'),
    (r'(?<!")undefined(?!")', 'undefined leak'),
    (r'(흐름|결|기운|톤|색|구도|구간|구조|분위기)\.\s', 'bare-noun period'),
]

total_warns = 0
for label, path in ENDPOINTS:
    try:
        with open(path) as f:
            r = json.load(f)
    except Exception as e:
        print(f'[ERR] {label}: {e}')
        continue
    text = json.dumps(r, ensure_ascii=False)
    print(f'=== {label} ({len(text)} chars) ===')
    for pat, name in PATTERNS:
        m = re.findall(pat, text)
        if m:
            total_warns += 1
            print(f'  [WARN] {name}: {len(m)}건 — {m[:2]}')
        else:
            print(f'  [OK]   {name}: 0건')

print()
print(f'TOTAL WARNINGS: {total_warns}')
PY
