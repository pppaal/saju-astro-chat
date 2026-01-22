/**
 * Recommendation Filter Utility
 * Centralized logic for removing conflicting recommendations based on astrological/Saju factors
 */

/**
 * Filter out specific recommendations from a list based on conflict scenarios
 * This function modifies the array in place for consistency with original code
 * 
 * @param recommendations - Array of recommendation keys to filter
 * @param conflictScenarios - Map of scenario names to recommendations that should be removed
 */
export function filterOutRecommendations(
  recommendations: string[],
  conflictScenarios: Record<string, string[]>
): void {
  const allRecsToRemove = new Set<string>();
  
  // Collect all recommendations to remove
  for (const recs of Object.values(conflictScenarios)) {
    for (const rec of recs) {
      allRecsToRemove.add(rec);
    }
  }
  
  // Remove in reverse order to avoid index shifting issues
  for (let i = recommendations.length - 1; i >= 0; i--) {
    if (allRecsToRemove.has(recommendations[i])) {
      recommendations.splice(i, 1);
    }
  }
}

/**
 * Pre-defined conflict scenarios for common astrological factors
 */
export const CONFLICT_SCENARIOS = {
  /** 관살 (Officer-affliction): Avoid authority/promotion during conflict periods */
  gwansal: ['authority', 'promotion', 'interview'],
  
  /** 충 (Clash): Avoid travel/change during clash periods */
  chung: ['travel', 'change'],
  
  /** 형 (Punishment): Avoid contracts/big decisions during punishment periods */
  xing: ['contract', 'bigDecision', 'partnership'],
  
  /** 해 (Harm): Avoid networking/socializing during harm periods */
  hai: ['networking', 'socializing'],
  
  /** Mercury Retrograde: Avoid communication/documents/contracts */
  mercuryRetrograde: ['contract', 'documents', 'interview'],
  
  /** Venus Retrograde: Avoid love/finance/shopping */
  venusRetrograde: ['dating', 'love', 'finance', 'investment', 'shopping'],
} as const;

/**
 * Helper function to filter recommendations for a single conflict scenario
 * 
 * @param recommendations - Array of recommendation keys to filter
 * @param scenario - One of the pre-defined conflict scenarios
 */
export function filterByScenario(
  recommendations: string[],
  scenario: keyof typeof CONFLICT_SCENARIOS
): void {
  filterOutRecommendations(recommendations, {
    [scenario]: CONFLICT_SCENARIOS[scenario],
  });
}
