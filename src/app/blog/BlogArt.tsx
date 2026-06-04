/**
 * BlogArt — 블로그 카드/상세 헤더용 코스믹 골드 SVG 일러스트.
 *
 * 기존 컬러 이모지(🎴💕🗺️ 등)를 대체. 사이트의 다크 코스믹 + 골드 미감
 * (about 페이지의 단색 글리프 시스템)과 정렬되도록 골드 그라데이션 + 별가루로
 * 그렸다. slug 별 고유 모티프를 주고, 매칭 안 되면 category 로 폴백한다.
 *
 * viewBox 400×220, preserveAspectRatio="xMidYMid slice" 로 카드 이미지 영역을
 * 가득 채운다. 부모(.cardImagePlaceholder / .headerIcon)가 크기를 정한다.
 */

type Props = {
  slug?: string
  category?: string
  className?: string
}

const GOLD = '#e8cc8a'
const GOLD_MID = '#c19b56'
const GOLD_DEEP = '#a07a3c'

/** 공유 starfield — 좌표 고정(난수 X, SSR 안정). */
function Stars() {
  const pts: Array<[number, number, number]> = [
    [40, 36, 1.6],
    [120, 24, 1],
    [330, 40, 1.4],
    [368, 96, 1],
    [28, 150, 1.2],
    [200, 30, 0.9],
    [300, 180, 1.3],
    [80, 188, 1],
    [360, 158, 1.1],
  ]
  return (
    <g fill="#fff" opacity="0.55">
      {pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} opacity={0.3 + (i % 3) * 0.2} />
      ))}
    </g>
  )
}

/** 사주 — 네 기둥(사주팔자) */
function SajuArt() {
  const cols = [
    { x: 150, h: 96 },
    { x: 182, h: 120 },
    { x: 214, h: 78 },
    { x: 246, h: 108 },
  ]
  const baseY = 168
  return (
    <g>
      {cols.map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={baseY - c.h}
            width="20"
            height={c.h}
            rx="10"
            fill="url(#bgGold)"
            opacity="0.92"
          />
          <circle cx={c.x + 10} cy={baseY - c.h} r="4.5" fill={GOLD} />
          {/* 효(爻) 같은 가로 눈금 */}
          <line x1={c.x + 4} y1={baseY - c.h * 0.45} x2={c.x + 16} y2={baseY - c.h * 0.45} stroke="#0c0f22" strokeWidth="2" opacity="0.5" />
          <line x1={c.x + 4} y1={baseY - c.h * 0.7} x2={c.x + 16} y2={baseY - c.h * 0.7} stroke="#0c0f22" strokeWidth="2" opacity="0.5" />
        </g>
      ))}
      <line x1="138" y1={baseY + 6} x2="288" y2={baseY + 6} stroke={GOLD_MID} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
    </g>
  )
}

/** 점성술 — 출생 차트 휠 */
function AstrologyArt() {
  const cx = 200
  const cy = 110
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12
    return {
      x1: cx + Math.cos(a) * 40,
      y1: cy + Math.sin(a) * 40,
      x2: cx + Math.cos(a) * 70,
      y2: cy + Math.sin(a) * 70,
    }
  })
  return (
    <g stroke={GOLD_MID} fill="none">
      <circle cx={cx} cy={cy} r="72" stroke="url(#bgGold)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="40" stroke={GOLD_DEEP} strokeWidth="1.5" opacity="0.8" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth="1.3" opacity="0.7" />
      ))}
      <g stroke="none" fill={GOLD}>
        <circle cx={cx} cy={cy} r="4" />
        <circle cx={cx + 26} cy={cy - 22} r="2.4" />
        <circle cx={cx - 30} cy={cy + 14} r="2" />
        <circle cx={cx + 10} cy={cy + 30} r="1.8" />
      </g>
    </g>
  )
}

/** 타로 — 부채꼴로 펼친 세 장의 카드 */
function TarotArt() {
  return (
    <g>
      {[-18, 0, 18].map((rot, i) => (
        <g key={i} transform={`rotate(${rot} 200 130)`}>
          <rect
            x="178"
            y="58"
            width="44"
            height="70"
            rx="6"
            fill="#0c1024"
            stroke="url(#bgGold)"
            strokeWidth="2"
          />
          {i === 1 && (
            <g fill={GOLD} stroke="none">
              <path d="M200 74 l3 7 7 1 -5 5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -5 7 -1 z" />
              <circle cx="200" cy="110" r="2" opacity="0.8" />
            </g>
          )}
        </g>
      ))}
    </g>
  )
}

/** 궁합 — 겹친 두 원(조화) */
function CompatibilityArt() {
  const cy = 110
  return (
    <g fill="none">
      <circle cx="172" cy={cy} r="46" stroke="url(#bgGold)" strokeWidth="2.2" />
      <circle cx="228" cy={cy} r="46" stroke={GOLD_MID} strokeWidth="2.2" />
      <g fill={GOLD} stroke="none">
        <circle cx="172" cy={cy - 46} r="3.4" />
        <circle cx="228" cy={cy - 46} r="3.4" />
        {/* 겹친 영역의 스파크 */}
        <path d="M200 96 l2.5 6 6 0.8 -4.4 4.2 1.2 6 -5.3 -3 -5.3 3 1.2 -6 -4.4 -4.2 6 -0.8 z" />
      </g>
    </g>
  )
}

/** 데스티니 — 별자리 경로(인생 청사진) */
function DestinyArt() {
  const nodes: Array<[number, number]> = [
    [120, 150],
    [165, 110],
    [205, 132],
    [248, 84],
    [290, 104],
  ]
  return (
    <g>
      <polyline
        points={nodes.map((n) => n.join(',')).join(' ')}
        fill="none"
        stroke="url(#bgGold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 7"
      />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === nodes.length - 1 ? 5.5 : 3.2} fill={i === nodes.length - 1 ? GOLD : GOLD_MID} />
      ))}
      {/* 목적지 별 glow */}
      <circle cx="290" cy="104" r="11" fill={GOLD} opacity="0.16" />
    </g>
  )
}

/** 타로 연애 — 카드 + 별자리 하트 */
function TarotLoveArt() {
  return (
    <g>
      <g transform="rotate(-6 200 132)">
        <rect x="176" y="70" width="48" height="74" rx="7" fill="#0c1024" stroke="url(#bgGold)" strokeWidth="2" />
      </g>
      {/* 별로 그린 하트 */}
      <g fill={GOLD} stroke="none">
        <circle cx="186" cy="60" r="2.6" />
        <circle cx="214" cy="60" r="2.6" />
        <circle cx="176" cy="72" r="2" />
        <circle cx="224" cy="72" r="2" />
        <circle cx="200" cy="96" r="2.8" />
        <circle cx="190" cy="86" r="1.8" />
        <circle cx="210" cy="86" r="1.8" />
      </g>
      <path
        d="M200 92 C 192 80 178 80 178 68 C 178 60 188 58 192 64 C 195 68 200 72 200 72 C 200 72 205 68 208 64 C 212 58 222 60 222 68 C 222 80 208 80 200 92 Z"
        fill="none"
        stroke={GOLD_MID}
        strokeWidth="1.3"
        opacity="0.55"
      />
    </g>
  )
}

function pickMotif(slug?: string, category?: string) {
  switch (slug) {
    case 'what-is-saju-four-pillars-destiny':
      return <SajuArt />
    case 'understanding-western-astrology-birth-chart':
      return <AstrologyArt />
    case 'tarot-card-meanings-beginners-guide':
      return <TarotArt />
    case 'compatibility-astrology-relationship-guide':
      return <CompatibilityArt />
    case 'destiny-map-life-blueprint-guide':
      return <DestinyArt />
    case 'tarot-love-reading-complete-guide':
      return <TarotLoveArt />
  }
  // category 폴백
  switch (category) {
    case 'Saju':
      return <SajuArt />
    case 'Astrology':
      return <AstrologyArt />
    case 'Tarot':
      return <TarotArt />
    case 'Compatibility':
      return <CompatibilityArt />
    default:
      return <AstrologyArt />
  }
}

/** Hero 엠블럼 — 블로그 상단 📚 대체. 펼친 책 + 별. */
export function BlogHeroArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" role="presentation">
      <defs>
        <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD} />
          <stop offset="1" stopColor={GOLD_DEEP} />
        </linearGradient>
      </defs>
      <path d="M32 20 C 24 15 14 16 10 18 L10 46 C 14 44 24 43 32 48 C 40 43 50 44 54 46 L54 18 C 50 16 40 15 32 20 Z"
        fill="none" stroke="url(#heroGold)" strokeWidth="2.4" strokeLinejoin="round" />
      <line x1="32" y1="20" x2="32" y2="48" stroke={GOLD_MID} strokeWidth="2" opacity="0.7" />
      <g fill={GOLD}>
        <path d="M32 6 l2 5 5 1 -4 3.5 1 5 -4 -2.6 -4 2.6 1 -5 -4 -3.5 5 -1 z" />
        <circle cx="14" cy="10" r="1.6" />
        <circle cx="52" cy="12" r="1.4" />
      </g>
    </svg>
  )
}

/** 작은 별 — featured 뱃지. currentColor 상속. */
export function StarGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M8 1 l1.9 4.3 4.6 0.5 -3.5 3.1 1 4.6 -4 -2.4 -4 2.4 1 -4.6 -3.5 -3.1 4.6 -0.5 z" />
    </svg>
  )
}

/** 작은 시계 — 읽기 시간. currentColor 상속. */
export function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.4 V8 l2.6 1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BlogArt({ slug, category, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id="bgGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD} />
          <stop offset="1" stopColor={GOLD_DEEP} />
        </linearGradient>
        <radialGradient id="bgGlow" cx="50%" cy="46%" r="60%">
          <stop offset="0" stopColor={GOLD_MID} stopOpacity="0.22" />
          <stop offset="1" stopColor={GOLD_MID} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="400" height="220" fill="url(#bgGlow)" />
      <Stars />
      {pickMotif(slug, category)}
    </svg>
  )
}
