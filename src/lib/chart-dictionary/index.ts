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

export function getHouseRich(num: HouseNumber, lang: Lang): HouseLangEntry | null {
  return astroHouse[String(num)]?.[lang] ?? null;
}

export function getPlanetCore(name: string, lang: Lang): PlanetLangEntry | null {
  return astroPlanet[name]?.[lang] ?? null;
}

export function getHanjaRich(char: string, lang: Lang): HanjaLangEntry | null {
  const entry = hanja.stems[char] ?? hanja.branches[char];
  return entry?.[lang] ?? null;
}
