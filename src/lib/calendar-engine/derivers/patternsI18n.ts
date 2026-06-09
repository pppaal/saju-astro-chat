/**
 * matchedPatterns 의 사용자 노출 문자열(name, headline, description, action) 의 EN 매핑.
 * 엔진(derivePatterns)이 KO 로 stamp 하면서 이 사전으로 nameEn/headlineEn/
 * descriptionEn/actionEn 을 함께 채운다. route.ts·cellsToYearlyDates 는 그 EN
 * 필드를 쓴다. 매칭 안 되면 KO 그대로 (graceful). 패턴 EN 의 단일 출처(SSOT).
 *
 * action 은 DayDomains chip 의 '행동' / 'Do' 라벨로 노출.
 */

export interface PatternI18nEntry {
  name: string
  headline?: string
  description?: string
  action?: string
}

export const PATTERN_I18N_EN: Record<string, PatternI18nEntry> = {
  'wealth-golden-week': {
    name: 'Wealth golden week',
    headline: 'Money domain — favorable for big financial calls today',
    description: "today's Wealth star + a benefic transit peak land together",
    action:
      'Money domain favorable. Close one delayed investment, contract, or financial cleanup today, and spend 30 minutes tidying one bank or brokerage account.',
  },
  'romance-trigger': {
    name: 'Romance trigger',
    headline: 'Relationship domain — a new connection draws closer today',
    description: "today's Peach Blossom / Red Glamour + a Venus transit peak",
    action:
      'Relationship domain favorable. Show up at one introduction or gathering today, or send the first message to someone you have been thinking about. A new connection may surface in an unexpected place.',
  },
  'shadow-cluster': {
    name: 'Cautious cluster day',
    headline: 'Health and daily-routine domain — hold off on big calls today',
    description: 'four or more strong malefic signals fire today',
    action:
      'Postpone big decisions, contracts, moves, job changes, and new starts to the next favorable day. Lock down one daily-routine essential (meals, sleep, safe driving) and avoid risky travel, heavy drinking, and big spending.',
  },
  'five-layer-resonance': {
    name: '5-layer alignment (Saju × Astro)',
    headline: 'Life and career domain — strongest push signal in over a year',
    description: 'all 5 saju layers + 4 astro layers point the same way',
    action:
      'Saju and astrology give the same answer. Close one of your biggest delayed decisions (job change, launch, marriage, move, major investment) this week and take the first concrete execution step.',
  },
  'saju-five-layer': {
    name: 'Saju 5-layer alignment',
    headline: 'Career and life domain — saju time axes all point one direction this month',
    description: 'all 5 saju time-axes run the same direction',
    action:
      'Strong push for big career and life decisions. This month, pick one delayed major decision (job change, business, contract, exam) and move it forward through the first real application, filing, or meeting.',
  },
  'astro-five-layer': {
    name: 'Astro 4-layer alignment',
    headline: 'Career and external-opportunity domain — environment points one way this month',
    description: 'all 4 astro time-axes run the same direction (chapter, year, month, day)',
    action:
      'External environment and opportunities all line up. This month, pick one delayed outward action (application, pitch, exposure, launch, relocation) and push it to actual submission or send.',
  },
  'noble-fortune': {
    name: 'Noble fortune',
    headline: 'Relationship and network domain — easy day to receive help',
    description: 'Heavenly Noble (Cheoneul-gwiin) day + a benefic trine',
    action:
      'Relationship and network domain favorable. Today, make one ask, request one piece of advice, attend one important meeting, and send a first message to someone you have drifted from.',
  },
  'life-chapter-shift': {
    name: 'Life chapter shift',
    headline: 'Life-direction domain — chapter-changing turning point',
    description: 'outer-planet transit peak + lifecycle/ZR background',
    action:
      'Time to redesign life direction. Spend 30 minutes today rewriting your 1, 3, and 5-year goals on paper, and explicitly name one thing to wrap up and one thing to start. Park the small stuff for now.',
  },
  'gwan-in-flow': {
    name: 'Authority × Resource flow',
    headline: 'Work and promotion domain — approval and credential lines open up',
    description: 'Officer + Resource run together (recognition from above + backing support)',
    action:
      'Work and promotion domain favorable. This week, submit one formal proposal, promotion application, or credential registration to a senior or institution through the official channel.',
  },
  'siksang-wealth': {
    name: 'Output → Wealth flow',
    headline: 'Creative and revenue domain — what you made turns into income',
    description: 'Output (expression/production) + Wealth run together',
    action:
      'Creative and revenue domain favorable. This week, take one piece of content, course, prototype, or service you have already built and convert it into a real sales page, sales message, or invoice to open the first revenue line.',
  },
  'wealth-to-status': {
    name: 'Wealth → Status flow',
    headline: 'Work and reputation domain — results convert into title and trust',
    description: 'Wealth + Officer run together (results become title and reputation)',
    action:
      'Work and reputation domain favorable. This week, package recent revenue, results, and metrics into a one-pager, show it to a senior, client, or the market, and start one negotiation on title, renewal, or rate.',
  },
  'wealth-rivalry': {
    name: 'Wealth rivalry',
    headline: 'Money domain — money can leak through rivalry or splits',
    description: 'Peer/rival + Wealth run together and tilt unfavorably for this chart',
    action:
      'Money domain — be careful. Postpone new partnerships, personal loans, shared investments, and new installment plans this month. For deals already in motion, lock your share and exit terms in writing, and push one big purchase to next month.',
  },
  'output-vs-authority': {
    name: 'Output vs Authority',
    headline: 'Work and relationship domain — friction with rules or superiors',
    description:
      'Hurting Officer (free expression) + Direct Officer (rules/authority) run toward conflict',
    action:
      'Work and relationship domain — be careful. Hold off on emotional confrontations with bosses, clients, or officials this week; avoid public callouts and spontaneous contract breaches; and let any email or approval sit for 12 hours before sending.',
  },
  'siksin-controls-pressure': {
    name: 'Output controls pressure',
    headline: 'Work and skill domain — push through pressure with skill',
    description:
      'Eating God (steady production) + Seven Killer (pressure/competition) run toward control',
    action:
      'Work and skill domain favorable. Pick the most intimidating piece of work, exam, or assignment you have been avoiding, tackle it head-on this week, and protect a daily 30-minute work block at the same time every day.',
  },
  'expression-with-restraint': {
    name: 'Expression with restraint',
    headline: 'Creative and learning domain — take ideas from spark to finished work',
    description: 'Hurting Officer (free talent) + Resource (restraint/learning) run toward balance',
    action:
      'Creative and learning domain favorable. Pick one writing, plan, talk, or piece of work in progress; add research or reference study to refine it this week; and carry it from draft to final.',
  },
  'authority-mixed': {
    name: 'Mixed authority',
    headline: 'Work and organization domain — competing lines and standards scatter focus',
    description: 'Direct + Indirect Officer rise together, blurring decisions and reporting lines',
    action:
      'Work and organization domain — be careful. This week, pick one reporting line as the primary, hold the others aside, and politely decline or defer one side request to next month.',
  },
  'wealth-erodes-resource': {
    name: 'Wealth erodes resource',
    headline: 'Money and reputation domain — short-term gain can erode trust or learning',
    description: 'Wealth + Resource run in opposition (Wealth breaks Resource)',
    action:
      'Money and reputation domain — be careful. This week, turn down one short-term gig, side project, or freelance offer that would eat into your reputation, credentials, day job, or studies, and keep your study and certification schedule intact.',
  },
  'energy-into-output': {
    name: 'Output discharge',
    headline: 'Creative and activity domain — pour surplus energy into finished output',
    description: 'Peer (self-energy) + Output (expression/production) run toward release',
    action:
      'Creative and activity domain favorable. This week, ship one collaboration, talk, livestream, performance, workout block, or contest entry, and take one shelved draft all the way to public release.',
  },
  'support-reinforcement': {
    name: 'Support reinforcement',
    headline: 'Health and relationship domain — recover energy with help from those around you',
    description: 'Resource (backing) + Peer (allies/self) reinforce a weak day master',
    action:
      'Health and relationship domain favorable. This week, ask a colleague, family member, or specialist to share one thing you have been carrying alone, and keep one daily 30-minute rest, exercise, or sleep-recovery routine.',
  },
}
