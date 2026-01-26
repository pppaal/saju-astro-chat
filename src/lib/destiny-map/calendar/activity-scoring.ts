// src/lib/destiny-map/calendar/activity-scoring.ts
/**
 * Activity-specific scoring logic
 * бToЙ?T Нo б~Й3, Н ?Н^~ И3,Н,° (Н-°Н , НпЙ▌кН-', НzкЙкм, Н-кб-%, Иё'И°, бTН-.)
 */

export type ActivityType = 'love' | 'career' | 'wealth' | 'travel' | 'health' | 'study' | 'general';

export interface GongmangInfo {
  isEmpty: boolean;
  affectedAreas: string[];
}

export interface ShinsalInfo {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  affectedArea: string;
}

export interface EnergyInfo {
  strength: string;
  dominantElement: string;
}

export interface LegacyGongmangInfo {
  isGongmang?: boolean;
  branch?: string;
  pair?: string | null;
  isEmpty?: boolean;
  affectedAreas?: string[];
}

export interface LegacyShinsalInfo {
  key?: string;
  description?: string;
  beneficialFor?: string[];
  harmfulFor?: string[];
}

export interface LegacyEnergyInfo {
  strength?: string;
  dominantElement?: string;
}

export interface ActivityScoreResult {
  score: number;
  factors: string[];
}

function normalizeGongmang(info: LegacyGongmangInfo | GongmangInfo | null | undefined): GongmangInfo {
  const isEmpty = Boolean(info && ('isEmpty' in info ? info.isEmpty : info.isGongmang));
  const affectedAreas = Array.isArray(info?.affectedAreas) ? info.affectedAreas : [];
  return { isEmpty, affectedAreas };
}

function normalizeEnergy(info: LegacyEnergyInfo | EnergyInfo | null | undefined): EnergyInfo {
  return {
    strength: typeof info?.strength === 'string' ? info.strength : 'moderate',
    dominantElement: typeof info?.dominantElement === 'string' ? info.dominantElement : '',
  };
}

function isRelevantActivity(activityType: ActivityType, targets?: string[] | null): boolean {
  if (!targets || targets.length === 0) {return false;}
  if (targets.includes('all')) {return true;}
  if (targets.includes('general') && activityType === 'general') {return true;}
  return targets.includes(activityType);
}

function computeActivityScore(
  activityType: ActivityType,
  baseScore: number,
  gongmangInfo: LegacyGongmangInfo | GongmangInfo | null | undefined,
  shinsals: Array<ShinsalInfo | LegacyShinsalInfo> | null | undefined,
  energyInfo: LegacyEnergyInfo | EnergyInfo | null | undefined
): ActivityScoreResult {
  let score = baseScore;
  const factors: string[] = [];

  const gongmang = normalizeGongmang(gongmangInfo);
  const energy = normalizeEnergy(energyInfo);

  // И3цЙ? Н~?б-Э: б'Й<1 Н~?Н--Н?' И3цЙ? Н~?Н--Н-? б?кб"Й?~Йc' -10
  if (gongmang.isEmpty || gongmang.affectedAreas.includes(activityType)) {
    score -= 10;
    factors.push('공망');
  }

  // Н< Н,' Н~?б-Э: б'Й<1 Н~?Н--Н-? Н ?НscЙ?~ЙS" Н< Н,' Й°~Н~?
  const shinsalList = Array.isArray(shinsals) ? shinsals : [];
  for (const shinsal of shinsalList) {
    if (!shinsal) {continue;}

    if ('beneficialFor' in shinsal || 'harmfulFor' in shinsal) {
      const beneficial = isRelevantActivity(activityType, shinsal.beneficialFor);
      const harmful = isRelevantActivity(activityType, shinsal.harmfulFor);
      const label = shinsal.key || shinsal.description || 'shinsal';

      if (beneficial) {
        score += 8;
        factors.push(`${label} (+)`);
      }
      if (harmful) {
        score -= 8;
        factors.push(`${label} (-)`);
      }
      continue;
    }

    if ('affectedArea' in shinsal && typeof shinsal.affectedArea === 'string') {
      const area = shinsal.affectedArea;
      const isMatch = area === 'all' || area === 'general' || area.includes(activityType);
      if (isMatch) {
        const label = shinsal.name || 'shinsal';
        if (shinsal.type === 'lucky') {
          score += 8;
          factors.push(`${label} (+)`);
        } else if (shinsal.type === 'unlucky') {
          score -= 8;
          factors.push(`${label} (-)`);
        }
      }
    }
  }

  // Н-?Й,^Н? И°Й?, Й°~Н~?
  const energyBonus: Record<string, number> = {
    very_strong: 5,
    strong: 3,
    moderate: 0,
    weak: -3,
    very_weak: -5,
  };
  const strengthBonus = energyBonus[energy.strength] || 0;
  if (strengthBonus !== 0) {
    score += strengthBonus;
    factors.push(`energy:${energy.strength}`);
  }

  // бToЙ?TЙ3, Н~б-% Нн°бc Й°~Н~?
  const activityElements: Record<ActivityType, string[]> = {
    love: ['fire', 'wood'],
    career: ['metal', 'earth'],
    wealth: ['earth', 'metal'],
    travel: ['water', 'fire'],
    health: ['wood', 'water'],
    study: ['water', 'wood'],
    general: [],
  };

  const preferredElements = activityElements[activityType] || [];
  if (energy.dominantElement && preferredElements.includes(energy.dominantElement)) {
    score += 5;
    factors.push(`element:${energy.dominantElement}`);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    factors,
  };
}

/**
 * Calculate activity-specific score based on gongmang, shinsals, and energy
 *
 * @param activityType - Type of activity (love, career, wealth, travel, health, study)
 * @param baseScore - Base score before adjustments
 * @param gongmang - Gongmang (void) information
 * @param shinsals - List of active shinsals
 * @param energy - Energy strength and dominant element
 * @returns Adjusted activity score
 */
export function calculateActivityScore(
  activityType: ActivityType,
  gongmang: LegacyGongmangInfo,
  energy: LegacyEnergyInfo,
  shinsals: LegacyShinsalInfo[]
): ActivityScoreResult;
export function calculateActivityScore(
  activityType: ActivityType,
  baseScore: number,
  gongmang: GongmangInfo,
  shinsals: ShinsalInfo[],
  energy: EnergyInfo
): number;
export function calculateActivityScore(
  activityType: ActivityType,
  arg1: number | LegacyGongmangInfo,
  arg2?: LegacyEnergyInfo | GongmangInfo,
  arg3?: LegacyShinsalInfo[] | ShinsalInfo[],
  arg4?: EnergyInfo
): number | ActivityScoreResult {
  if (typeof arg1 === 'number') {
    const result = computeActivityScore(
      activityType,
      arg1,
      arg2 as GongmangInfo,
      arg3 as ShinsalInfo[],
      arg4
    );
    return result.score;
  }

  return computeActivityScore(
    activityType,
    50,
    arg1,
    arg3 as LegacyShinsalInfo[],
    arg2 as LegacyEnergyInfo
  );
}
