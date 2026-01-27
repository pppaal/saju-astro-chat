/**
 * Karma Narratives Loader
 * Lazy-loads karma narrative data from JSON files
 */

export interface NarrativeContent {
  ko: string[];
  en: string[];
}

export interface DayMasterNarratives {
  [key: string]: NarrativeContent;
}

export interface HouseNarratives {
  [key: number]: NarrativeContent;
}

export interface ShinsalNarratives {
  [key: string]: NarrativeContent;
}

// Cache for loaded data
let dayMasterCache: DayMasterNarratives | null = null;
let northNodeCache: HouseNarratives | null = null;
let saturnCache: HouseNarratives | null = null;
let shinsalCache: ShinsalNarratives | null = null;

/**
 * Load day master narratives (일간 확장 서사)
 */
export async function loadDayMasterNarratives(): Promise<DayMasterNarratives> {
  if (dayMasterCache) {
    return dayMasterCache;
  }

  const response = await fetch('/data/karma/day-master-narratives.json');
  if (!response.ok) {
    throw new Error(`Failed to load day master narratives: ${response.statusText}`);
  }

  dayMasterCache = await response.json();
  return dayMasterCache!;
}

/**
 * Load North Node house narratives (노스노드 하우스 확장 서사)
 */
export async function loadNorthNodeNarratives(): Promise<HouseNarratives> {
  if (northNodeCache) {
    return northNodeCache;
  }

  const response = await fetch('/data/karma/north-node-narratives.json');
  if (!response.ok) {
    throw new Error(`Failed to load north node narratives: ${response.statusText}`);
  }

  northNodeCache = await response.json();
  return northNodeCache!;
}

/**
 * Load Saturn house narratives (토성 하우스 확장 서사)
 */
export async function loadSaturnNarratives(): Promise<HouseNarratives> {
  if (saturnCache) {
    return saturnCache;
  }

  const response = await fetch('/data/karma/saturn-narratives.json');
  if (!response.ok) {
    throw new Error(`Failed to load saturn narratives: ${response.statusText}`);
  }

  saturnCache = await response.json();
  return saturnCache!;
}

/**
 * Load shinsal narratives (신살 확장 서사)
 */
export async function loadShinsalNarratives(): Promise<ShinsalNarratives> {
  if (shinsalCache) {
    return shinsalCache;
  }

  const response = await fetch('/data/karma/shinsal-narratives.json');
  if (!response.ok) {
    throw new Error(`Failed to load shinsal narratives: ${response.statusText}`);
  }

  shinsalCache = await response.json();
  return shinsalCache!;
}

/**
 * Get specific day master narrative
 */
export async function getDayMasterNarrative(dayMaster: string): Promise<NarrativeContent | null> {
  const narratives = await loadDayMasterNarratives();
  return narratives[dayMaster] || null;
}

/**
 * Get specific North Node house narrative
 */
export async function getNorthNodeNarrative(house: number): Promise<NarrativeContent | null> {
  const narratives = await loadNorthNodeNarratives();
  return narratives[house] || null;
}

/**
 * Get specific Saturn house narrative
 */
export async function getSaturnNarrative(house: number): Promise<NarrativeContent | null> {
  const narratives = await loadSaturnNarratives();
  return narratives[house] || null;
}

/**
 * Get specific shinsal narrative
 */
export async function getShinsalNarrative(shinsal: string): Promise<NarrativeContent | null> {
  const narratives = await loadShinsalNarratives();
  return narratives[shinsal] || null;
}

/**
 * Clear all caches (useful for testing or forced reload)
 */
export function clearNarrativesCaches(): void {
  dayMasterCache = null;
  northNodeCache = null;
  saturnCache = null;
  shinsalCache = null;
}
