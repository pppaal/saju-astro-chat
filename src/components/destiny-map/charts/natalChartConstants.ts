// 출생차트(natal chart) 공용 상수/헬퍼.
// NatalChart(단일 휠, SIZE 240)와 CompatNatalOverlay(시너스트리 바이휠,
// SIZE 260)가 똑같이 들고 있던 황도/행성 글리프·순서와 SIZE 무관 헬퍼만
// 모았다. SIZE·CX·CY·pt 는 차트마다 달라(240 vs 260) 각 파일에 남긴다.

export const ZODIAC_GLYPHS = [
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
] as const

export const SIGN_KO = [
  '양',
  '황소',
  '쌍둥이',
  '게',
  '사자',
  '처녀',
  '천칭',
  '전갈',
  '궁수',
  '염소',
  '물병',
  '물고기',
] as const

export const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Node: '☊',
  'True Node': '☊',
  'North Node': '☊',
}

export const PLANET_ORDER = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Node',
  'True Node',
  'North Node',
]

/** 왼쪽 ASC 라벨이 안 잘리도록 하는 가로 여백. */
export const NATAL_CHART_PAD = 22

/**
 * 황경(lon)을 화면 각도로. ASC 를 9시(180°)에 고정하고 황경이 커질수록
 * 반시계로 증가. SIZE 와 무관해 두 차트가 그대로 공유한다.
 */
export const screenDeg = (lon: number, asc: number) => 180 + (lon - asc)
