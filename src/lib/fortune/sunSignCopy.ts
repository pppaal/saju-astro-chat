/**
 * Daily sun-sign horoscope — text bank (English only).
 *
 * The engine in ./sunSignDaily.ts decides WHAT is true today (Moon sign and
 * phase, aspects to the sign's midpoint, retrogrades, the ruler's condition)
 * and turns it into a 1–5 grade. This file holds every sentence the page can
 * say about those facts, keyed by the factor that makes it true. The engine
 * picks one variant per key deterministically (see `pickVariant` there), so
 * the same date always produces the same text and neighboring signs or
 * consecutive days never show the same sentence for the same factor.
 *
 * Writing rules (the content is read by people, search engines and AI
 * assistants, so they matter): second person, warm, concrete; no doom, no
 * health/legal/death predictions, no "scientifically proven", no superlatives.
 * Keep each sentence under ~26 words so the direct-answer paragraph that
 * combines two of them stays quotable.
 *
 * Templates may use `{sign}` (the reader's sign), `{moon}` (the Moon's sign),
 * `{element}` (the reader's element), `{ruler}`, `{rulerSign}` and
 * `{rulerElement}`. Everything else is literal.
 */

import type { MoonPhase } from '@/lib/astrology/foundation/electional'

export type DailyGrade = 1 | 2 | 3 | 4 | 5

export type MoonRelation =
  | 'same'
  | 'semi-sextile'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'quincunx'
  | 'opposition'

export type AspectName = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

export type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

export type ElementHarmony = 'same' | 'compatible' | 'clashing'
export type Tone = 'bright' | 'steady' | 'tense'
export type PhaseGroup = 'new' | 'waxing' | 'full' | 'waning'

/** Fill `{key}` placeholders. Unknown keys are left as-is so a typo is visible, not silent. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole
  )
}

export const GRADE_LABEL: Record<DailyGrade, string> = {
  5: 'Excellent',
  4: 'Good',
  3: 'Steady',
  2: 'Mixed',
  1: 'Low-key',
}

export const MOON_PHASE_EN: Record<MoonPhase, string> = {
  new_moon: 'New Moon',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full_moon: 'Full Moon',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
}

export const PHASE_GROUP: Record<MoonPhase, PhaseGroup> = {
  new_moon: 'new',
  waxing_crescent: 'waxing',
  first_quarter: 'waxing',
  waxing_gibbous: 'waxing',
  full_moon: 'full',
  waning_gibbous: 'waning',
  last_quarter: 'waning',
  waning_crescent: 'waning',
}

export const RELATION_LABEL: Record<MoonRelation, string> = {
  same: 'in your sign',
  'semi-sextile': 'semi-sextile your sign',
  sextile: 'sextile your sign',
  square: 'square your sign',
  trine: 'trine your sign',
  quincunx: 'quincunx your sign',
  opposition: 'opposite your sign',
}

// ---------------------------------------------------------------------------
// Headlines — keyed by grade. Every sign can land in the same grade on the
// same day, so each grade has exactly 12 variants and the engine shifts by
// sign index: 12 signs → 12 different headlines, whatever the grades.
// Nine words or fewer.
// ---------------------------------------------------------------------------

/** Banks that every sign may draw from on one day must have this many variants. */
export const SHARED_BANK_SIZE = 12

export const HEADLINES: Record<DailyGrade, readonly string[]> = {
  5: [
    'A rare easy day; use it well',
    'Doors open before you knock',
    'Momentum is on your side today',
    'Say yes to the good thing',
    'Almost everything you touch cooperates',
    'Green lights most of the way',
    'Lead today; people are ready to follow',
    'Your timing is better than you think',
    'Take the bigger swing today',
    'Luck favors the first mover today',
    'The right people are reachable',
    'A yes day, within reason',
  ],
  4: [
    'Steady wind at your back',
    'Good day for a first move',
    'Small pushes go far today',
    'Warm, workable, worth your effort',
    'Ask for it; you will likely hear yes',
    'Progress without the struggle',
    'A good day to start something',
    'Mostly smooth, occasionally brilliant',
    'Quiet confidence carries the day',
    'The plan works if you start it',
    'Easy to connect, easy to agree',
    'Build on what already works',
  ],
  3: [
    'An even day; routine wins',
    'Mixed signals, clear enough to work with',
    'Nothing dramatic, plenty to do',
    'Keep it simple and finish things',
    'Ordinary day, honest effort pays',
    'Middle gear; stay in it',
    'Quiet progress beats loud plans',
    'Even weather; pace yourself',
    'Workable day with a few detours',
    'Steady hands win today',
    'Do the basics unusually well',
    'Fine for progress, not for leaps',
  ],
  2: [
    'Go slower than you want to',
    'Friction day; choose your battles',
    'Hold the plan, loosen the grip',
    'Fewer promises, more follow-through',
    'Double-check before you commit',
    'Patience is the skill today',
    'Small day; keep the stakes small',
    'Expect detours; leave margin',
    'Say less, confirm more',
    'Not wrong, just slow today',
    'Flexible plans, modest expectations',
    'Tidy up before you add on',
  ],
  1: [
    'Protect your energy today',
    'Low tide; rest, review, regroup',
    'Not the day for big asks',
    'Quiet day; let it be quiet',
    'Postpone what can be postponed',
    'Tend to yourself first today',
    'Head down, heart soft, keep going',
    'Lower the bar, keep the kindness',
    'Rest counts as progress today',
    'Minimal day; do what matters',
    'Hold steady; the tide turns soon',
    'Small comforts, few commitments',
  ],
}

// ---------------------------------------------------------------------------
// Moon relation — the lead sentence of every summary. 4 variants each.
// ---------------------------------------------------------------------------

export const MOON_RELATION_COPY: Record<MoonRelation, readonly string[]> = {
  same: [
    'The Moon is in {sign} today, so your feelings sit close to the surface and your instincts are louder than usual.',
    "With the Moon in your own sign, you're the emotional center of your own day; what you want is clear, even if saying it isn't.",
    'The Moon passes through {sign} today, amplifying your natural traits; the best and the trickiest of them both show.',
    "Today's Moon in {sign} puts you in your own element; you feel seen, and you notice more than usual.",
  ],
  'semi-sextile': [
    'The Moon is in {moon}, the sign next door to yours, bringing a day that asks for small adjustments rather than big moves.',
    'With the Moon in {moon}, the emotional weather is slightly off your usual frequency; a little patience tunes it in.',
    "Today's Moon in {moon} sits beside your sign, close but not quite in step; treat the day as a gentle recalibration.",
    "The Moon in {moon} today doesn't push or pull your sign much; it quietly asks you to tidy loose ends.",
  ],
  sextile: [
    'The Moon is in {moon}, sextile your sign, which makes people easier to talk to and plans easier to start.',
    'With the Moon in {moon}, two signs from yours, opportunities arrive through conversation rather than effort.',
    "Today's Moon in {moon} is friendly to {sign}; cooperation feels natural, and small openings lead somewhere.",
    'The Moon in {moon} forms a light sextile to your sign; a good day for connecting, learning, and asking.',
  ],
  square: [
    'The Moon is in {moon}, square your sign, so moods and plans may rub against each other; slow down rather than push through.',
    "With the Moon in {moon}, three signs from yours, there's friction in the air; it's about timing, not about you.",
    "Today's Moon in {moon} squares {sign}, which can make small demands feel bigger; pick one priority and protect it.",
    'The Moon in {moon} challenges your sign today; the resistance is useful if you let it show you what matters.',
  ],
  trine: [
    'The Moon is in {moon}, trine your sign, and the day flows; emotions and actions point the same way.',
    "With the Moon in {moon}, a fellow {element} sign, you're in sync with the mood around you; things that stalled move again.",
    "Today's Moon in {moon} is one of the easiest placements for {sign}; use the ease for something that usually feels hard.",
    'The Moon in {moon} supports your sign with a warm trine; confidence and comfort both come easily.',
  ],
  quincunx: [
    'The Moon is in {moon}, an awkward angle from your sign, so the day may feel slightly out of sync; adjust rather than insist.',
    'With the Moon in {moon}, five signs from yours, you may have to translate between what you feel and what the day asks.',
    "Today's Moon in {moon} asks {sign} for flexibility; the odd fit of the day is a chance to try a new approach.",
    "The Moon in {moon} doesn't quite match your sign's rhythm today; small accommodations go a long way.",
  ],
  opposition: [
    "The Moon is in {moon}, opposite your sign, so other people's feelings take up space; listen first, then decide.",
    'With the Moon across the zodiac in {moon}, relationships are the theme; balance what you want with what they need.',
    "Today's Moon in {moon} faces {sign} directly, bringing someone else's perspective into sharp focus; it's worth hearing.",
    'The Moon in {moon} opposes your sign; the day works better as a partnership than a solo effort.',
  ],
}

// ---------------------------------------------------------------------------
// Moon phase — second summary sentence when no planet aspects the sign.
// Every sign shares the phase, so each phase has 12 variants (SHARED_BANK_SIZE)
// and the engine shifts by sign index.
// ---------------------------------------------------------------------------

export const PHASE_COPY: Record<MoonPhase, readonly string[]> = {
  new_moon: [
    "The Moon is new, so the day favors beginnings you keep quiet for now; set the intention and don't announce it yet.",
    'A new Moon lowers the volume; energy is inward, and the best moves are small and private.',
    'With a new Moon, clarity comes from rest rather than effort; sketch the plan, start tomorrow.',
    'New Moon days are for seeds, not harvests; plant one good habit.',
    "The sky is dark of the Moon; a good time to clear space for what's next.",
    'A new Moon favors the quiet start; begin the thing you have been circling, without an audience.',
    'The lunar cycle resets today; one honest intention is worth more than ten resolutions.',
    'Dark-Moon days are for listening; the plan will be clearer in a few days than it is at noon.',
    'With the Moon new, energy is low and potential is high; sketch, do not launch.',
    'The month begins in the dark, which is where good ideas are usually found.',
    'A new Moon asks what you want next; answer it privately before you answer it publicly.',
    'Begin small and begin alone; the new Moon rewards seeds over announcements.',
  ],
  waxing_crescent: [
    'The Moon is a waxing crescent, and momentum is just beginning to build; take the first concrete step.',
    "A crescent Moon favors commitment to a plan you've already chosen; act on it lightly.",
    'With the Moon waxing, your energy for new things grows through the day.',
    'Waxing crescent: the intention is set, now the follow-through begins.',
    'Early in the lunar cycle, small consistent efforts matter more than big ones.',
    'The Moon has started to grow, and so can the plan; add one piece, not five.',
    'A waxing crescent favors learning and gathering; collect what you will need later.',
    'Momentum is thin but real; protect the new habit from your own impatience.',
    'The first sliver of Moon returns; a good time to tell one person about your plan.',
    'Early momentum today; a light touch keeps it from stalling.',
    'With the crescent Moon, commitment is the theme; show up again tomorrow.',
    'The cycle is young; invest effort where you want growth to show in two weeks.',
  ],
  first_quarter: [
    'The Moon is at first quarter, a point of friction that asks you to push past the first obstacle.',
    'A first-quarter Moon brings a decision point; choose, adjust, and keep moving.',
    "With the Moon at first quarter, resistance appears so you can test the plan; adjust it, don't abandon it.",
    'First quarter: effort meets reality, and the plan that survives contact is the good one.',
    'The half-lit Moon brings a useful tension; it sharpens priorities.',
    'The first-quarter Moon tests resolve; the friction you feel is the plan meeting the world.',
    'A half-lit Moon brings a crossroads; pick a direction and commit for the day.',
    'Obstacles today are feedback, not verdicts; adjust and keep moving.',
    'With the Moon at first quarter, action beats deliberation; do the next step, then review.',
    'Tension sharpens priorities today; let the unimportant things fall away.',
    'The first quarter asks for a decision you have been postponing; make it provisionally.',
    'Push through one resistance today, gently; that is the whole assignment.',
  ],
  waxing_gibbous: [
    "The Moon is waxing gibbous, nearly full, and the day rewards refinement: polish what's almost done.",
    "A gibbous Moon favors persistence; you're close, so finish.",
    'With the Moon almost full, details and feedback matter; adjust before the reveal.',
    'Waxing gibbous: anticipation builds; keep your pace steady and your expectations honest.',
    "The swelling Moon supports completion; wrap the thing you've been building.",
    'The Moon is nearly full; refine, rehearse, and check the details before the reveal.',
    'A gibbous Moon favors persistence over novelty; keep going on what you started.',
    'Anticipation runs high; stay practical and let the result speak for itself.',
    'With the Moon almost full, feedback is useful; ask for it before the deadline, not after.',
    'The swelling Moon sharpens focus; finish the long task in one sitting if you can.',
    'Almost there; resist the urge to add features and polish what exists.',
    'The gibbous phase favors editing; cut what is extra and the work stands taller.',
  ],
  full_moon: [
    "The Moon is full, so feelings and facts both come into sharp relief; what's been hidden tends to show.",
    'A full Moon brings culmination; something reaches its result today, and you see it clearly.',
    'With the Moon full, emotions run high for everyone; give yourself and others extra margin.',
    "Full Moon: bright light on relationships and outcomes; celebrate what works, release what doesn't.",
    'The Moon is at its brightest, and so is your awareness; use it for honesty, not for drama.',
    'The full Moon brings results into view; some are lovely, some are instructive, all are information.',
    'With the Moon full, emotions are honest and loud; say the true thing kindly.',
    'Culmination today: a project, a conversation, or a feeling reaches its peak.',
    'A full Moon illuminates relationships; what you see is real, so respond with care.',
    'Energy is high and sleep may be short; use the surplus for something that matters.',
    'The brightest night of the cycle shows both the harvest and the gaps; note both.',
    'Full Moon days exaggerate; take the feeling seriously and the volume lightly.',
  ],
  waning_gibbous: [
    "The Moon is waning gibbous, a time to share what you've learned and let the pressure ease.",
    'After the full Moon, the day favors gratitude and distribution; give credit, pass on the knowledge.',
    'With the Moon waning, energy turns reflective; a good day to review rather than launch.',
    'Waning gibbous: the harvest is in; sort it, share it, rest a little.',
    'The Moon begins to wane, inviting you to digest recent events before starting anything new.',
    'The Moon begins to wane; share what worked, and note what did not, without blame.',
    'After the peak, the day favors teaching and thanking; both strengthen what you built.',
    'A waning gibbous Moon asks for digestion rather than consumption; review before you add.',
    'Energy softens today; let the pace follow it.',
    'Gratitude is the practical move today; it closes the loop on what the full Moon showed.',
    'With the Moon waning, pass on what you learned; someone needs it.',
    'The cycle turns toward release; begin by releasing the need to be right about it.',
  ],
  last_quarter: [
    "The Moon is at last quarter, a point of release: let go of what isn't working.",
    'A last-quarter Moon favors editing, clearing, and honest reassessment.',
    "With the Moon at last quarter, friction shows up around what you're ready to release; release it.",
    'Last quarter: tie off loose ends and forgive the small things.',
    'The half-dark Moon asks you to simplify; fewer commitments, more room.',
    'The last-quarter Moon favors honest edits; remove what no longer belongs.',
    'A half-dark Moon asks what you can set down; set one thing down today.',
    'Reassessment is the theme; adjust the plan with what the month taught you.',
    'Clear the desk, the inbox, or the grudge; the Moon supports the clean-out.',
    'Friction today points at what is finished; let it finish.',
    'With the Moon at last quarter, forgive a small debt, financial or emotional.',
    'A good day to decide what you will not carry into the next cycle.',
  ],
  waning_crescent: [
    'The Moon is a waning crescent, the quietest part of the cycle; rest is productive today.',
    'A waning crescent favors reflection, sleep, and gentle closure; the new cycle starts soon.',
    'With the Moon nearly dark, energy is low and intuition is high; listen more than you act.',
    "Waning crescent: finish, forgive, and don't start anything you'd have to defend.",
    "The last sliver of the Moon suggests a slow day; honor it and you'll start the next cycle refreshed.",
    'The waning crescent is the quietest Moon; rest is not laziness today, it is preparation.',
    'Energy is low and insight is high; write down what you notice.',
    'The old cycle closes; tie off loose ends rather than opening new ones.',
    'A good day for sleep, reflection, and the gentlest kind of closure.',
    'With the Moon nearly dark, trust intuition over schedule.',
    'Let the day be small; the new Moon will ask for more soon enough.',
    'The last sliver suggests gratitude and quiet; both prepare the ground for what comes next.',
  ],
}

// ---------------------------------------------------------------------------
// Aspect × planet — second summary sentence. The Moon is excluded here because
// the Moon-relation sentence already covers it. 3 variants per key.
// ---------------------------------------------------------------------------

type AspectBank = Record<AspectName, readonly string[]>

export const ASPECT_COPY: Record<Exclude<PlanetName, 'Moon'>, AspectBank> = {
  Sun: {
    conjunction: [
      "The Sun sits right on your sign's midpoint, so your season is at full strength and people notice you without you trying.",
      'With the Sun lined up on your sign, energy and visibility are both up; this is a day to be seen doing what you do well.',
      "The Sun is conjunct your sign's heart today, which puts a spotlight on your plans and makes your intentions easy to read.",
    ],
    sextile: [
      'A Sun sextile gives you a light, cooperative kind of confidence: openings appear when you simply show up and ask.',
      'The Sun is sextile your sign, a gentle boost that rewards small initiatives more than grand gestures.',
      "Today's Sun sextile favors friendly outreach; the people you contact are more inclined to say yes.",
    ],
    trine: [
      'The Sun trine your sign makes effort feel lighter; what you start today tends to carry its own momentum.',
      'With a Sun trine in play, you can lead without pushing, and others fall in step more easily than usual.',
      'A supportive Sun trine warms the whole day: good for presenting, hosting, or simply standing behind your own idea.',
    ],
    square: [
      'The Sun squares your sign today, so pride and timing can clash; let a plan prove itself before you defend it.',
      'A Sun square brings a bit of resistance from authority or schedules, which is manageable if you pick one priority.',
      "Today's Sun square tests how you handle being contradicted; the graceful response wins more than the quick one.",
    ],
    opposition: [
      "The Sun opposes your sign, pulling attention toward other people's needs; a fair trade today beats a win.",
      'With the Sun across the sky from you, partnerships and counterparts take the lead; listen before you decide.',
      "A Sun opposition asks you to balance your agenda against someone else's; meet in the middle and the day flows.",
    ],
  },
  Mercury: {
    conjunction: [
      "Mercury is conjunct your sign's midpoint, sharpening your words; the message you've been drafting lands well today.",
      'With Mercury on your sign, ideas arrive fast and clear; write them down before the next one pushes in.',
      'Mercury conjunct your sign gives you the right phrase at the right moment, especially in negotiations and interviews.',
    ],
    sextile: [
      'A Mercury sextile keeps conversations easy and useful; a quick call clears more than a long email.',
      'Mercury sextile your sign favors learning and small logistics, like booking, planning, and sorting the list.',
      "Today's Mercury sextile helps you explain yourself simply, which is exactly what someone needs to hear.",
    ],
    trine: [
      'Mercury trine your sign makes thinking fluid: plans click, and explanations come out in the right order.',
      "With a Mercury trine, you're persuasive without effort; pitch, teach, or write the thing you've been circling.",
      'A smooth Mercury trine supports paperwork, study, and any decision that needs a clear head.',
    ],
    square: [
      'Mercury squares your sign today, so messages can cross and details slip; reread before you send.',
      'A Mercury square makes misunderstandings easy to start and hard to unwind; ask one clarifying question first.',
      "Today's Mercury square favors fewer words and more confirmations, especially around times, dates, and numbers.",
    ],
    opposition: [
      'Mercury opposes your sign, which means the other side of the argument deserves a real hearing today.',
      'With Mercury across from you, feedback may feel blunt; take the useful part and leave the tone.',
      "A Mercury opposition sharpens debate; you'll learn more by asking than by explaining.",
    ],
  },
  Venus: {
    conjunction: [
      "Venus is conjunct your sign's midpoint today, which softens your edges and draws warmth, compliments, and small favors your way.",
      'With Venus on your sign, charm comes naturally; this is a good day for first dates, apologies, and asking for help.',
      'Venus conjunct your sign makes you easy to like and easy to agree with; use it kindly.',
    ],
    sextile: [
      'A Venus sextile brings a pleasant social ease; invitations and nice coincidences arrive without much effort.',
      'Venus sextile your sign favors cooperation and taste: good for design choices, gifts, and friendly deals.',
      "Today's Venus sextile is gentle and sweet, the kind of day a small kindness comes back doubled.",
    ],
    trine: [
      'Venus trine your sign is one of the kinder transits: affection flows, and awkward conversations turn gentle.',
      "With a Venus trine, you're persuasive through warmth rather than argument; relationships of all kinds benefit.",
      "A Venus trine smooths the day's social surface; reconcile, celebrate, or simply enjoy good company.",
    ],
    square: [
      'Venus squares your sign today, so you may want more comfort or approval than the day provides; keep standards, drop the sulk.',
      'A Venus square can make spending and flattery tempting; enjoy the mood, check the receipt.',
      "Today's Venus square nudges a small mismatch of tastes or expectations; it's a conversation, not a verdict.",
    ],
    opposition: [
      "Venus opposes your sign, bringing another person's wants into focus; generosity today is an investment.",
      'With Venus across the sky, relationships ask for balance rather than romance; fair is the new sweet.',
      'A Venus opposition highlights what you give versus what you get; name it kindly and the scale levels.',
    ],
  },
  Mars: {
    conjunction: [
      "Mars is conjunct your sign's midpoint, flooding you with drive; aim it at one task and it's a very productive day.",
      'With Mars on your sign, your temper and your courage both run hot; pick the fight worth having, which is usually the work itself.',
      'Mars conjunct your sign makes you fast and decisive; slow down only for the details that cost money.',
    ],
    sextile: [
      'A Mars sextile gives you clean, usable energy: exercise, errands, and bold emails all go well.',
      "Mars sextile your sign favors a confident first move, especially one you've rehearsed.",
      "Today's Mars sextile makes assertiveness feel natural rather than forced; ask directly.",
    ],
    trine: [
      'Mars trine your sign puts wind in your sails; physical effort and competitive tasks feel almost easy.',
      'With a Mars trine, initiative is rewarded; start the project and let momentum handle the middle.',
      'A strong Mars trine supports anything that needs stamina, nerve, or a quick decision.',
    ],
    square: [
      'Mars squares your sign today, so impatience runs high; breathe before replying and double-check anything sharp or fast.',
      'A Mars square brings friction with people who want things done their way; pick timing over force.',
      "Today's Mars square makes small delays feel enormous; they're not, but your reaction to them matters.",
    ],
    opposition: [
      'Mars opposes your sign, which can turn a disagreement into a standoff; state your position once and let it sit.',
      "With Mars across the sky, other people's urgency may land on your desk; agree on a timeline before you absorb it.",
      'A Mars opposition rewards cool heads; the person who stays calm sets the terms today.',
    ],
  },
  Jupiter: {
    conjunction: [
      "Jupiter is conjunct your sign's midpoint, a long and generous transit that expands your options and your confidence.",
      'With Jupiter on your sign, optimism is justified more often than not; just keep promises to a size you can deliver.',
      'Jupiter conjunct your sign brings bigger thinking and a wider circle; say yes to the introduction.',
    ],
    sextile: [
      'A Jupiter sextile opens a small door: a helpful contact, a useful tip, a little luck in the timing.',
      'Jupiter sextile your sign favors learning and travel plans; the research you do today pays off later.',
      "Today's Jupiter sextile is a quiet lift to morale; believe the encouraging version of events.",
    ],
    trine: [
      'Jupiter trine your sign is a backdrop of good fortune: things fall into place with less struggle than usual.',
      'With a Jupiter trine, generosity and growth come easily; share credit and the circle widens.',
      'A warm Jupiter trine supports long-range plans, mentors, and anything that needs faith to begin.',
    ],
    square: [
      'Jupiter squares your sign, which inflates expectations a little; ask for the figures before celebrating.',
      'A Jupiter square tempts you to overcommit; enthusiasm is right, the schedule needs trimming.',
      "Today's Jupiter square tests judgment through excess; the smaller plate is the smarter one.",
    ],
    opposition: [
      "Jupiter opposes your sign, bringing other people's big plans into view; join the right one, not every one.",
      "With Jupiter across the sky, you may feel outsized by someone else's confidence; your steady version wins over time.",
      "A Jupiter opposition favors balance between ambition and realism; let a partner's optimism be checked by your plan.",
    ],
  },
  Saturn: {
    conjunction: [
      "Saturn is conjunct your sign's midpoint, a slow, serious transit that asks for structure and rewards the work you actually finish.",
      'With Saturn on your sign, responsibilities feel heavier but clearer; one honest hour of effort counts double.',
      "Saturn conjunct your sign strips away the optional; what's left is what matters, and that's useful.",
    ],
    sextile: [
      'A Saturn sextile offers quiet support for planning, budgeting, and any commitment made with eyes open.',
      'Saturn sextile your sign favors steady progress; the boring step today is the one that holds later.',
      "Today's Saturn sextile is a good footing for long-term decisions and sensible boundaries.",
    ],
    trine: [
      'Saturn trine your sign brings calm competence; you handle responsibility without strain and others trust you with more.',
      'With a Saturn trine, discipline comes easily and structure feels freeing rather than confining.',
      'A grounded Saturn trine supports contracts, routines, and anything meant to last.',
    ],
    square: [
      'Saturn squares your sign, so obstacles and delays test your patience; they also show which plan is solid.',
      'A Saturn square can feel like being graded; do the work in front of you and skip the self-judgment.',
      "Today's Saturn square slows the pace on purpose; a realistic timeline beats a brave one.",
    ],
    opposition: [
      'Saturn opposes your sign, placing a rule, a boss, or an older voice in your path; respect the limit, keep the goal.',
      "With Saturn across the sky, someone else's standards weigh on you; meet the fair ones, question the rest.",
      'A Saturn opposition asks for maturity in partnership; say what you can commit to, and no more.',
    ],
  },
  Uranus: {
    conjunction: [
      "Uranus is conjunct your sign's midpoint, a years-long current of change that makes routine feel optional and experiment feel necessary.",
      'With Uranus on your sign, surprises are the weather; stay flexible and some of them turn out to be upgrades.',
      'Uranus conjunct your sign favors originality; the unconventional path is unusually workable.',
    ],
    sextile: [
      'A Uranus sextile sparks a fresh idea or an unexpected contact; follow it a short way and see.',
      'Uranus sextile your sign favors trying a new tool, route, or approach to an old task.',
      "Today's Uranus sextile is a nudge toward novelty; small experiments carry low risk and high interest.",
    ],
    trine: [
      'Uranus trine your sign gives you room to innovate; your odd idea is more welcome than you expect.',
      'With a Uranus trine, change comes as opportunity rather than disruption; say yes to the different plan.',
      'A lively Uranus trine supports technology, networks, and the courage to do things your own way.',
    ],
    square: [
      "Uranus squares your sign, so plans may shift without notice; build slack into the day and you'll be fine.",
      "A Uranus square brings restlessness; channel it into one change you choose rather than many you don't.",
      "Today's Uranus square makes sudden news more likely; respond after a pause, not during the jolt.",
    ],
    opposition: [
      'Uranus opposes your sign, bringing unpredictable people or situations into view; curiosity serves you better than control.',
      'With Uranus across the sky, a partner or counterpart may change direction; ask what they need before reacting.',
      'A Uranus opposition stirs up the status quo in relationships; a little freedom on both sides eases it.',
    ],
  },
  Neptune: {
    conjunction: [
      "Neptune is conjunct your sign's midpoint, a long, dreamy transit that heightens imagination and blurs practical edges; keep notes.",
      'With Neptune on your sign, intuition is strong and schedules are slippery; set alarms, trust hunches.',
      'Neptune conjunct your sign favors art, rest, and compassion; it does not favor fine print.',
    ],
    sextile: [
      'A Neptune sextile softens the day with imagination and empathy; creative work and kind words both flow.',
      'Neptune sextile your sign favors music, reflection, and giving someone the benefit of the doubt.',
      "Today's Neptune sextile adds a gentle, intuitive layer; the quiet idea is worth hearing.",
    ],
    trine: [
      'Neptune trine your sign brings inspiration and ease; the creative or spiritual side of life feels close at hand.',
      'With a Neptune trine, compassion comes naturally and so does a good excuse to daydream; schedule both.',
      'A flowing Neptune trine supports artistic work, rest, and conversations that need tenderness.',
    ],
    square: [
      'Neptune squares your sign, so facts and feelings may blur; verify before you believe, especially about money.',
      'A Neptune square can make you tired or vague; lower the bar for the day and protect your sleep.',
      "Today's Neptune square fogs the details; keep decisions small and reversible.",
    ],
    opposition: [
      'Neptune opposes your sign, which can idealize or misread another person; ask plain questions and listen for plain answers.',
      'With Neptune across the sky, someone may seem more or less than they are; give it time before judging.',
      'A Neptune opposition calls for clear agreements in relationships; sympathy is good, assumptions are not.',
    ],
  },
  Pluto: {
    conjunction: [
      "Pluto is conjunct your sign's midpoint, a slow, deep transit of transformation; what you let go of this year makes room for what's next.",
      'With Pluto on your sign, intensity runs underneath ordinary days; use it for honest reflection rather than control.',
      'Pluto conjunct your sign favors depth over breadth; one real conversation beats ten light ones.',
    ],
    sextile: [
      'A Pluto sextile offers quiet power: research, strategy, and anything that benefits from focus go well.',
      'Pluto sextile your sign supports steady self-improvement; the habit you rebuild now tends to stick.',
      "Today's Pluto sextile adds resolve; you can finish the hard, unglamorous task.",
    ],
    trine: [
      'Pluto trine your sign deepens your influence; people take your word seriously, so choose it carefully.',
      'With a Pluto trine, transformation feels like growth rather than loss; let the old version retire gracefully.',
      'A steady Pluto trine supports decisions that reshape finances, habits, or long-standing commitments.',
    ],
    square: [
      "Pluto squares your sign, so power dynamics may surface; notice them, and don't take the bait of a control contest.",
      'A Pluto square can make small issues feel loaded; keep perspective and keep your own counsel.',
      "Today's Pluto square favors patience with slow-moving tensions; nothing needs to be settled by tonight.",
    ],
    opposition: [
      'Pluto opposes your sign, highlighting who holds the cards in a relationship; aim for honesty rather than leverage.',
      'With Pluto across the sky, intense people may test your boundaries; a calm no is a complete sentence.',
      "A Pluto opposition brings hidden motives into view; it's useful information, not an emergency.",
    ],
  },
}

// ---------------------------------------------------------------------------
// Area copy — love / work / money, keyed by the planet × aspect that drives
// the area today. Each area has a fallback bank for days with no driver.
// ---------------------------------------------------------------------------

export const LOVE_ASPECT_COPY: Partial<Record<PlanetName, AspectBank>> = {
  Venus: {
    conjunction: [
      "Affection comes easily today; say the warm thing out loud, whether to a partner or a friend you've missed.",
      "You're at your most charming, so a first date, a reunion, or a long-postponed apology all land softly.",
      'Compliments find you, and you find the right ones to give; let the day be a little romantic.',
    ],
    sextile: [
      'A light, friendly glow surrounds your love life; a casual plan can turn into a good memory.',
      'Small gestures do the work today: a text, a shared meal, a question you actually wait to hear answered.',
      "Single or attached, you're easy to be around; accept the invitation.",
    ],
    trine: [
      'This is a gentle, forgiving day for love; tension dissolves faster than usual if you let it.',
      'Partners are receptive, and new connections feel natural rather than performed.',
      "If you've been waiting for the right moment to be tender, this is one of them.",
    ],
    square: [
      'You may crave more reassurance than the day hands you; ask for it plainly instead of testing for it.',
      'A small clash of tastes or plans is possible; treat it as a preference, not a sign.',
      'Keep the romance simple today; the elaborate gesture can wait for a smoother sky.',
    ],
    opposition: [
      "Your needs and someone else's are both valid and both visible; the fair compromise is the loving one.",
      "Love asks for balance today: give what you'd like to receive, then notice what returns.",
      "A partner's wish for attention is real; a little generosity now pays back over the week.",
    ],
  },
  Mars: {
    conjunction: [
      'Desire and impatience both run high; choose passion over pressure and the evening goes well.',
      'You want things to move in love today; make the invitation rather than waiting to be asked.',
      'Chemistry is strong but so is temper; keep the heat where it belongs.',
    ],
    sextile: [
      'Confidence is attractive today; a direct, friendly approach beats a clever one.',
      'Energy for shared activity is high: walk, cook, or build something together.',
      'Flirtation comes easily and lands well; keep it light and sincere.',
    ],
    trine: [
      'You pursue what you want in love with ease and good timing; be bold, not pushy.',
      'Attraction and action line up; a first move made today tends to be welcomed.',
      'Physical energy and affection reinforce each other; plan something active together.',
    ],
    square: [
      'Irritation can masquerade as honesty in relationships today; wait ten minutes before saying the sharp thing.',
      'You and someone close may want different speeds; name it as a speed problem, not a love problem.',
      'Friction in love is likely to be about timing; agree on when, and the what gets easier.',
    ],
    opposition: [
      'A standoff in love is possible if both of you insist on being right; let the other person finish first.',
      "Someone's urgency may feel like pressure; set a pace you can keep and say it kindly.",
      'Passion and conflict share a border today; stay on the passionate side.',
    ],
  },
}

/** Love fallback (no Venus/Mars aspect) — keyed by tone, 12 variants (SHARED_BANK_SIZE). */
export const LOVE_TONE_COPY: Record<Tone, readonly string[]> = {
  bright: [
    "Warmth comes easily; say the kind thing you've been saving.",
    'Good day to make plans with someone you like; the mood cooperates.',
    'Affection flows without much effort; let yourself enjoy it.',
    'A light, open feeling surrounds your relationships; invitations land well.',
    "If you've been waiting for the right moment to reach out, this is a fine one.",
    'Partners and friends are receptive; tenderness is returned.',
    'Simple pleasures shared are the best part of today.',
    'Someone wants to hear from you; make it easy for them.',
    'Compliments land well today, both given and received.',
    'A relaxed evening together does more than a planned event.',
    'Flirtation is light and welcome; keep it honest.',
    'The people you love are easier to read today; respond to what you see.',
  ],
  steady: [
    'Nothing dramatic in love today; show up, listen, and let that be enough.',
    'A calm day for relationships, good for the ordinary maintenance that keeps them warm.',
    'Keep expectations easy and conversations honest; the quiet connection counts.',
    'A plain, pleasant day for love; a small routine shared is worth more than a big plan.',
    "Affection is steady rather than sparkling; that's a feature, not a flaw.",
    'Good day for the practical side of closeness: errands together, a shared meal, a real check-in.',
    'Let love be low-key today; it recharges that way.',
    'Nothing needs fixing in love today; appreciate what already works.',
    'A kind text at the right moment is the whole task.',
    'Keep plans modest and attention real; that is enough.',
    'Companionship over romance today; both count.',
    'Let a relationship breathe; not every day needs a milestone.',
  ],
  tense: [
    'Feelings run a little sensitive; ask what someone meant before deciding what they meant.',
    'Give yourself and the people close to you some room; distance today is not rejection.',
    'A touchy moment is possible; the slow reply is the loving one.',
    'You may want more reassurance than the day hands you; say so plainly.',
    'Avoid reading tone into texts; call if it matters.',
    'A small mismatch in needs can be solved with one honest sentence.',
    'Be gentle with yourself first; it makes being gentle with others easier.',
    'Choose curiosity over assumption when someone seems distant.',
    'A disagreement today is probably about tiredness, not about the two of you.',
    'Postpone the big relationship talk; today favors small kindnesses.',
    'If you feel unseen, say it plainly rather than waiting to be noticed.',
    'Space is a gift today; offer it and take it.',
  ],
}

export const WORK_ASPECT_COPY: Partial<Record<PlanetName, AspectBank>> = {
  Mercury: {
    conjunction: [
      'Your words carry weight today; send the proposal, lead the meeting, write the summary everyone will quote.',
      'Fast thinking is your edge; capture ideas as they arrive and sort them this afternoon.',
      'Negotiations favor you when you speak plainly, and today you naturally do.',
    ],
    sextile: [
      'Logistics flow: scheduling, replies, and small decisions clear quickly if you start early.',
      'A quick conversation unblocks a task that email has been stalling; make the call.',
      "Learning is easy today, so take the tutorial or read the brief you've been avoiding.",
    ],
    trine: [
      'Clear thinking makes the complex task feel orderly; map it, then do the first two steps.',
      'You explain things well today; teach, document, or pitch while the clarity lasts.',
      "Decisions made with a cool head today tend to hold; it's a good day to commit on paper.",
    ],
    square: [
      'Reread before you send, and confirm times in writing; crossed wires are the main hazard today.',
      'A misunderstanding with a colleague is likely to be about words, not intent; ask what they meant.',
      'Keep your to-do list short and your messages shorter; detail errors creep in when you rush.',
    ],
    opposition: [
      'Expect pushback on an idea; the critique contains one useful point, so find it and use it.',
      "A counterpart's view differs from yours; a side-by-side comparison beats a debate today.",
      'You learn more by asking questions in meetings than by presenting; let someone else talk first.',
    ],
  },
  Mars: {
    conjunction: [
      'Drive is high; attack the hardest task before lunch while the energy is clean.',
      'You can move a stalled project today through sheer momentum, but delegate the detail work.',
      'Competitive situations favor you; just be sure the goal is worth the fight.',
    ],
    sextile: [
      'Steady, usable energy supports errands, workouts, and the task you keep deferring.',
      "A confident first move at work is welcomed today; propose, don't wait.",
      "Pace yourself and you'll finish more than usual without burning out.",
    ],
    trine: [
      'Work feels like sport in the good sense; set a target and enjoy hitting it.',
      'Initiative is rewarded; start the thing and let momentum carry the middle.',
      'Stamina and nerve are both available; use them on the task that needs courage.',
    ],
    square: [
      'Impatience makes mistakes; slow down around tools, deadlines, and sharp emails.',
      'Someone wants it done their way; negotiate the timeline rather than the method.',
      "Delays feel personal today but aren't; use the gap to prepare the next step.",
    ],
    opposition: [
      'A disagreement at work can harden if either side digs in; state your case once and give it time.',
      "Other people's urgency lands on your desk; agree what's due and when before you absorb it.",
      'Cool heads set the terms today; be the cool head.',
    ],
  },
  Saturn: {
    conjunction: [
      'Responsibility is heavier but clearer; one honest hour of focused effort counts double.',
      'Structure helps: a checklist, a deadline, a boundary around your time.',
      'Authority figures take you seriously if you take the details seriously.',
    ],
    sextile: [
      'Good day for planning, budgets, and commitments made with eyes open.',
      'The boring step holds the whole project together later; do it now.',
      'Mentors and senior colleagues are receptive to a well-prepared ask.',
    ],
    trine: [
      'You handle responsibility without strain; others notice and trust you with more.',
      'Discipline comes easily, and long-term plans feel realistic rather than daunting.',
      'A good day to sign, formalize, or lock in a routine that will serve you for months.',
    ],
    square: [
      'Obstacles test your patience and also reveal which plan is sound; keep the sound one.',
      'You may feel judged or behind; do the work in front of you and skip the self-review.',
      'A realistic timeline beats a brave one today; renegotiate the deadline before it slips.',
    ],
    opposition: [
      'A rule, a boss, or an older voice stands in your path; respect the limit, keep the goal.',
      "Someone else's standards weigh on you; meet the fair ones and ask about the rest.",
      'Partnership at work asks for maturity; say what you can commit to, and no more.',
    ],
  },
  Sun: {
    conjunction: [
      "You're visible today; present, lead, or ask for the role, because people are watching with goodwill.",
      'Your confidence is high and warranted; just keep one ear open for the quiet objection.',
      "A good day to put your name on the work you're proud of.",
    ],
    sextile: [
      'Friendly openings appear when you show up and ask; a small initiative goes a long way.',
      "Colleagues are inclined to say yes; make the request you've been rehearsing.",
      'Light, cooperative confidence: good for teamwork and introductions.',
    ],
    trine: [
      'Effort feels lighter; what you start today carries its own momentum.',
      'You lead without pushing, and others fall into step more easily than usual.',
      'A supportive day for presenting, hosting, or standing behind your own idea.',
    ],
    square: [
      'Pride and timing can clash; let a plan prove itself before you defend it.',
      'Expect mild resistance from authority or schedules; pick one priority and protect it.',
      'How you handle being contradicted matters more than being right today.',
    ],
    opposition: [
      "Attention shifts to other people's agendas; a fair trade beats a win.",
      'Partners and counterparts take the lead; listen before you decide.',
      "Balance your plan against someone else's; the middle path is the productive one.",
    ],
  },
}

/** Work fallback — the ruler's condition, keyed by element harmony. 5 variants. */
export const RULER_WORK_COPY: Record<ElementHarmony, readonly string[]> = {
  same: [
    'Your ruling planet, {ruler}, is moving through {rulerSign}, a fellow {element} sign; your natural working style is well supported today.',
    "{ruler}, which rules your sign, sits in {rulerSign} and speaks your element's language; trust your usual approach.",
    'With {ruler} in {rulerSign}, the same element as yours, your instincts about pace and priority are reliable.',
    'Your ruler {ruler} in {rulerSign} keeps you in your own element; lean into what you already do well.',
    '{ruler} in {rulerSign} reinforces your strengths at work; focus beats reinvention.',
  ],
  compatible: [
    'Your ruling planet, {ruler}, is in {rulerSign}, a {rulerElement} sign that works well with your {element} nature; cooperation is easy.',
    '{ruler} in {rulerSign} lends a friendly, complementary tone to your work; borrow its qualities for the day.',
    "With {ruler} traveling through {rulerSign}, your methods and the day's demands fit together without much friction.",
    'Your ruler {ruler} in {rulerSign} supports steady, agreeable progress; good for collaboration.',
    '{ruler} in {rulerSign} gives your work a compatible backdrop; nothing flashy, nothing fighting you.',
  ],
  clashing: [
    'Your ruling planet, {ruler}, is in {rulerSign}, a {rulerElement} sign that pulls differently from your {element} nature; adjust your pace rather than your goal.',
    "{ruler} in {rulerSign} asks you to work in a style that isn't your default; treat it as cross-training.",
    'With {ruler} in {rulerSign}, you may feel slightly out of your element at work; borrow its approach for a day.',
    'Your ruler {ruler} in {rulerSign} brings a different tempo; patience with yourself keeps the day productive.',
    "{ruler} in {rulerSign} nudges you toward an unfamiliar method; the stretch is useful even if it's not comfortable.",
  ],
}

export const MONEY_ASPECT_COPY: Partial<Record<PlanetName, AspectBank>> = {
  Jupiter: {
    conjunction: [
      'Confidence about money is high; a good day to ask for a raise, apply, or pitch, as long as the numbers are real.',
      'Generosity flows both ways; just keep spending in proportion to the optimism.',
      'Opportunities for growth appear; pick the one with a clear next step.',
    ],
    sextile: [
      'A useful tip, a small discount, or a helpful contact can improve your finances in a quiet way.',
      'Good day to research an investment or course; the information pays off later.',
      'Morale about money lifts; use it to plan, not to splurge.',
    ],
    trine: [
      'Luck and timing cooperate; things fall into place financially with less struggle.',
      'Sharing credit or resources widens the circle and the return.',
      "A fine day for long-range money plans and for asking a mentor's advice.",
    ],
    square: [
      'Expectations run a little inflated; ask for the figures before you celebrate.',
      'Tempting to overcommit; trim the plan to what you can fund comfortably.',
      'The smaller purchase is the smarter one today.',
    ],
    opposition: [
      "Someone else's big plan wants your money or time; join the right one, not every one.",
      "Balance ambition against realism; let a partner's optimism be checked by your spreadsheet.",
      'A large promise deserves a small test before you invest.',
    ],
  },
  Venus: {
    conjunction: [
      'Money feels pleasant today, which is exactly when to watch it; enjoy one treat and skip the second.',
      'Good taste and good deals align; a purchase for comfort or beauty is likely to satisfy.',
      'Favors and gifts come easily; accept graciously and keep a note of who helped.',
    ],
    sextile: [
      'A friendly bargain or a small windfall is possible; be nice to the person at the counter.',
      'Pleasant day to tidy finances: pay the small bills, cancel the unused thing.',
      'Cooperation on shared money goes smoothly; have the conversation.',
    ],
    trine: [
      'Spending on something lasting feels right and probably is; quality over quantity.',
      'Charm helps in negotiations; ask for the better rate.',
      'Shared finances and gifts flow without friction today.',
    ],
    square: [
      'Comfort spending tempts; put it in the cart and look again tomorrow.',
      'A difference in taste or priorities about money surfaces; talk it through rather than paying to end it.',
      'Check the receipt and the subscription list; small leaks add up.',
    ],
    opposition: [
      'What you give versus what you get becomes visible, in money as in affection; name it kindly.',
      "A partner's wants pull on the budget; set a fair split and the mood stays warm.",
      'Generosity is good; generosity with a plan is better.',
    ],
  },
  Saturn: {
    conjunction: [
      'Money asks for structure: a budget, a payment plan, a clear limit.',
      "Slow, serious progress beats a quick fix; pay down, don't borrow up.",
      'Finances feel tight but honest; what you build now lasts.',
    ],
    sextile: [
      'Good day for budgeting, saving, and any commitment with a long horizon.',
      'The dull financial task you finish today prevents a problem later.',
      'Sensible boundaries around lending and spending come easily.',
    ],
    trine: [
      'Steady discipline with money pays off; a good day to set up automatic savings.',
      'Contracts, leases, and long-term plans are well supported.',
      'You handle financial responsibility without strain; others trust you with more of it.',
    ],
    square: [
      'Delays or extra costs test patience; check which plan is solid and fund that one.',
      'You may feel behind financially; the honest number is the first step, not the verdict.',
      'A realistic budget beats a brave one; adjust before it adjusts you.',
    ],
    opposition: [
      "Someone else's limits or rules affect your money; respect the fair ones, question the rest.",
      'Shared responsibility needs clear terms; write them down.',
      "Commit only to what you can carry; it's enough.",
    ],
  },
}

/** Money fallback (no Jupiter/Venus/Saturn aspect) — the lunar phase group, 12 variants (SHARED_BANK_SIZE). */
export const PHASE_MONEY_COPY: Record<PhaseGroup, readonly string[]> = {
  new: [
    "A new lunar cycle begins; set one money intention and write it where you'll see it.",
    'Good day to open the budget, not the wallet.',
    'Start small: a savings transfer, a fresh tracking sheet, a plan for the month.',
    'Seeds, not harvests; plant the financial habit today and judge it in four weeks.',
    'Quiet money day; clarify what you want before deciding what to buy.',
    'Reset the subscriptions and the goals; both benefit from a fresh look.',
    'Low-spend, high-plan day.',
    'Write down what you earned and what you spent last month; the pattern is the plan.',
    'A good day to set up the automatic transfer you keep meaning to make.',
    'Keep the wallet closed and the notebook open.',
    'Decide what enough looks like this month before the spending starts.',
    'Quiet start to the money cycle; intentions over transactions.',
  ],
  waxing: [
    'Momentum builds; a good stretch for applications, pitches, and asking for the rate you deserve.',
    'Growth-oriented money moves fit the waxing Moon; invest effort now, collect later.',
    'Push the project that pays; the Moon is on the way up.',
    "Good time to negotiate; you're building, not winding down.",
    'Spend on tools, not toys; the waxing Moon favors things that produce.',
    'Follow up on the invoice or the application; things in motion tend to move.',
    'Ambition is welcome; keep one eye on the running total.',
    'Chase the opportunity, not the sale; the Moon favors building.',
    'A good window to ask for the quote, the raise, or the referral.',
    'Put effort into what grows; income before indulgence.',
    'Energy for money matters rises; use it on applications and follow-ups.',
    'Invest time in a skill that pays; the return compounds.',
  ],
  full: [
    'A full Moon brings clarity about money, sometimes uncomfortable; look at the real number.',
    'Something financial comes to a head; decide, settle, or let it close.',
    'Emotions and spending both peak; sleep on any purchase over your usual threshold.',
    "Good day to collect what you're owed and pay what you owe.",
    'Culmination: a payment, a result, a clear answer. Act on it calmly.',
    "Bright light on the budget; what you see is useful even if it's not pretty.",
    'Celebrate a financial win if there is one; keep the celebration in proportion.',
    'Money and mood are both loud today; decide tomorrow what you only feel today.',
    'A full-Moon day shows the real balance; look at it without flinching.',
    'Settle a debt or close a deal; completion suits the day.',
    'Big purchases feel urgent and rarely are; give it a night.',
    'Clarity about what something costs you arrives; use it.',
  ],
  waning: [
    'Trim, cancel, pay down; the waning Moon favors less, not more.',
    "Review the month's spending and let go of one thing that isn't earning its keep.",
    'Not a day for new financial commitments; finish the old ones.',
    'Sell, declutter, return; release makes room.',
    "Pay the bill you've been avoiding; it's smaller than the dread.",
    'Reflect rather than acquire; what did this cycle teach you about money?',
    'Wind down the budget cycle gently; the next one starts soon.',
    'Cancel the subscription you forgot you had.',
    'Lower the monthly fixed costs by one item.',
    'A quiet money day; spend less, think more.',
    'Finish the paperwork rather than start the purchase.',
    'Count what you have before wanting what you lack.',
  ],
}

/** Appended to an area when the relevant personal planet is retrograde. 3 variants. */
export const RETROGRADE_COPY: Record<'Mercury' | 'Venus' | 'Mars', readonly string[]> = {
  Mercury: [
    "Mercury is retrograde, so confirm details twice and expect a reply to be slower than you'd like.",
    'With Mercury retrograde, revisit and revise rather than launch; old threads deserve a second look.',
    'Mercury retrograde makes it a good time to proofread, back up, and reconnect with people from the past.',
  ],
  Venus: [
    'Venus is retrograde, which brings old affections and old questions back for review; be kind to your past self.',
    'With Venus retrograde, reassess what you value before you spend or commit.',
    'Venus retrograde favors repairing a connection over starting a new one.',
  ],
  Mars: [
    'Mars is retrograde, so energy comes in waves; plan sprints, not marathons.',
    'With Mars retrograde, redirect effort toward unfinished work rather than new battles.',
    "Mars retrograde rewards patience; the push can wait, the preparation can't.",
  ],
}

// ---------------------------------------------------------------------------
// Do / avoid — one phrase each, keyed by the Moon relation. 4 variants.
// ---------------------------------------------------------------------------

export const DO_COPY: Record<MoonRelation, readonly string[]> = {
  same: [
    "Make the decision you've been circling",
    'Speak first in the meeting',
    'Trust your gut on one choice',
    'Do the thing that is most like you',
  ],
  'semi-sextile': [
    'Tidy one small corner of your life',
    'Adjust a plan by ten percent',
    "Handle the admin you've deferred",
    'Make one small correction early',
  ],
  sextile: [
    'Send the friendly message',
    'Ask someone for a small favor',
    'Say yes to the casual invitation',
    'Learn one new thing today',
  ],
  square: [
    'Pick one priority and protect it',
    'Take the slower route on purpose',
    'Pause before you reply',
    'Finish something instead of starting',
  ],
  trine: [
    "Start the project you've been waiting on",
    "Make the ask you've rehearsed",
    'Share your work with someone',
    "Plan something you'll look forward to",
  ],
  quincunx: [
    "Try a method that isn't your usual",
    'Ask what someone actually needs',
    'Reschedule rather than force it',
    'Adapt the plan, keep the goal',
  ],
  opposition: [
    'Listen all the way through',
    'Meet someone halfway',
    'Ask for feedback and sit with it',
    'Do one thing for someone else',
  ],
}

export const AVOID_COPY: Record<MoonRelation, readonly string[]> = {
  same: [
    'Assuming everyone feels what you feel',
    'Taking a passing mood as a verdict',
    'Over-explaining yourself',
    'Deciding for other people',
  ],
  'semi-sextile': [
    'Overreacting to minor friction',
    'Rewriting the whole plan',
    "Forcing a mood that isn't there",
    'Multiplying small tasks into big ones',
  ],
  sextile: [
    'Waiting to be invited',
    'Overthinking an easy opening',
    'Spreading yourself across every chat',
    'Mistaking a nice day for a done deal',
  ],
  square: [
    'Pushing through on principle',
    'Sending the sharp reply',
    'Scheduling anything tight',
    'Taking the delay personally',
  ],
  trine: [
    'Coasting on the good mood',
    'Promising more than today can hold',
    'Skipping the follow-up',
    'Spending the whole lift on comfort',
  ],
  quincunx: [
    'Insisting things go your usual way',
    "Assuming you've been understood",
    'Blaming yourself for an awkward fit',
    "Reading the room as hostile when it's just different",
  ],
  opposition: [
    'Winning the argument at any cost',
    'Making a solo decision about a shared thing',
    'Mind-reading instead of asking',
    "Taking someone's need as a criticism",
  ],
}

// ---------------------------------------------------------------------------
// Static sign profiles for the page (not date-dependent). Keyed by slug.
// ---------------------------------------------------------------------------

export interface SignProfile {
  strengths: readonly [string, string, string]
  watchOuts: readonly [string, string, string]
  /** One line on how to use this sign's daily reading. */
  howToRead: string
}

export const SIGN_PROFILES: Record<string, SignProfile> = {
  aries: {
    strengths: [
      'Fast to start and fearless about first moves',
      'Honest, direct, and hard to discourage',
      'Brings energy and courage to a stalled room',
    ],
    watchOuts: [
      'Impatience that mistakes speed for progress',
      'Starting more than you finish',
      "Hearing 'wait' as 'no'",
    ],
    howToRead:
      "Aries days are about initiative: when the sky supports you, start; when it doesn't, the hardest and most useful move is to pause.",
  },
  taurus: {
    strengths: [
      'Steady, reliable, and calm under pressure',
      'A good eye for quality, comfort, and value',
      'Loyal to people and to promises',
    ],
    watchOuts: [
      'Digging in when a small change would help',
      'Confusing comfort with safety',
      'Slow to say what has already changed inside',
    ],
    howToRead:
      "Taurus days reward patience and the senses; a good day is one you can feel, and a tricky day asks you to loosen your grip on how things 'should' be.",
  },
  gemini: {
    strengths: [
      'Quick, curious, and genuinely interested in people',
      'Explains complicated things simply',
      'Adapts to a new room in minutes',
    ],
    watchOuts: [
      'Scattering attention across too many threads',
      'Talking past the feeling underneath',
      'Mistaking variety for progress',
    ],
    howToRead:
      'Gemini days are about information and connection; a strong day moves through conversation, and a weak one is usually fixed by finishing one thread before opening the next.',
  },
  cancer: {
    strengths: [
      'Deeply attuned to what people need',
      'Protective, loyal, and quietly resilient',
      'Makes any place feel like home',
    ],
    watchOuts: [
      'Taking a mood as a fact',
      'Retreating instead of asking',
      "Carrying other people's feelings as your own",
    ],
    howToRead:
      "Cancer days follow the Moon closely; when it is friendly, lead with care, and when it isn't, give yourself the shelter you so readily give others.",
  },
  leo: {
    strengths: [
      'Warm, generous, and naturally encouraging',
      'Brings courage and color to any project',
      'Loyal to the people in your circle',
    ],
    watchOuts: [
      'Needing applause to feel sure',
      'Taking disagreement as disloyalty',
      'Overcommitting to look generous',
    ],
    howToRead:
      "Leo days are about expression and recognition; on a supportive day, show your work, and on a strained one, remember your worth doesn't need an audience.",
  },
  virgo: {
    strengths: [
      'Sees the detail that saves the project',
      'Practical, helpful, and quietly dependable',
      'Improves whatever you touch',
    ],
    watchOuts: [
      'Perfectionism that stalls the start',
      'Criticizing when encouragement would work',
      'Worry dressed up as planning',
    ],
    howToRead:
      'Virgo days reward craft and service; a good day is one where your fix is welcome, and a hard day usually means the standard needs lowering, not the effort.',
  },
  libra: {
    strengths: [
      'Fair-minded and skilled at finding the middle',
      'Charming, diplomatic, and easy to work with',
      'A real eye for beauty and balance',
    ],
    watchOuts: [
      'Deciding by committee, including inside your own head',
      'Avoiding conflict until it grows',
      'Pleasing people past your own limit',
    ],
    howToRead:
      "Libra days are about relationships and balance; when the sky supports you, connections flourish, and when it doesn't, the task is to choose rather than to weigh.",
  },
  scorpio: {
    strengths: [
      'Loyal, perceptive, and unafraid of depth',
      "Focus that outlasts everyone else's",
      "Reads what people don't say",
    ],
    watchOuts: [
      'Holding a grudge longer than it serves you',
      'Testing people instead of asking',
      'Mistaking control for safety',
    ],
    howToRead:
      'Scorpio days run deep; a strong day lets you commit fully, and a difficult one asks you to loosen control without losing intensity.',
  },
  sagittarius: {
    strengths: [
      'Optimistic, curious, and generous with ideas',
      'Sees the big picture when others are stuck',
      'Honest in a way people end up trusting',
    ],
    watchOuts: [
      'Promising more than the calendar allows',
      'Bluntness that lands harder than intended',
      'Leaving before the details are done',
    ],
    howToRead:
      'Sagittarius days are about horizon and meaning; good days widen the map, and hard days ask you to stay in one place long enough to finish.',
  },
  capricorn: {
    strengths: [
      'Disciplined, strategic, and built for the long game',
      'Reliable when it counts',
      'Dry humor that steadies a tense room',
    ],
    watchOuts: [
      'Working through what should be felt',
      'Measuring worth by output alone',
      'Saying no to help you actually need',
    ],
    howToRead:
      'Capricorn days reward structure and patience; a good day is one where effort compounds, and a hard day is usually a sign to rest rather than push.',
  },
  aquarius: {
    strengths: [
      'Original thinking and real independence',
      "Fair to people who aren't like you",
      'Calm in a crisis, inventive in a stalemate',
    ],
    watchOuts: [
      'Detaching when closeness is what is needed',
      'Being contrary for its own sake',
      'Ideas outrunning the people who have to live them',
    ],
    howToRead:
      "Aquarius days are about ideas and community; when the sky is friendly, experiment freely, and when it's not, stay connected to one real person.",
  },
  pisces: {
    strengths: [
      'Compassionate, imaginative, and intuitive',
      'Adapts to almost any situation',
      'Makes people feel understood',
    ],
    watchOuts: [
      "Absorbing moods that aren't yours",
      'Drifting when a decision is due',
      "Rescuing people who didn't ask",
    ],
    howToRead:
      'Pisces days run on intuition and tide; a good day lets you create and connect, and a hard day asks for boundaries and sleep.',
  },
}

/** Element blurbs for the sign-page FAQ ("What element is X?"). */
export const ELEMENT_BLURB: Record<'Fire' | 'Earth' | 'Air' | 'Water', string> = {
  Fire: 'Fire signs (Aries, Leo, Sagittarius) are described as energetic, direct and quick to act.',
  Earth:
    'Earth signs (Taurus, Virgo, Capricorn) are described as practical, steady and attentive to the tangible.',
  Air: 'Air signs (Gemini, Libra, Aquarius) are described as social, analytical and idea-driven.',
  Water:
    'Water signs (Cancer, Scorpio, Pisces) are described as intuitive, emotional and attuned to atmosphere.',
}
