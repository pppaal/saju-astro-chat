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
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '궁수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}

const LAYER_PLAIN: Record<string, string> = {
  대운: '10년 흐름', 세운: '올해', 월운: '이달', 일진: '오늘', 시: '지금', 정점: '정점',
}

// 음역/영문 각 → 관계 평어. 큰 순서 무관 (단일 토큰).
const ASPECT_PLAIN: Record<string, string> = {
  컨정션: '겹침', conjunction: '겹침',
  어포지션: '대립각', opposition: '대립각',
  스퀘어: '긴장각', square: '긴장각',
  트라인: '조화각', trine: '조화각',
  섹스타일: '기회각', sextile: '기회각',
  퀸컹스: '어긋남각', quincunx: '어긋남각',
  반섹스타일: '미세각', semisextile: '미세각',
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

/** 라벨(태그 제외) 평어화. */
function humanizeLabel(label: string): string {
  // 1) 트랜짓 패턴은 통째로 재구성 — "천왕성 ↔ 타고난 명왕성 · 대립각".
  const tm = label.match(TRANSIT_RE)
  if (tm) {
    const [, a, asp, b] = tm
    return `${pointKo(a)} ↔ 타고난 ${pointKo(b)} · ${ASPECT_PLAIN[asp.toLowerCase()] ?? ASPECT_PLAIN[asp] ?? asp}`
  }
  let t = label
  // 2) dignity 군더더기 괄호 정리.
  t = t
    .replace(/엑잘테이션\s*\(고양\)/g, '고양')
    .replace(/디트리먼트\s*\([^)]*\)/g, '기운 약화')
    .replace(/폴\s*\(추락\)/g, '추락')
    .replace(/룰러십\s*\([^)]*\)/g, '제자리 힘')
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
 */
export function humanizeReason(raw: string): string {
  const m = raw.match(/^(\S+)\s*\[([^\]]+)\]\s*(.*)$/)
  if (!m) return humanizeLabel(raw)
  const [, tone, layer, label] = m
  const lp = LAYER_PLAIN[layer] ?? layer
  const body = humanizeLabel(label)
  return body ? `${tone} ${lp} · ${body}` : `${tone} ${lp}`
}
