/**
 * matchedPatterns 의 사용자 노출 문자열(name, headline, action) 의 EN 매핑.
 * 엔진은 KO 로만 stamp 하고 route.ts 가 locale === 'en' 일 때 이 사전으로
 * 대체. 매칭 안 되면 KO 그대로 (graceful).
 *
 * action 은 DayDomains chip 의 '행동' / 'Do' 라벨로 노출 (PR Phase 1 — DB 풀텍스트 연결).
 */

export interface PatternI18nEntry {
  name: string
  headline?: string
  action?: string
}

export const PATTERN_I18N_EN: Record<string, PatternI18nEntry> = {
  'wealth-golden-week': {
    name: 'Wealth golden week',
    headline: 'Wealth flow comes in strongly today',
    action:
      'Favorable for investments, contracts, major financial decisions, and money cleanup. A good day to handle delayed money matters.',
  },
  'romance-trigger': {
    name: 'Romance trigger',
    headline: 'A new connection draws closer today',
    action:
      'Favorable for introductions, gatherings, and reaching out. A new connection may show up in an unexpected place.',
  },
  'shadow-cluster': {
    name: 'Cautious cluster day',
    headline: 'Caution mode — postpone big decisions',
    action:
      'Postpone big decisions, contracts, moves, and new starts to a better day. Focus on keeping your daily routine.',
  },
  'five-layer-resonance': {
    name: '5-layer alignment (Saju × Astro)',
    headline: 'Saju 5 + Astro 4 — east-west fully aligned',
    action:
      'A prime window for big decisions. A rare period when saju and astrology give the same answer.',
  },
  'saju-five-layer': {
    name: 'Saju 5-layer alignment',
    headline: 'All 5 saju time axes point the same way',
    action:
      'A period when all the destiny-flow axes align. Strong push for big decisions and new starts.',
  },
  'astro-five-layer': {
    name: 'Astro 4-layer alignment',
    headline: 'Astro time axes (chapter · year · month · day) aligned',
    action:
      'An astrological alignment period. The outer environment and opportunities point the same way.',
  },
  'noble-fortune': {
    name: 'Noble fortune',
    headline: 'A good day to ask for help',
    action:
      'Favors favors, advice, and important meetings. A good day to reach out to contacts you have not spoken to in a while.',
  },
  'life-chapter-shift': {
    name: 'Life chapter shift',
    headline: 'A turning point in the big arc',
    action:
      'A good time to redraw the big picture. Do not get caught up in small matters — check your overall direction.',
  },
  'gwan-in-flow': {
    name: 'Authority × Resource flow',
    headline: 'Recognition and promotion channels open',
    action:
      'Favorable for promotions, certifications, approvals, and official procedures. A good time to make a formal pitch to seniors or institutions.',
  },
  'siksang-wealth': {
    name: 'Output → Wealth flow',
    headline: 'Skill translates into income',
    action:
      'Favorable for monetizing content, sales, side projects, and creative work. Move toward selling what you have made.',
  },
  'wealth-to-status': {
    name: 'Wealth → Status flow',
    headline: 'Money converts to position and trust',
    action:
      'A good time to convert results into title, contracts, and reputation. Investment now returns as standing.',
  },
  'wealth-rivalry': {
    name: 'Wealth rivalry',
    headline: 'Money may leak from rivalry or splits',
    action:
      'Be careful with partnerships, loans, and shared expenses. Make your share clear and postpone big spending.',
  },
  'output-vs-authority': {
    name: 'Output vs Authority',
    headline: 'Friction with rules or superiors',
    action:
      'Watch friction with bosses, contracts, laws, and rules. Avoid impulsive remarks and social-media flare-ups; keep official procedures crisp.',
  },
  'siksin-controls-pressure': {
    name: 'Output controls pressure',
    headline: 'Break through pressure with skill',
    action:
      'A good time to break through tough work or competition with straightforward skill. Consistent routine beats the pressure.',
  },
  'expression-with-restraint': {
    name: 'Expression with restraint',
    headline: 'Creativity tempered by discipline',
    action:
      'A good time to add depth to creation, planning, and presentation. Polish sparky ideas with study to raise finish quality.',
  },
  'authority-mixed': {
    name: 'Mixed authority',
    headline: 'Authority signals tangled — focus blurs',
    action: 'Multiple superiors or standards may clash. Pick one line and put aside side requests.',
  },
}
