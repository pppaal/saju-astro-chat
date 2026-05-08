/**
 * Branch Relationship Analyzer
 * Analyzes branch (지지) relationships: 삼합, 육합, 충, 형, 해
 */

import type { EventCategory } from '../types';

export interface BranchRelationshipResult {
  factorKeys: string[];
  recommendations: string[];
  warnings: string[];
  categories: EventCategory[];
  titleKey?: string;
  descKey?: string;
  filterScenarios: Array<'chung' | 'xing' | 'hai'>;
}

interface AnalyzeRelationshipInput {
  dayBranch: string;
  ganzhiBranch: string;
  dayMasterElement: string;
  relations: {
    generates: string;
    generatedBy: string;
    controls: string;
    controlledBy: string;
  };
  SAMHAP: Record<string, string[]>;
  YUKHAP: Record<string, string>;
  CHUNG: Record<string, string>;
  XING: Record<string, string[]>;
  currentTitleKey?: string;
}

/**
 * 해 (害) mapping - used for harm relationship
 */
const HAI_MAP: Record<string, string> = {
  "子": "未", "未": "子", "丑": "午", "午": "丑",
  "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
  "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
};

/**
 * Analyze branch relationships (삼합, 육합, 충, 형, 해)
 * This function consolidates multiple branch relationship checks into one utility
 * 
 * @param input - Branch relationship analysis input
 * @returns Consolidated results with factor keys, recommendations, warnings, and categories
 */
export function analyzeBranchRelationships(input: AnalyzeRelationshipInput): BranchRelationshipResult {
  const {
    dayBranch,
    ganzhiBranch,
    dayMasterElement,
    relations,
    SAMHAP,
    YUKHAP,
    CHUNG,
    XING,
    currentTitleKey,
  } = input;
  
  const result: BranchRelationshipResult = {
    factorKeys: [],
    recommendations: [],
    warnings: [],
    categories: [],
    filterScenarios: [],
  };
  
  if (!dayBranch) {
    return result;
  }
  
  // 1. 삼합 (Three Harmony) 체크 - 가장 강력
  for (const [element, branches] of Object.entries(SAMHAP)) {
    if (branches.includes(dayBranch) && branches.includes(ganzhiBranch)) {
      if (element === dayMasterElement || element === relations.generatedBy) {
        result.factorKeys.push("branchSamhap");
        if (!currentTitleKey) {
          result.titleKey = "calendar.samhap";
          result.descKey = "calendar.samhapDesc";
        }
        result.recommendations.push("bigDecision", "contract", "partnership");
        if (!result.categories.includes("general")) {
          result.categories.push("general");
        }
      } else if (element === relations.controlledBy) {
        result.factorKeys.push("branchSamhapNegative");
        result.warnings.push("opposition");
      }
    }
  }
  
  // 2. 육합 (Six Harmony) 체크 - 인연/화합
  if (YUKHAP[dayBranch] === ganzhiBranch) {
    result.factorKeys.push("branchYukhap");
    if (!currentTitleKey && !result.titleKey) {
      result.titleKey = "calendar.yukhap";
      result.descKey = "calendar.yukhapDesc";
    }
    result.categories.push("love");
    result.recommendations.push("love", "meeting", "reconciliation");
  }
  
  // 3. 충 (Clash) 체크 - 충돌/변화
  if (CHUNG[dayBranch] === ganzhiBranch) {
    result.categories.push("travel", "health");
    result.titleKey = "calendar.chung";
    result.descKey = "calendar.chungDesc";
    result.factorKeys.push("branchChung");
    result.warnings.push("avoidTravel", "conflict", "accident", "avoidChange");
    result.recommendations.push("careful", "postpone");
    // Mark for recommendation filtering
    result.filterScenarios.push('chung');
  }
  
  // 4. 형 (Punishment) 체크
  if (XING[dayBranch]?.includes(ganzhiBranch)) {
    result.factorKeys.push("branchXing");
    result.warnings.push("legal", "injury");
    // Mark for recommendation filtering
    result.filterScenarios.push('xing');
  }
  
  // 5. 해 (Harm) 체크 - 육해
  if (HAI_MAP[dayBranch] === ganzhiBranch) {
    result.factorKeys.push("branchHai");
    result.warnings.push("betrayal", "misunderstanding");
    // Mark for recommendation filtering
    result.filterScenarios.push('hai');
  }
  
  return result;
}
