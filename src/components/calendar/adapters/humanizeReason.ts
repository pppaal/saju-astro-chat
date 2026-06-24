/**
 * topReasons / cautions 평어화 — destinypal *표시 전용*.
 *
 * 엔진의 cell.topReasons 는 `↑ [세운] Uranus 어포지션 본명 Pluto` 처럼 영어 행성명·
 * 음역 각·[layer] 태그가 섞인 원시 라벨이다. 이걸 일반 사용자가 읽히게 바꾸되:
 *   - 영어 행성/포인트 → 한국어 (Uranus→천왕성)
 *   - 음역 각 → 관계 평어 (어포지션→대립각, 스퀘어→긴장각)
 *   - [세운]/[대운] → 시간대 평어 (올해/10년 흐름)
 *   - 본명 → 타고난
 *   - 별자리 영문 → 한국어
 * *사주 한국어 용어(삼합격·정관·지지충…)는 손대지 않는다* — 도메인 적절어이고,
 * 풀어 쓰면 오히려 의미를 지어내는 노이즈가 된다(타이밍 > 의미매핑 원칙).
 *
 * 표시 레이어에서만 동작 — 공유 CalendarCell.topReasons(구 캘린더·골든테스트 소비)
 * 는 건드리지 않는다.
 */

import { PLANET_KO } from './shared'

const POINT_KO: Record<string, string> = {
  ...PLANET_KO,
  'True Node': '북교점',
  'North Node': '북교점',
  'South Node': '남교점',
  Node: '교점',
  Lilith: '릴리스',
  Chiron: '카이런',
  Vertex: '버텍스',
}

const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

// 조후용신 라벨(extractors/saju-johu-yongsin.ts)의 月支 → 계절 평어.
//   寅卯辰=봄 · 巳午未=여름 · 申酉戌=가을 · 亥子丑=겨울
const BRANCH_SEASON: Record<string, string> = {
  寅: '봄',
  卯: '봄',
  辰: '봄',
  巳: '여름',
  午: '여름',
  未: '여름',
  申: '가을',
  酉: '가을',
  戌: '가을',
  亥: '겨울',
  子: '겨울',
  丑: '겨울',
}

// 오행(五行) → 일상어. "수가 … 균형" 같은 한자 음역 노출 방지.
const ELEMENT_PLAIN: Record<string, string> = {
  목: '나무',
  화: '불',
  토: '흙',
  금: '금',
  수: '물',
}

// "午月 조후 — 수가 열 균형에 필요" → "여름엔 물 기운이 균형에 도움".
const JOHU_RE = /^([子丑寅卯辰巳午未申酉戌亥])月\s*조후\s*[—\-]\s*([목화토금수])[이가]\s+\S+\s+균형에 필요$/

const LAYER_PLAIN: Record<string, string> = {
  대운: '10년 흐름',
  세운: '올해',
  월운: '이달',
  일진: '오늘',
  시: '지금',
  정점: '정점',
}

// 음역/영문 각 → 관계 평어. 큰 순서 무관 (단일 토큰).
const ASPECT_PLAIN: Record<string, string> = {
  컨정션: '겹침',
  conjunction: '겹침',
  어포지션: '대립각',
  opposition: '대립각',
  스퀘어: '긴장각',
  square: '긴장각',
  트라인: '조화각',
  trine: '조화각',
  섹스타일: '기회각',
  sextile: '기회각',
  퀸컹스: '어긋남각',
  quincunx: '어긋남각',
  반섹스타일: '미세각',
  semisextile: '미세각',
}

const ASPECT_TOKENS = Object.keys(ASPECT_PLAIN).join('|')
// "Mars 스퀘어 본명 Mars" / "Uranus 어포지션 본명 Pluto" 형태의 트랜짓 라벨.
const TRANSIT_RE = new RegExp(
  `^([A-Za-z][\\w ]*?)\\s+(${ASPECT_TOKENS})\\s+본명\\s+([A-Za-z][\\w ]*?)$`,
  'i'
)

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pointKo(name: string): string {
  return POINT_KO[name.trim()] ?? name.trim()
}

/** 받침 유무로 주격 조사 선택 (목성→이, 화성→이, 달→이, 릴리스→가). */
function subjJosa(word: string): string {
  const w = word.trim()
  const c = w.charCodeAt(w.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return '가' // 한글 외(영문 등)는 받침 없음 취급
  return (c - 0xac00) % 28 !== 0 ? '이' : '가'
}

// dignity 라벨을 통째로 일상어로. 행성명은 이미 koPlanet 로 한글이 들어옴.
//   "목성 엑잘테이션 (고양) (게자리)" → "목성이 가장 좋은 자리"
const DIGNITY_PLAIN: Array<{ term: RegExp; plain: string }> = [
  { term: /엑잘테이션\s*\(고양\)/, plain: '가장 좋은 자리' },
  { term: /디트리먼트\s*\([^)]*\)/, plain: '약해지는 자리' },
  { term: /폴\s*\(추락\)/, plain: '가장 약한 자리' },
  { term: /룰러십\s*\([^)]*\)/, plain: '제 힘을 내는 자리' },
]

/**
 * EN 라벨 평어화 — 영문 콘텐츠는 한글화하지 않고, dignity 전문용어만
 * 일상어 먼저 + 용어 괄호로 부드럽게(엑잘테이션 등 음역 노출 방지).
 */
function humanizeLabelEn(label: string): string {
  return (
    label
      .replace(/\bin Exaltation\b/g, 'at its best (exaltation)')
      .replace(/\bin Detriment\b/g, 'weakened (detriment)')
      .replace(/\bin Fall\b/g, 'at its weakest (fall)')
      .replace(/\bin Domicile\b/g, 'on home ground (domicile)')
      // bare forms (no "in" prefix) as a fallback
      .replace(/\bExaltation\b/g, 'at its best (exaltation)')
      .replace(/\bDetriment\b/g, 'weakened (detriment)')
      .replace(/\bFall\b/g, 'at its weakest (fall)')
      .replace(/\bDomicile\b/g, 'on home ground (domicile)')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

/** 라벨(태그 제외) 평어화. */
function humanizeLabel(label: string): string {
  // 1) 트랜짓 패턴은 통째로 재구성 — "천왕성 ↔ 타고난 명왕성 · 대립각".
  const tm = label.match(TRANSIT_RE)
  if (tm) {
    const [, a, asp, b] = tm
    return `${pointKo(a)} ↔ 타고난 ${pointKo(b)} · ${ASPECT_PLAIN[asp.toLowerCase()] ?? ASPECT_PLAIN[asp] ?? asp}`
  }
  // 1.5) 조후용신 라벨 — 한자 月支·오행·'조후'를 계절+일상어로.
  //   "午月 조후 — 수가 열 균형에 필요" → "여름엔 물 기운이 균형에 도움".
  const jm = label.match(JOHU_RE)
  if (jm) {
    const season = BRANCH_SEASON[jm[1]] ?? ''
    const elem = ELEMENT_PLAIN[jm[2]] ?? jm[2]
    return season ? `${season}엔 ${elem} 기운이 균형에 도움` : `${elem} 기운이 균형에 도움`
  }
  // 1.6) dignity 라벨 — "목성 엑잘테이션 (고양) (게자리)" → "목성이 가장 좋은 자리".
  //   (행성명만 살리고 음역 전문용어·별자리 괄호는 떨군다.)
  for (const d of DIGNITY_PLAIN) {
    const dm = label.match(new RegExp(`^(\\S+)\\s+${d.term.source}(?:\\s*\\([^)]*\\))?\\s*$`))
    if (dm) {
      const planet = pointKo(dm[1])
      return `${planet}${subjJosa(planet)} ${d.plain}`
    }
  }
  let t = label
  // 2) dignity 잔재(비표준 형태) 폴백 — 음역 전문용어를 일상어로(괄호 제거).
  t = t
    .replace(/엑잘테이션\s*\(고양\)/g, '가장 좋은 자리')
    .replace(/디트리먼트\s*\([^)]*\)/g, '약해지는 자리')
    .replace(/폴\s*\(추락\)/g, '가장 약한 자리')
    .replace(/룰러십\s*\([^)]*\)/g, '제 힘을 내는 자리')
  // 3) 영어 포인트 → 한국어 (긴 키 먼저: 'True Node' 가 'Node' 보다 우선).
  for (const en of Object.keys(POINT_KO).sort((a, b) => b.length - a.length)) {
    t = t.replace(new RegExp(`\\b${escapeReg(en)}\\b`, 'g'), POINT_KO[en])
  }
  // 4) 별자리 영문 → 한국어.
  for (const en of Object.keys(SIGN_KO)) {
    t = t.replace(new RegExp(`\\b${en}\\b`, 'g'), SIGN_KO[en])
  }
  // 5) 남은 음역 각 토큰 → 평어.
  for (const asp of Object.keys(ASPECT_PLAIN)) {
    t = t.replace(new RegExp(escapeReg(asp), 'g'), ASPECT_PLAIN[asp])
  }
  // 6) 본명 → 타고난.
  t = t.replace(/본명/g, '타고난')
  return t.replace(/\s{2,}/g, ' ').trim()
}

/**
 * `↑ [세운] Uranus 어포지션 본명 Pluto` → `↑ 올해 · 천왕성 ↔ 타고난 명왕성 · 대립각`.
 * 형식이 안 맞으면 라벨만 평어화해서 반환(견고).
 *
 * ⚠ lang 분기 필수 — humanizeLabel 은 영어 행성/별자리명을 *한국어로 치환*한다
 * (Uranus→천왕성). EN 사유(topReasonsEn)에 그대로 먹이면 영어 콘텐츠가 한글로
 * 오염된다(직전 버그: EN 일진 사유가 "↑ year · 천왕성 ↔ ... 명왕성"). EN 은
 * 이미 영문이므로 한글화 없이 `[layer]` 괄호만 풀어 톤·시간대·라벨로 재배치한다.
 */
export function humanizeReason(raw: string, lang: 'ko' | 'en' = 'ko'): string {
  const m = raw.match(/^(\S+)\s*\[([^\]]+)\]\s*(.*)$/)
  if (!m) return lang === 'en' ? raw : humanizeLabel(raw)
  const [, tone, layer, label] = m
  if (lang === 'en') {
    const enLabel = humanizeLabelEn(label)
    return enLabel ? `${tone} ${layer} · ${enLabel}` : `${tone} ${layer}`
  }
  const lp = LAYER_PLAIN[layer] ?? layer
  const body = humanizeLabel(label)
  return body ? `${tone} ${lp} · ${body}` : `${tone} ${lp}`
}
