/**
 * Sun-sign compatibility — text bank and copy builder.
 *
 * Everything on /compatibility/signs/[pair] that is prose comes from here. The
 * engine (./sunSignCompat.ts) decides the numbers and the factors; this file
 * turns those factors into paragraphs. English only (this is an English-only
 * surface). No LLM.
 *
 * Variant selection is deterministic: each relation has three variants per
 * section, and the variant for a pair is `(a.index * 12 + b.index + salt) % 3`
 * with a different salt per section, so neighboring pairs and neighboring
 * sections do not pick the same slot. Placeholders in templates:
 *   {A} {B}            sign names (canonical order, A has the lower index)
 *   {ElA} {ElB}        elements, capitalised · {elA} {elB} lower-case
 *   {ModA} {ModB}      modalities · {modVerb} what the shared modality does
 *   {rulerA} {rulerB}  traditional rulers
 */

import type { SunSign } from '@/lib/astrology/sunSigns'
import { SIGN_PROFILES } from '@/lib/fortune/sunSignCopy'
import {
  bestMatchesFor,
  type ElementPairing,
  type GradeKey,
  type RulerRelation,
  type SignRelation,
  type SunSignCompat,
} from './sunSignCompat'

export interface SunSignCompatCopy {
  /** 40–70 words. Answers "are A and B compatible?" in a way an assistant can quote. */
  directAnswer: string
  /** Short line under the h1. */
  headline: string
  clicks: string
  rubs: string
  inLove: string
  friendsWork: string
  /** Exactly three. */
  tips: string[]
  /** "As a partner, Aries …" for a and for b (one entry when same sign). */
  partnerLines: string[]
  faq: Array<{ question: string; answer: string }>
}

// ── Template filling ──

type Vars = Record<string, string>

export function fillTemplate(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? vars[key] : m))
}

const MODALITY_VERB: Record<string, string> = {
  Cardinal: 'initiate',
  Fixed: 'hold your ground',
  Mutable: 'adapt and shift',
}

function varsFor(c: SunSignCompat): Vars {
  const { a, b } = c
  return {
    A: a.name,
    B: b.name,
    ElA: a.element,
    ElB: b.element,
    elA: a.element.toLowerCase(),
    elB: b.element.toLowerCase(),
    ModA: a.modality,
    ModB: b.modality,
    modVerb: MODALITY_VERB[a.modality],
    rulerA: a.ruler,
    rulerB: b.ruler,
  }
}

export function variantIndex(c: SunSignCompat, salt: number, size = 3): number {
  return (c.a.index * 12 + c.b.index + salt) % size
}

const SALT = {
  clicks: 0,
  rubs: 1,
  love: 2,
  friends: 3,
  tip: 4,
  direct: 5,
  ruler: 6,
} as const

// ── Relation copy (3 variants per section) ──

interface RelationCopy {
  direct: string[]
  clicks: string[]
  rubs: string[]
  love: string[]
  friends: string[]
  tip: string[]
}

export const RELATION_COPY: Record<SignRelation, RelationCopy> = {
  same: {
    direct: [
      'Two {A} suns share one element, one modality and one ruler, so the match is built on recognition.',
      'Same sign means the same {elA}-sign instincts on both sides: easy understanding, doubled blind spots.',
      'This is a mirror match — {A} meeting {A} — strong on shared values, lighter on surprise.',
    ],
    clicks: [
      'Two {A} partners recognize each other on sight. You want the same things in the same order, you laugh at the same timing, and nobody has to explain why the {elA}-sign way of doing things matters more than being polite about it.',
      'Nothing needs translating here: {A} with {A} runs on one operating system. Plans form fast because you both already agree on what counts, and the comfort of being understood without effort is real and rare.',
      'The appeal of a same-sign match is relief. With another {A} you can stop performing — your pace, your priorities and your {elA}-sign way of handling a bad day are already the house rules.',
    ],
    rubs: [
      'The flip side of a mirror is that it shows your own blind spots twice. Whatever {A} tends to overdo, this pairing overdoes together, and there is no one in the room to counterbalance it.',
      'You share {A}’s strengths and you share {A}’s weak spots, so the same bad day lands on both of you at once. Without a built-in buffer, small spirals can feed each other until one of you deliberately steps out of the loop.',
      'Familiarity can shade into predictability. When both of you are {A}, surprises are rare, and a relationship that never surprises can start to feel like a very good friendship rather than a romance.',
    ],
    love: [
      'In love, {A} and {A} fall into step quickly: affection is expressed the way you each like to receive it, which skips a lot of early misunderstandings. The work is keeping novelty alive once the easy part is done.',
      'Romance between two {A} suns tends to be intense early and settled later. You read each other’s moods accurately, so comfort comes fast; invest in separate interests so you still have stories to bring home.',
      'Dating your own sign feels like being chosen by someone who truly gets it. Keep one eye on the shared weak spot — the thing {A} does under stress — because you will both do it at the same time.',
    ],
    friends: [
      'As friends or colleagues, two {A} personalities make a fast, aligned unit. You divide work the same way and want the same finish line, which is wonderful until a decision needs a second perspective.',
      'Working together, {A} and {A} move quickly and rarely argue about direction. Bring in a third voice for the parts of a project that neither of you naturally notices.',
      'Friendship between two {A} personalities is effortless: same humor, same energy, same idea of a good weekend. Your blind spots are also identical, so agree in advance on who checks the details the other one skips.',
    ],
    tip: [
      'Name the trait you both overdo and give one person the job of calling it when it shows up.',
      'Build in deliberate difference — separate hobbies, separate friends — so the relationship has something new to import.',
      'When you both have the same bad day, one of you declares a time-out instead of comparing notes.',
    ],
  },
  'semi-sextile': {
    direct: [
      'One sign apart, {A} and {B} share no element or modality, so common ground is built rather than found.',
      'Neighboring signs with little in common on paper: a {elA}-{elB} pairing that runs on curiosity.',
      'A semi-sextile: adjacent signs, different elements, and a relationship that grows by learning each other.',
    ],
    clicks: [
      '{A} and {B} are neighbors on the wheel, which means {B} carries the lesson {A} is just about to learn, and vice versa. There is an intriguing, slightly foreign quality that keeps you curious about each other.',
      'Adjacent signs have no shared element or modality, so what clicks here is novelty: {A}’s {elA}-sign instincts meet {B}’s {elB}-sign ones, and each of you gets a window into a way of living you never tried.',
      'You click when you treat this as a cultural exchange. {A} brings {elA}-style momentum, {B} brings {elB}-style method, and when you are both patient the combination covers ground neither could alone.',
    ],
    rubs: [
      'The friction is subtle rather than loud. {A} and {B} do not want opposite things; you want slightly different things in a different order, and that mismatch shows up as mild, repeated misunderstandings.',
      'Because {A} and {B} share nothing by default — not element, not modality, not polarity — you have to build common ground on purpose. Early on, the sense that the other person is almost but not quite on your page can be tiring.',
      'Semi-sextile pairs talk past each other without noticing. {A} assumes {B} meant one thing, {B} assumed the obvious was obvious, and both of you end up mildly puzzled rather than angry.',
    ],
    love: [
      'Romantically, {A} with {B} is a slow build. Attraction tends to grow out of curiosity rather than instant recognition, so give it more than one date before deciding.',
      'In love this pairing works best when you both enjoy being students. {A} learns some {elB}-sign patience or play from {B}; {B} picks up some of {A}’s {elA}-sign confidence. The romance is in the learning.',
      'For {A}, falling for {B} feels like dating someone from a neighboring country: familiar enough to relax, different enough to notice. Keep asking what things mean instead of assuming.',
    ],
    friends: [
      'As colleagues, {A} and {B} are more useful than comfortable. Your skills barely overlap, so a project gets covered from two angles — provided you check in more often than feels natural.',
      'Friendship between {A} and {B} often starts through a shared setting rather than instant chemistry: the same team, the same building. It deepens once you stop expecting the other person to react the way you would.',
      'At work, {A} and {B} take turns being the one who moves and the one who steadies, and the roles can swap by the day. Write things down; your assumptions about what you agreed will not match otherwise.',
    ],
    tip: [
      'Ask “what did you mean by that?” twice as often as you think you need to.',
      'Pick one shared ritual — a weekly walk, a standing dinner — so common ground exists by design, not by luck.',
      'Treat each other’s instincts as information from a different field rather than a mistake.',
    ],
  },
  sextile: {
    direct: [
      'Two signs apart, {A} and {B} form a sextile: {ElA} meets {ElB}, elements that feed each other.',
      'A sextile pairing — compatible elements, matching polarity — that clicks first as friendship.',
      '{A} and {B} sit at the friendliest conversational angle on the wheel, with elements that cooperate.',
    ],
    clicks: [
      '{A} and {B} are two signs apart, a sextile — the friendliest angle on the wheel for conversation. One of you is {ElA}, the other {ElB}, and those elements naturally feed each other.',
      'Sextile pairs click through talk. {A} and {B} share a polarity, so you set the same tempo in a room, and your {elA}-{elB} mix means ideas bounce rather than stall.',
      'The ease here is social before it is romantic: {A} and {B} like each other almost immediately. You find the same things funny and interesting, and friendship-grade comfort gives any romance a sturdy floor.',
    ],
    rubs: [
      'A sextile is easy enough that effort can go missing. {A} and {B} get along so smoothly that neither pushes the relationship to the next level; things stay pleasant and shallow unless someone decides otherwise.',
      'The friction between {A} and {B}, when it comes, is about depth. You talk well and often, but the harder emotional material can get skipped because nobody wants to disturb a good thing.',
      '{A} and {B} have different modalities, which helps with roles but can mean one of you feels like the one always starting things. Keep an eye on who initiates and who follows.',
    ],
    love: [
      'In love, {A} and {B} are the couple who actually enjoy each other’s company — long talks, shared curiosity, easy affection. Passion is warm rather than volcanic, and it tends to grow instead of flare.',
      'Romance between {A} and {B} often starts as a friendship that quietly becomes more. The {elA}-{elB} combination gives you both air to breathe and something to say; just make sure to name the feelings, not only the ideas.',
      'For {A}, dating {B} feels like being with your favorite person to sit next to. The risk is coasting: schedule the romantic gestures your easy rapport might otherwise make feel unnecessary.',
    ],
    friends: [
      'As friends or colleagues, {A} and {B} are a natural duo. You communicate with little friction, divide tasks by different strengths, and can disagree without it turning personal.',
      'Working together, sextile signs make good brainstorming partners: {A} offers one angle, {B} the complementary one, and the conversation itself does half the work.',
      'Friendship between {A} and {B} is low-maintenance and durable. You can go a month without talking and pick up mid-sentence, which is exactly why these pairs often last decades.',
    ],
    tip: [
      'Turn one easy conversation a week into a deliberately deeper one.',
      'Agree on who initiates what, so the easy flow does not quietly become one-sided.',
      'Protect the friendship inside the romance — it is the engine, not a side effect.',
    ],
  },
  square: {
    direct: [
      'Three signs apart, {A} and {B} square each other: same modality, different element, strong friction and strong pull.',
      'A square — the angle of attraction and argument — with both signs wanting to drive.',
      '{A} and {B} share a modality but not an element, which makes for heat and for head-butting.',
    ],
    clicks: [
      '{A} and {B} square each other — three signs apart, same modality, different element. It is the angle of friction and of attraction: you notice each other immediately, and not always comfortably.',
      'What clicks in a square is energy. Both of you are {ModA} signs, which means you both push, and when you push in the same direction very little can stop you.',
      'Square pairs are rarely bored. {A} challenges {B}, {B} challenges {A}, and that constant low-grade provocation keeps the relationship awake long after easier matches have settled down.',
    ],
    rubs: [
      'The rub is built in: same modality, different element means you both want to drive, and you want to drive to different places. {A} values {elA}-sign things, {B} values {elB}-sign things, and neither feels optional.',
      'Arguments between {A} and {B} tend to be about method rather than goals. You often agree on what should happen and clash over how, and the fight can feel more personal than the subject deserves.',
      'A square needs a referee, and you are both players. Without agreed rules for conflict, {A} and {B} can turn every small decision into a test of who yields first.',
    ],
    love: [
      'In love, {A} and {B} are the pair people describe as intense. Attraction is real and often immediate; the task is converting friction into fuel instead of letting it run the whole relationship.',
      'Romance between {A} and {B} runs hot. You find each other magnetic precisely because you are not alike; keep that charge by fighting fairly, since contempt is the one thing a square cannot carry.',
      'For {A} and {B}, dating each other feels like a dare you both keep accepting. The relationship can be deeply alive if both of you learn to lose gracefully some of the time.',
    ],
    friends: [
      'As colleagues, {A} and {B} are the pair whose debates produce the best plan in the room — once the debate ends. Give yourselves a deadline to decide.',
      'Friendship between {A} and {B} is often the loyal, sparring kind: you tease, you challenge, you show up when it counts. It works when respect runs underneath the ribbing.',
      'Working together, same-modality signs compete for the same role. Split the territory explicitly — {A} owns one part, {B} owns another — and the competition becomes productive.',
    ],
    tip: [
      'Decide the rules of a fair fight before you need them: no scorekeeping, no absolutes, one issue at a time.',
      'Give each other separate domains to lead; two drivers need two cars.',
      'Say what you admire about the other’s way of doing things at least as often as you critique it.',
    ],
  },
  trine: {
    direct: [
      'Four signs apart, {A} and {B} form a trine and share the {ElA} element — the easiest geometry in the zodiac.',
      'A trine: same element, complementary modalities, and very little that needs negotiating.',
      '{A} and {B} are both {ElA} signs, which means matching priorities and natural ease.',
    ],
    clicks: [
      '{A} and {B} are four signs apart — a trine, the most harmonious angle in the zodiac. You are both {ElA} signs, so you want the same kind of life and go after it in compatible rhythms.',
      'A trine clicks because nothing has to be negotiated at the level of temperament. {A} and {B} share an element, which means your idea of fun, rest and a good argument are already aligned.',
      'The ease between {A} and {B} is immediate and a little uncanny. Same element, different modality: you care about the same things and approach them from complementary angles, so you cover for each other without trying.',
    ],
    rubs: [
      'Trines are so comfortable that drift is the main risk. {A} and {B} can go years agreeing with each other and never quite grow, because growth usually comes from friction you do not have.',
      'Sharing an element means sharing its excesses. Two {elA} signs like {A} and {B} can amplify the same tendency — too much momentum, too much caution, too much talk — with no natural brake.',
      'The friction between {A} and {B} is quiet: taking each other for granted. When everything is easy, effort stops feeling necessary, and the relationship can slide from warm to merely pleasant.',
    ],
    love: [
      'In love, {A} and {B} are the couple whose friends say they just fit. Affection flows naturally, you read each other well, and the relationship rarely feels like work.',
      'Romance between {A} and {B} is warm and sustaining rather than dramatic. The passion is in the depth of understanding; keep a little mystery alive so comfort does not become routine.',
      'For {A}, falling for {B} often feels like coming home. The one thing to tend is challenge — invite it in deliberately, through shared goals or new experiences, since the relationship will not generate it on its own.',
    ],
    friends: [
      'As friends or colleagues, {A} and {B} share instincts, which makes collaboration fast and low-stress. Just make sure someone in the wider team represents the elements you both lack.',
      'Working together, {A} and {B} rarely clash and often finish each other’s thoughts. Your shared blind spot is whatever {elA} signs tend to undervalue — bring in someone who values it.',
      'Friendship between {A} and {B}, two {elA} signs, tends to be lifelong and low-drama. You recharge in the same way, which makes shared downtime unusually restorative.',
    ],
    tip: [
      'Set a shared goal that is slightly too big — a trine thrives when there is something to build.',
      'Invite outside perspectives on purpose; agreeing with each other is not the same as being right.',
      'Keep the small rituals of effort going: planned dates, real thank-yous, surprises.',
    ],
  },
  quincunx: {
    direct: [
      'Five signs apart, {A} and {B} form a quincunx: no shared element, modality or polarity, so everything is learned.',
      'A quincunx — the zodiac’s odd couple — where fascination has to do the work that similarity does elsewhere.',
      '{A} and {B} have almost nothing in common on paper, which makes the match demanding and growth-rich.',
    ],
    clicks: [
      '{A} and {B} sit five signs apart — a quincunx, the zodiac’s odd couple. You share no element, modality or polarity, which means every point of contact has to be invented, and that can be oddly compelling.',
      'What clicks in a quincunx is fascination. {A} cannot quite predict {B}, {B} cannot quite predict {A}, and the mystery pulls you back for another look.',
      'Quincunx pairs have nothing in common on paper and sometimes everything in practice. When {A} and {B} find a shared project or purpose, the lack of overlap turns into unusually wide coverage.',
    ],
    rubs: [
      'The rub is adjustment. {A} and {B} need to recalibrate constantly, because what feels obvious to one reads as puzzling to the other — not wrong, just from another planet.',
      'Nothing is automatic between {A} and {B}. Routines, affection, conflict style: each has to be learned from scratch, and the learning curve can feel steep in the first year.',
      'Five signs apart, {A} and {B} can feel like they are speaking related but distinct languages. Misreadings pile up quietly unless both of you keep translating out loud.',
    ],
    love: [
      'In love, a quincunx is the pairing that surprises everyone, including you. If it works, it works because {A} and {B} chose each other consciously rather than slipping into it.',
      'Romance between {A} and {B} asks for curiosity over assumption. The attraction is often strong precisely because you are so different; longevity depends on enjoying the difference rather than trying to fix it.',
      'Dating across a quincunx — {A} with {B} — means dating someone whose inner logic you will never fully predict. For partners who find that exciting, it is one of the most growth-rich matches on the wheel.',
    ],
    friends: [
      'As colleagues, {A} and {B} are a stretch assignment for each other. The partnership pays off when the task genuinely needs two unrelated skill sets.',
      'Friendship between {A} and {B} often forms around a shared circumstance and survives on good humor. You will not understand each other by default, so you learn to ask.',
      'Working together, {A} and {B} make the best devil’s-advocate pairing: each sees what the other structurally cannot. It is tiring and valuable in equal measure.',
    ],
    tip: [
      'Explain your reasoning, not just your conclusion — the logic is the part the other person cannot see.',
      'Keep a short list of things that mean something different to each of you, and add to it without judgment.',
      'Find a third thing — a project, a cause, a place — that both of you care about more than being understood.',
    ],
  },
  opposition: {
    direct: [
      'Six signs apart, {A} and {B} are opposites: compatible elements, shared modality, and a strong pull toward balance.',
      'An opposition — the classic magnetic match — where each of you carries what the other is missing.',
      '{A} and {B} face each other across the wheel: the same axis of life, approached from opposite ends.',
    ],
    clicks: [
      '{A} and {B} face each other across the zodiac — six signs apart, an opposition. You share a modality and a polarity, and your elements ({ElA} and {ElB}) are the compatible kind, so the attraction is strong and a little inevitable.',
      'Oppositions click through complementarity. Whatever {A} has too much of, {B} has in reserve, and both of you sense it; the pull toward balance is what makes the first conversation feel like it matters.',
      'Opposite signs are two answers to the same question. {A} and {B} care about the same axis of life from different ends, which makes you fascinating to each other and useful in a way few pairs are.',
    ],
    rubs: [
      'The rub is the mirror. {A} sees in {B} the quality it has been avoiding, and vice versa, so admiration and irritation arrive together and often about the same trait.',
      'Same modality means {A} and {B} both {modVerb}, so power can become the recurring argument. Oppositions do best when each of you has clear territory and nobody has to win every round.',
      'Oppositions polarise under stress: {A} goes more {elA}, {B} goes more {elB}, and the gap widens exactly when you need it to close. Notice the pattern early and step toward the middle.',
    ],
    love: [
      'In love, oppositions are the classic magnetic match. {A} and {B} feel completed by each other — and occasionally outnumbered. The romance stays strong while you keep treating the difference as the point.',
      'Romance between {A} and {B} is high-contrast: the attraction is immediate and the arguments are memorable. Couples who last learn to borrow the other’s strength instead of resenting it.',
      'Dating your opposite is a lesson in what you are missing. The relationship thrives when {A} picks up a little of {B}’s way and {B} a little of {A}’s, rather than each defending a corner.',
    ],
    friends: [
      'As colleagues, {A} and {B} are a strong two-person team if the roles are split by strength. You will see every problem from both sides, which is slower but produces better decisions.',
      'Friendship between {A} and {B} has a see-saw quality: you balance each other, and you occasionally land hard. It lasts when each of you can say “you were right about that” without ceremony.',
      'Working together, opposite signs cover the whole axis. Agree who leads on which kind of decision and the partnership runs well; leave it unsaid and every meeting becomes a tug of war.',
    ],
    tip: [
      'Name the quality you admire in each other and practice it yourself, a little, on purpose.',
      'Divide the territory: each of you leads where your sign is strongest, and the other backs it without re-litigating.',
      'Under stress, deliberately move toward the middle of your axis instead of further apart.',
    ],
  },
}

// ── Element-pair copy (10 unordered pairs) ──

interface ElementPairCopy {
  love: string
  friends: string
  tip: string
}

export const ELEMENT_PAIR_COPY: Record<string, ElementPairCopy> = {
  'Fire+Fire': {
    love: 'Two Fire signs burn bright together: spontaneous, physical, generous with enthusiasm. Keep some of that heat for the ordinary Tuesdays.',
    friends:
      'Fire with Fire gets things started fast; appoint someone — maybe an outside colleague — to finish them.',
    tip: 'Schedule rest. Two Fire signs rarely do it unprompted.',
  },
  'Earth+Earth': {
    love: 'Two Earth signs build a life rather than a fling: loyalty, comfort, real plans. Add play on purpose so steadiness does not become stillness.',
    friends:
      'Earth with Earth is the most reliable pairing in any office — thorough, practical, allergic to drama. Guard against shared over-caution.',
    tip: 'Book something impractical together every month; it is good for both of you.',
  },
  'Air+Air': {
    love: 'Two Air signs talk their way into love: ideas, jokes, late-night conversations. Make sure the body and the feelings get a vote too.',
    friends: 'Air with Air is a brainstorm that never ends; pair it with a deadline.',
    tip: 'After every big conversation, agree on one concrete action.',
  },
  'Water+Water': {
    love: 'Two Water signs feel everything together — a deep, intuitive bond with a tendency to merge. Keep separate shores so you have somewhere to swim back from.',
    friends:
      'Water with Water reads a room instantly and supports each other without being asked. Watch for shared moods pulling both of you under.',
    tip: 'When one of you is low, the other stays on dry land that day.',
  },
  'Fire+Air': {
    love: 'Fire and Air are the zodiac’s natural fuel and oxygen: the romance is lively, social and quick to laugh. The task is building something solid under the sparkle.',
    friends:
      'Fire with Air is the ideas-and-energy pairing: one supplies the vision, the other the push.',
    tip: 'Pick one project and finish it before starting the next three.',
  },
  'Earth+Water': {
    love: 'Earth and Water make a garden: Water brings feeling and intuition, Earth brings shelter and consistency. The bond deepens slowly and holds.',
    friends:
      'Earth with Water is quietly effective — one senses what people need, the other makes it happen.',
    tip: 'Say the appreciation out loud; both of you tend to assume it is understood.',
  },
  'Fire+Earth': {
    love: 'Fire and Earth move at different speeds: Fire wants to go now, Earth wants to go right. When you respect both, Fire gives Earth adventures and Earth gives Fire a home.',
    friends:
      'Fire with Earth is a sprinter paired with a marathoner; agree on the distance before the race.',
    tip: 'Fire slows down one gear; Earth speeds up one gear. Meet there.',
  },
  'Fire+Water': {
    love: 'Fire and Water make steam — intense, dramatic, hard to ignore. Fire learns that feelings are not attacks; Water learns that directness is not cruelty.',
    friends:
      'Fire with Water pairs courage with empathy, which is powerful once the two stop misreading each other’s tone.',
    tip: 'Pause before reacting: Fire counts to ten, Water says the thing out loud.',
  },
  'Earth+Air': {
    love: 'Earth and Air pair practice with theory: Air brings the idea, Earth asks how it will actually work. Respect turns that into a strong partnership; impatience turns it into a stalemate.',
    friends:
      'Earth with Air is planning paired with execution — strong once Air accepts the timeline and Earth accepts the detour.',
    tip: 'Air writes the plan down; Earth agrees to try one untested idea a month.',
  },
  'Air+Water': {
    love: 'Air and Water approach feelings from opposite doors — Air wants to understand them, Water wants to feel them. The relationship grows when you accept that both are valid ways of knowing.',
    friends:
      'Air with Water combines analysis and intuition, which produces unusually complete judgments when each trusts the other’s method.',
    tip: 'Air asks “how do you feel?” before “what do you think?”; Water answers in words, not weather.',
  },
}

const ELEMENT_ORDER = ['Fire', 'Earth', 'Air', 'Water']

export function elementPairCopyKey(x: string, y: string): string {
  return ELEMENT_ORDER.indexOf(x) <= ELEMENT_ORDER.indexOf(y) ? `${x}+${y}` : `${y}+${x}`
}

// ── Modality-pair copy (6 unordered pairs) ──

interface ModalityPairCopy {
  rub: string
  tip: string
}

export const MODALITY_PAIR_COPY: Record<string, ModalityPairCopy> = {
  'Cardinal+Cardinal': {
    rub: 'Two Cardinal signs both want to start things and lead them, so the recurring argument is about who decides.',
    tip: 'Rotate who leads: alternate decisions, or split them by domain.',
  },
  'Fixed+Fixed': {
    rub: 'Two Fixed signs are each immovable in their own way; stand-offs can last days because neither of you believes in blinking first.',
    tip: 'Agree a time limit on disagreements — after it, one of you concedes the small stuff.',
  },
  'Mutable+Mutable': {
    rub: 'Two Mutable signs adapt beautifully and decide slowly; plans drift because both of you are waiting for the other to commit.',
    tip: 'Set decisions in writing with a date, so flexibility has a frame.',
  },
  'Cardinal+Fixed': {
    rub: 'Cardinal starts, Fixed sustains — a strong division of labor, with friction when the Cardinal partner wants to change course and the Fixed one has already dug in.',
    tip: 'Cardinal gives notice before changing direction; Fixed agrees to a review date.',
  },
  'Cardinal+Mutable': {
    rub: 'Cardinal initiates and Mutable adapts, which flows well until the Mutable partner feels steered and the Cardinal one feels unsupported.',
    tip: 'Mutable states preferences early; Cardinal asks before deciding for both.',
  },
  'Fixed+Mutable': {
    rub: 'Fixed holds steady while Mutable shifts, which is stabilizing for one and stifling for the other depending on the week.',
    tip: 'Fixed names what truly must not change; everything else is negotiable.',
  },
}

const MODALITY_ORDER = ['Cardinal', 'Fixed', 'Mutable']

export function modalityPairCopyKey(x: string, y: string): string {
  return MODALITY_ORDER.indexOf(x) <= MODALITY_ORDER.indexOf(y) ? `${x}+${y}` : `${y}+${x}`
}

// ── Ruler copy ──

export const RULER_COPY: Record<RulerRelation, string[]> = {
  same: [
    'Both of you are ruled by {rulerA}, so your motives come from the same source even when your styles differ.',
    'A shared ruler — {rulerA} for both — means you understand each other’s underlying drive, which smooths a lot of surface friction.',
  ],
  friendly: [
    'Your rulers, {rulerA} and {rulerB}, are on good terms in traditional astrology, which adds goodwill to the mix.',
    '{rulerA} and {rulerB}, your two ruling planets, are classical allies — a small but steady tailwind for the relationship.',
  ],
  neutral: [
    'Your ruling planets, {rulerA} and {rulerB}, neither help nor hinder each other; the relationship stands on the geometry alone.',
    '{rulerA} and {rulerB} are neutral toward each other in the traditional scheme, so no extra lift and no extra drag from the rulers.',
  ],
  tense: [
    'Your rulers, {rulerA} and {rulerB}, are at odds in traditional astrology, which adds charge to the chemistry and a little static to the conversation.',
    '{rulerA} and {rulerB} — your two ruling planets — are in classical tension, the kind that makes attraction sharper and agreement slower.',
  ],
}

// ── Per-sign partner lines ──

export const SIGN_PARTNER_LINE: Record<string, string> = {
  aries:
    'As a partner, Aries leads with action: quick to commit to a plan, quicker to defend you, and happiest when the relationship still feels like a shared adventure.',
  taurus:
    'As a partner, Taurus builds comfort: steady routines, good food, loyalty that does not need announcing, and a slow warm-up that is worth the wait.',
  gemini:
    'As a partner, Gemini keeps the conversation alive: curious, funny, allergic to boredom, and most devoted to the person who stays interesting to talk to.',
  cancer:
    'As a partner, Cancer remembers everything that matters to you: protective, home-centred, tender once trust is earned, and sensitive to tone more than words.',
  leo: 'As a partner, Leo is generous and warm: loyal, openly affectionate, proud of you in public, and in need of real appreciation in return.',
  virgo:
    'As a partner, Virgo shows love through care: noticing what you need before you ask, fixing the small things, and holding themselves to a high standard.',
  libra:
    'As a partner, Libra keeps things fair and lovely: diplomatic, romantic, attentive to harmony, and sometimes slow to say what they actually want.',
  scorpio:
    'As a partner, Scorpio goes all in or not at all: intensely loyal, private, perceptive about what you are not saying, and slow to forgive a breach of trust.',
  sagittarius:
    'As a partner, Sagittarius brings the horizon along: honest, optimistic, generous with freedom, and happiest with someone who wants to grow alongside them.',
  capricorn:
    'As a partner, Capricorn plays the long game: reliable, quietly ambitious for you both, careful with promises, and warmer than the first impression suggests.',
  aquarius:
    'As a partner, Aquarius offers friendship first: independent, inventive, principled, and loyal in a cool, steady way that does not need constant reassurance.',
  pisces:
    'As a partner, Pisces loves with imagination: empathetic, romantic, forgiving, and in need of someone who helps keep one foot on the ground.',
}

const GRADE_PHRASE: Record<GradeKey, string> = {
  natural: 'a natural fit',
  easy: 'easy rapport',
  spark: 'sparks and friction',
  work: 'a match that takes work',
  growth: 'a growth pairing',
}

const ELEMENT_PAIRING_WORD: Record<ElementPairing, string> = {
  same: 'the same element',
  compatible: 'compatible elements',
  challenging: 'elements that need translating',
}

// ── Builder ──

const CLOSING =
  'Sun signs are one of about twenty factors in a full chart, so treat this as an opening sketch.'

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '')

/** "a trine" / "an opposition" — article for the relation word in the FAQ answer. */
function relationPhrase(relation: string): string {
  const word = relation.toLowerCase()
  if (word.startsWith('same')) return 'the same sign'
  return `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`
}

function rulerPhrase(rel: SunSignCompat['rulerRelation']): string {
  if (rel === 'same') return 'a shared ruling planet'
  if (rel === 'tense') return 'ruling planets in tension'
  return `${rel} ruling planets`
}

/**
 * One sentence only this pair can produce — what each sign brings, drawn from
 * the per-sign profiles the daily horoscope also uses. Keeps the 78 pages from
 * sharing their whole "clicks" paragraph with the other pairs of the same
 * relation; the variant index differs for (a, b) across siblings.
 */
function pairStrengthsLine(c: SunSignCompat): string {
  const pa = SIGN_PROFILES[c.a.slug]
  const pb = SIGN_PROFILES[c.b.slug]
  if (!pa || !pb) return ''
  const sa = pa.strengths[(c.a.index + c.b.index) % pa.strengths.length]
  const sb = pb.strengths[(c.a.index * 2 + c.b.index + 1) % pb.strengths.length]
  if (c.a.index === c.b.index) {
    return `What each ${c.a.name} adds, twice over: ${lowerFirst(sa)}.`
  }
  return `What ${c.a.name} adds: ${lowerFirst(sa)}. What ${c.b.name} adds: ${lowerFirst(sb)}.`
}

/** The pair-specific counterpart for "where it rubs": each sign's usual watch-out. */
function pairWatchOutsLine(c: SunSignCompat): string {
  const pa = SIGN_PROFILES[c.a.slug]
  const pb = SIGN_PROFILES[c.b.slug]
  if (!pa || !pb) return ''
  const wa = pa.watchOuts[(c.a.index + c.b.index) % pa.watchOuts.length]
  const wb = pb.watchOuts[(c.a.index * 2 + c.b.index + 1) % pb.watchOuts.length]
  if (c.a.index === c.b.index) {
    return `The usual watch-out, doubled: ${lowerFirst(wa)}.`
  }
  return `The usual watch-outs: for ${c.a.name}, ${lowerFirst(wa)}; for ${c.b.name}, ${lowerFirst(wb)}.`
}

function joinSentences(...parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
}

function listNames(items: Array<{ other: SunSign; score: number }>): string {
  const parts = items.map((m) => `${m.other.name} (${m.score})`)
  if (parts.length <= 1) {
    return parts.join('')
  }
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

export function buildSunSignCompatCopy(c: SunSignCompat): SunSignCompatCopy {
  const vars = varsFor(c)
  const rel = RELATION_COPY[c.relation]
  const pick = (arr: string[], salt: number) =>
    fillTemplate(arr[variantIndex(c, salt, arr.length)], vars)

  const elementCopy = ELEMENT_PAIR_COPY[elementPairCopyKey(c.a.element, c.b.element)]
  const modalityCopy = MODALITY_PAIR_COPY[modalityPairCopyKey(c.a.modality, c.b.modality)]
  const rulerLine = pick(RULER_COPY[c.rulerRelation], SALT.ruler)

  const sorted = [...c.breakdown].sort((p, q) => q.score - p.score)
  const hi = sorted[0]
  const lo = sorted[sorted.length - 1]
  const sameSign = c.a.index === c.b.index
  const pairName = sameSign ? `${c.a.name} and ${c.a.name}` : `${c.a.name} and ${c.b.name}`

  const directAnswer = joinSentences(
    `${pairName} score ${c.score}/100 — ${GRADE_PHRASE[c.gradeKey]}.`,
    pick(rel.direct, SALT.direct),
    `${hi.label} leads at ${hi.score}; ${lo.label.toLowerCase()} trails at ${lo.score}.`,
    CLOSING
  )

  const clicks = joinSentences(
    pick(rel.clicks, SALT.clicks),
    pairStrengthsLine(c),
    c.rulerRelation === 'tense' ? '' : rulerLine
  )
  const rubs = joinSentences(
    pick(rel.rubs, SALT.rubs),
    pairWatchOutsLine(c),
    modalityCopy.rub,
    c.rulerRelation === 'tense' ? rulerLine : ''
  )
  const inLove = joinSentences(pick(rel.love, SALT.love), elementCopy.love)
  const friendsWork = joinSentences(pick(rel.friends, SALT.friends), elementCopy.friends)
  const tips = [pick(rel.tip, SALT.tip), elementCopy.tip, modalityCopy.tip]

  const partnerLines = sameSign
    ? [SIGN_PARTNER_LINE[c.a.slug]]
    : [SIGN_PARTNER_LINE[c.a.slug], SIGN_PARTNER_LINE[c.b.slug]]

  const bestA = bestMatchesFor(c.a, { count: 3 })
  const bestB = bestMatchesFor(c.b, { count: 3 })

  const faq = [
    {
      question: sameSign
        ? `Are two ${c.a.name} partners compatible?`
        : `Are ${c.a.name} and ${c.b.name} compatible?`,
      answer: `${pairName} score ${c.score} out of 100 in this engine (${c.gradeLabel.toLowerCase()}). The pair is ${relationPhrase(c.relationLabel.split(' (')[0])} with ${ELEMENT_PAIRING_WORD[c.elementPairing]}, ${c.modalityPairing === 'same' ? 'the same modality' : 'different modalities'} and ${rulerPhrase(c.rulerRelation)}. ${hi.label} is the strongest line (${hi.score}) and ${lo.label.toLowerCase()} the weakest (${lo.score}). The overall score is a weighted mean of chemistry, communication, shared values and long-term ease.`,
    },
    {
      question: `What is the best match for ${c.a.name}?`,
      answer: sameSign
        ? `By this engine, ${c.a.name}’s highest-scoring sun-sign matches are ${listNames(bestA)}. Trines (same element) and sextiles with friendly rulers score highest; the full ranking is on the compatibility hub.`
        : `By this engine, ${c.a.name}’s highest-scoring sun-sign matches are ${listNames(bestA)}. For ${c.b.name} they are ${listNames(bestB)}. Trines (same element) and sextiles with friendly rulers score highest.`,
    },
    {
      question: 'What matters more than sun signs in compatibility?',
      answer:
        'The Moon sign (emotional needs), Venus and Mars (how each of you loves and wants), the rising sign (how you come across), and the aspects between the two charts — the synastry. A full comparison uses about twenty factors; a sun-sign score is the opening sketch, and the free compatibility report compares two complete charts.',
    },
  ]

  return {
    directAnswer,
    headline: sameSign
      ? `${c.a.name} with ${c.a.name}: ${GRADE_PHRASE[c.gradeKey]}`
      : `${c.a.name} and ${c.b.name}: ${GRADE_PHRASE[c.gradeKey]}`,
    clicks,
    rubs,
    inLove,
    friendsWork,
    tips,
    partnerLines,
    faq,
  }
}

/** Hub copy: what the page is, in one quotable paragraph (used once; kept here so prose stays in one file). */
export const HUB_INTRO =
  'Sun-sign compatibility compares the zodiac signs of two people by the geometry between them: how many signs apart they are, whether their elements feed or fight each other, whether they act in the same mode, and how their ruling planets get on. This page scores all 78 pairs with one deterministic rule set — same two signs, same number every time — and shows the arithmetic behind each score.'

export const HUB_FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'Which zodiac signs are most compatible?',
    answer:
      'Pairs that share an element (trines — four signs apart) score highest: Fire with Fire, Earth with Earth, Air with Air, Water with Water. Sextiles (two signs apart, such as Taurus and Cancer) come next, especially when the ruling planets are friendly. Oppositions are strong on chemistry but need more work on shared values.',
  },
  {
    question: 'Which signs are least compatible?',
    answer:
      'Signs one or five apart (semi-sextiles and quincunxes) share no element, modality or polarity, so they score lowest here — roughly 49 to 56 out of 100. That is a measure of how much has to be learned, not a verdict; many long partnerships are quincunxes.',
  },
  {
    question: 'How is the compatibility score calculated?',
    answer:
      'Each pair starts from a base set by the sign distance (same sign, sextile, square, trine, quincunx or opposition). Element pairing, modality, polarity and the relationship between the two ruling planets then add or subtract points across four dimensions — chemistry, communication, shared values and long-term ease. The overall score is a weighted mean (25/25/20/30). No AI and no randomness are involved; the receipt on each page shows every step.',
  },
  {
    question: 'Is sun-sign compatibility accurate?',
    answer:
      'It is a real but partial signal. The Sun is one of about twenty factors astrologers compare between two charts; the Moon, Venus, Mars, the rising sign and the aspects between the charts usually matter more for day-to-day compatibility. Use the sun-sign score as the opening sketch and a full two-chart comparison for the detail.',
  },
]
