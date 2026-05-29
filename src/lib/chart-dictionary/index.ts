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
export type SajuStrengthLeaf = string | string[] | Record<string, string> | { label?: string; explain?: string };
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
export interface AstroDignityEntry {
  sign?: string;
  ko: string;
  en: string;
}
type AstroDignityMap = Record<string, Record<string, AstroDignityEntry | string>>;

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

export function getRelationMeaning(category: string, pair: string, lang: Lang): RelationLangEntry | null {
  return relations[category]?.[pair]?.[lang] ?? null;
}

export function getGeokgukRich(name: string, lang: Lang): GeokgukLangEntry | null {
  return geokguk[name]?.[lang] ?? null;
}

export function getSibsinCategory(category: string, state: SibsinState, lang: Lang): SibsinStateBlock | null {
  return sibsin[category]?.[lang]?.[state] ?? null;
}

export function getSibsinCategoryMeaning(category: string, lang: Lang): string | null {
  return sibsin[category]?.[lang]?.category_meaning ?? null;
}

export function getSajuStrengthMeaning(category: string, key: string, lang: Lang): SajuStrengthLeaf | null {
  const entry = sajuStrength[category]?.[lang];
  if (!entry) return null;
  const value = entry[key];
  return value ?? null;
}

export function getAstroDignity(planet: string, status: string, lang: Lang): AstroDignityEntry | null {
  const value = astroDignity[planet]?.[status];
  if (!value || typeof value === 'string') return null;
  return value;
}

export function getAspectMeaning(name: string, lang: Lang): (AspectLangEntry & { angle: number }) | null {
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
