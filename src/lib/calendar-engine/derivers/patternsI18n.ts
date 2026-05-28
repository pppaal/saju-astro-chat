/**
 * matchedPatterns 의 사용자 노출 문자열(name, headline) 의 EN 매핑.
 * 엔진은 KO 로만 stamp 하고 route.ts 가 locale === 'en' 일 때 이 사전으로
 * 대체. 매칭 안 되면 KO 그대로 (graceful).
 *
 * description / action 은 현재 UI 미사용 (DayDomains chip 은 name + headline 만
 * 노출) — 필요해지면 그 때 추가.
 */

export interface PatternI18nEntry {
  name: string
  headline?: string
}

export const PATTERN_I18N_EN: Record<string, PatternI18nEntry> = {
  'wealth-golden-week': {
    name: 'Wealth golden week',
    headline: 'Wealth flow comes in strongly today',
  },
  'romance-trigger': {
    name: 'Romance trigger',
    headline: 'A new connection draws closer today',
  },
  'shadow-cluster': {
    name: 'Cautious cluster day',
    headline: 'Caution mode — postpone big decisions',
  },
  'five-layer-resonance': {
    name: '5-layer alignment (Saju × Astro)',
    headline: 'Saju 5 + Astro 4 — east-west fully aligned',
  },
  'saju-five-layer': {
    name: 'Saju 5-layer alignment',
    headline: 'All 5 saju time axes point the same way',
  },
  'astro-five-layer': {
    name: 'Astro 4-layer alignment',
    headline: 'Astro time axes (chapter · year · month · day) aligned',
  },
  'noble-fortune': {
    name: 'Noble fortune',
    headline: 'A good day to ask for help',
  },
  'life-chapter-shift': {
    name: 'Life chapter shift',
    headline: 'A turning point in the big arc',
  },
  'gwan-in-flow': {
    name: 'Authority × Resource flow',
    headline: 'Recognition and promotion channels open',
  },
  'siksang-wealth': {
    name: 'Output → Wealth flow',
    headline: 'Skill translates into income',
  },
  'wealth-to-status': {
    name: 'Wealth → Status flow',
    headline: 'Money converts to position and trust',
  },
  'wealth-rivalry': {
    name: 'Wealth rivalry',
    headline: 'Money may leak from rivalry or splits',
  },
  'output-vs-authority': {
    name: 'Output vs Authority',
    headline: 'Friction with rules or superiors',
  },
  'siksin-controls-pressure': {
    name: 'Output controls pressure',
    headline: 'Break through pressure with skill',
  },
  'expression-with-restraint': {
    name: 'Expression with restraint',
    headline: 'Creativity tempered by discipline',
  },
  'authority-mixed': {
    name: 'Mixed authority',
    headline: 'Authority signals tangled — focus blurs',
  },
}
