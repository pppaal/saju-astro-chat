import iljuData from './ilju-60.json';
import relationsData from './relations-pairs.json';
import geokgukData from './geokguk-rich.json';
import sibsinData from './sibsin-category.json';
import sajuStrengthData from './saju-strength.json';
import astroDignityData from './astro-dignity.json';
import astroAspectData from './astro-aspect-minor.json';
import astroHouseData from './astro-house-rich.json';
import astroPlanetData from './astro-planet-core.json';
import hanjaData from './hanja-rich.json';

export type Lang = 'ko' | 'en';

// ── Categorical unions (typo guard + IDE autocomplete) ──────────────────────
export type SibsinCategory = '비겁' | '식상' | '재성' | '관성' | '인성';

/**
 * 정/편 십신 10종 → 5 카테고리 매핑. 카테고리 단위 dictionary 와 짝을 이뤄
 * "비견·겁재 → 비겁" 같은 정/편 통합을 한 곳에서 관리. SSOT.
 */
export const SIBSIN_NAME_TO_CATEGORY: Record<string, SibsinCategory> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  정재: '재성',
  편재: '재성',
  정관: '관성',
  편관: '관성',
  정인: '인성',
  편인: '인성',
};
export type RelationCategory =
  | '천간합'
  | '천간충'
  | '지지육합'
  | '지지삼합'
  | '지지방합'
  | '지지충'
  | '지지형'
  | '지지파'
  | '지지해'
  | '원진';
export type SajuStrengthCategory = '통근' | '득령' | '득세' | '조후' | '용신' | '기신_구신';
export type DignityStatus = 'Domicile' | 'Exaltation' | 'Detriment' | 'Fall' | 'Peregrine';

// ── Ilju 60 ─────────────────────────────────────────────────────────────────
export interface IljuLangEntry {
  character: string;
  strength: string;
  weakness: string;
  career: string;
  love: string;
}
export interface IljuEntry {
  ko: IljuLangEntry;
  en: IljuLangEntry;
}
type IljuMap = Record<string, IljuEntry>;

// ── Relations (천간합/충, 지지합/충/형/파/해, 원진) ───────────────────────────
export interface RelationLangEntry {
  result?: string;
  meaning: string;
  personality?: string;
}
export interface RelationEntry {
  ko: RelationLangEntry;
  en: RelationLangEntry;
}
type RelationsMap = Record<string, Record<string, RelationEntry>>;

// ── Geokguk ─────────────────────────────────────────────────────────────────
export interface GeokgukLangEntry {
  tagline: string;
  personality: string;
  strength: string[];
  weakness: string[];
  career: string[];
  love: string;
  advice: string;
}
export interface GeokgukEntry {
  ko: GeokgukLangEntry;
  en: GeokgukLangEntry;
}
type GeokgukMap = Record<string, GeokgukEntry>;

// ── Sibsin category (비겁/식상/재성/관성/인성) ──────────────────────────────
export type SibsinState = 'dominant' | 'missing' | 'balanced';
export interface SibsinStateBlock {
  title: string;
  meaning: string;
  warning?: string;
  advice?: string;
}
export interface SibsinLangEntry {
  category_meaning: string;
  dominant: SibsinStateBlock;
  missing: SibsinStateBlock;
  balanced: SibsinStateBlock;
}
export interface SibsinCategoryEntry {
  ko: SibsinLangEntry;
  en: SibsinLangEntry;
}
type SibsinMap = Record<string, SibsinCategoryEntry>;

// ── Saju strength (통근/득령/득세/조후/용신/기신_구신) ──────────────────────
// Sub-keys vary per category, so model as flexible record of unknown leaf.
export type SajuStrengthLeaf =
  | string
  | string[]
  | Record<string, string>
  | { label?: string; explain?: string };
export interface SajuStrengthLangEntry {
  meaning: string;
  advice?: string;
  [key: string]: SajuStrengthLeaf | undefined;
}
export interface SajuStrengthEntry {
  ko: SajuStrengthLangEntry;
  en: SajuStrengthLangEntry;
}
type SajuStrengthMap = Record<string, SajuStrengthEntry>;

// ── Astro dignity ───────────────────────────────────────────────────────────
// Each entry has bilingual `ko`/`en` strings and optional `sign` (Peregrine has none).
// Outer planet records additionally hold a `note: {ko,en}` explaining schema
// asymmetry — it sits at the same nesting level as dignity entries.
export interface AstroDignityRawEntry {
  sign?: string;
  ko: string;
  en: string;
}
export interface AstroDignityNoteEntry {
  ko: string;
  en: string;
}
type AstroDignityValue = AstroDignityRawEntry | AstroDignityNoteEntry;
type AstroDignityMap = Record<string, Record<string, AstroDignityValue>>;
/** Result returned to chart UI — sign optional, lang-resolved text. */
export interface DignityResult {
  sign?: string;
  text: string;
}

// ── Astro aspect ────────────────────────────────────────────────────────────
export interface AspectLangEntry {
  label: string;
  tension: string;
  meaning: string;
  experience: string;
  advice: string;
}
export interface AspectEntry {
  angle: number;
  ko: AspectLangEntry;
  en: AspectLangEntry;
}
type AspectMap = Record<string, AspectEntry>;

// ── Astro house ─────────────────────────────────────────────────────────────
export interface HouseLangEntry {
  name: string;
  domain: string;
  meaning: string;
  planet_in: string;
  empty: string;
  keywords: string[];
}
export interface HouseEntry {
  ko: HouseLangEntry;
  en: HouseLangEntry;
}
type HouseMap = Record<string, HouseEntry>;
export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// ── Astro planet core ───────────────────────────────────────────────────────
export interface PlanetLangEntry {
  name: string;
  principle: string;
  meaning: string;
  rules: string;
  natal_strong: string;
  natal_weak: string;
  keywords: string[];
}
export interface PlanetEntry {
  ko: PlanetLangEntry;
  en: PlanetLangEntry;
}
type PlanetMap = Record<string, PlanetEntry>;

// ── Hanja (stems + branches) ────────────────────────────────────────────────
export interface HanjaStemLangEntry {
  name: string;
  yinYang: string;
  element: string;
  image: string;
  nature: string;
  strength: string[];
  weakness: string[];
  as_daymaster: string;
  career: string[];
}
export interface HanjaBranchLangEntry {
  name: string;
  animal: string;
  element: string;
  season: string;
  time: string;
  direction: string;
  image: string;
  nature: string;
  as_daybranch: string;
  hidden_stems: string;
}
export type HanjaLangEntry = HanjaStemLangEntry | HanjaBranchLangEntry;
export interface HanjaStemEntry { ko: HanjaStemLangEntry; en: HanjaStemLangEntry }
export interface HanjaBranchEntry { ko: HanjaBranchLangEntry; en: HanjaBranchLangEntry }
interface HanjaRoot {
  stems: Record<string, HanjaStemEntry>;
  branches: Record<string, HanjaBranchEntry>;
}

// ── Typed internal consts ───────────────────────────────────────────────────
const ilju = iljuData as IljuMap;
const relations = relationsData as RelationsMap;
const geokguk = geokgukData as GeokgukMap;
const sibsin = sibsinData as SibsinMap;
const sajuStrength = sajuStrengthData as SajuStrengthMap;
const astroDignity = astroDignityData as AstroDignityMap;
const astroAspect = astroAspectData as AspectMap;
const astroHouse = astroHouseData as HouseMap;
const astroPlanet = astroPlanetData as PlanetMap;
const hanja = hanjaData as unknown as HanjaRoot;

// ── Lookup helpers ──────────────────────────────────────────────────────────
export function getIljuArchetype(ganji: string, lang: Lang): IljuLangEntry | null {
  return ilju[ganji]?.[lang] ?? null;
}

export function getRelationMeaning(
  category: RelationCategory,
  pair: string,
  lang: Lang
): RelationLangEntry | null {
  return relations[category]?.[pair]?.[lang] ?? null;
}

export function getGeokgukRich(name: string, lang: Lang): GeokgukLangEntry | null {
  return geokguk[name]?.[lang] ?? null;
}

export function getSibsinCategory(
  category: SibsinCategory,
  state: SibsinState,
  lang: Lang
): SibsinStateBlock | null {
  return sibsin[category]?.[lang]?.[state] ?? null;
}

export function getSibsinCategoryMeaning(category: SibsinCategory, lang: Lang): string | null {
  return sibsin[category]?.[lang]?.category_meaning ?? null;
}

function getSajuStrengthMeaning(
  category: SajuStrengthCategory,
  key: string,
  lang: Lang
): SajuStrengthLeaf | null {
  const entry = sajuStrength[category]?.[lang];
  if (!entry) return null;
  return entry[key] ?? null;
}

/**
 * 행성×위신 의미 — sign(있으면) + 언어 텍스트.
 * 외행성(Uranus/Neptune/Pluto) 의 `note` 키는 dignity 가 아니므로 거름 →
 * `getDignityNote()` 별도 사용.
 */
export function getAstroDignity(
  planet: string,
  status: DignityStatus,
  lang: Lang
): DignityResult | null {
  const value = astroDignity[planet]?.[status];
  if (!value || !('ko' in value)) return null;
  // Both AstroDignityRawEntry and AstroDignityNoteEntry have ko/en;
  // narrow by status being a known DignityStatus (already constrained by param type).
  const sign = 'sign' in value ? value.sign : undefined;
  return { sign, text: value[lang] };
}

/** 외행성 dignity 비대칭 설명 note — Uranus/Neptune/Pluto 만 존재. */
function getDignityNote(planet: 'Uranus' | 'Neptune' | 'Pluto', lang: Lang): string | null {
  const value = astroDignity[planet]?.note;
  if (!value || !('ko' in value)) return null;
  return value[lang];
}

export function getAspectMeaning(
  name: string,
  lang: Lang
): (AspectLangEntry & { angle: number }) | null {
  const entry = astroAspect[name];
  if (!entry) return null;
  return { angle: entry.angle, ...entry[lang] };
}

// 미성년(만 14세 미만) 안전 모드 — 하우스 영역 키워드에서 연애·결혼·자녀·성·죽음을
// 발달 단계에 맞는 표현으로 치환(아동 부적합 방지). 나머지 하우스는 그대로.
const MINOR_HOUSE_DOMAIN: Record<number, { ko: string; en: string }> = {
  5: { ko: '창조·놀이·자기표현', en: 'Creativity · play · self-expression' },
  7: { ko: '1:1 관계·파트너십·약속', en: 'One-to-one relationships · partnership · commitments' },
  8: { ko: '공유 자원·깊이·변화·재생', en: 'Shared resources · depth · transformation · renewal' },
};

export function getHouseRich(
  num: HouseNumber,
  lang: Lang,
  isMinor = false
): HouseLangEntry | null {
  const entry = astroHouse[String(num)]?.[lang] ?? null;
  if (!entry) return null;
  if (isMinor && MINOR_HOUSE_DOMAIN[num]) {
    return { ...entry, domain: MINOR_HOUSE_DOMAIN[num][lang] };
  }
  return entry;
}

// 미성년 안전 모드 — 화성·릴리스·명왕성의 성적/공격적/죽음 의미를 발달 단계에 맞게
// 치환. meaning(본문)·principle(가시 한 줄 결)·keywords(레전드/툴팁) 모두 안전화.
type MinorPlanetFields = { meaning: string; principle: string; keywords: string[] }
const MINOR_PLANET_OVERRIDE: Record<string, { ko: MinorPlanetFields; en: MinorPlanetFields }> = {
  Mars: {
    ko: {
      meaning:
        '원하는 걸 어떻게 밀고 나가는지. 화가 날 때 표현하는 방식과, 마음먹은 걸 행동으로 옮기는 추진력이에요.',
      principle: '행동·추진력·용기',
      keywords: ['행동', '추진력', '용기', '도전'],
    },
    en: {
      meaning:
        'How you go after what you want — how you handle frustration, face challenges, and turn intention into action.',
      principle: 'Action · Drive · Courage',
      keywords: ['action', 'drive', 'courage', 'challenge'],
    },
  },
  Lilith: {
    ko: {
      meaning:
        '남들과 달라도 나답게 지키는 부분이에요. 독립심과 진짜 나다움이 살아나는 자리예요.',
      principle: '독립·나다움',
      keywords: ['독립', '개성', '나다움', '자기다움'],
    },
    en: {
      meaning:
        'The part of you that stays true to itself even when it does not fit in — where your independence and authentic self come alive.',
      principle: 'Independence · True Self',
      keywords: ['independence', 'individuality', 'authenticity', 'self'],
    },
  },
  Pluto: {
    ko: {
      meaning:
        '깊은 곳에서 큰 변화가 일어나는 영역이에요. 한 번 크게 달라지면 더 단단해지는 힘이에요.',
      principle: '큰 변화·깊이·집중',
      keywords: ['변화', '깊이', '집중', '회복'],
    },
    en: {
      meaning:
        'The area where deep, powerful change happens — once something transforms, you come back stronger.',
      principle: 'Transformation · Depth · Focus',
      keywords: ['change', 'depth', 'focus', 'renewal'],
    },
  },
};

export function getPlanetCore(
  name: string,
  lang: Lang,
  isMinor = false
): PlanetLangEntry | null {
  const entry = astroPlanet[name]?.[lang] ?? null;
  if (!entry) return null;
  if (isMinor && MINOR_PLANET_OVERRIDE[name]) {
    const o = MINOR_PLANET_OVERRIDE[name][lang];
    return { ...entry, meaning: o.meaning, principle: o.principle, keywords: o.keywords };
  }
  return entry;
}

export function getHanjaRich(char: string, lang: Lang): HanjaLangEntry | null {
  const entry = hanja.stems[char] ?? hanja.branches[char];
  return entry?.[lang] ?? null;
}
