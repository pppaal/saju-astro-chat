/**
 * Shinsal (神煞) Mapper Utility
 * Maps shinsal (gods and spirits) to factor keys, recommendations, and warnings
 */

export interface ShinsalMappingResult {
  factorKey: string;
  recommendations: string[];
  warnings: string[];
}

/**
 * Shinsal type classification
 */
export type ShinsalType = 'lucky' | 'unlucky' | 'special';

/**
 * Shinsal mapping configuration
 */
interface ShinsalConfig {
  factorKey: string;
  type: ShinsalType;
  recommendations?: string[];
  warnings?: string[];
}

/**
 * Shinsal name to configuration mapping
 */
const SHINSAL_MAP: Record<string, ShinsalConfig> = {
  // 길신 (Lucky Gods)
  '태극귀인': {
    factorKey: 'shinsal_taegukGwiin',
    type: 'lucky',
    recommendations: ['majorLuck', 'blessing'],
  },
  '천덕귀인': {
    factorKey: 'shinsal_cheondeokGwiin',
    type: 'lucky',
    recommendations: ['heavenlyHelp', 'protection'],
  },
  '천덕': {
    factorKey: 'shinsal_cheondeokGwiin',
    type: 'lucky',
    recommendations: ['heavenlyHelp', 'protection'],
  },
  '월덕귀인': {
    factorKey: 'shinsal_woldeokGwiin',
    type: 'lucky',
    recommendations: ['lunarBlessing', 'assistance'],
  },
  '월덕': {
    factorKey: 'shinsal_woldeokGwiin',
    type: 'lucky',
    recommendations: ['lunarBlessing', 'assistance'],
  },
  '화개': {
    factorKey: 'shinsal_hwagae',
    type: 'lucky',
    recommendations: ['creativity', 'spiritual'],
  },
  
  // 흉신 (Unlucky Gods)
  '공망': {
    factorKey: 'shinsal_gongmang',
    type: 'unlucky',
    warnings: ['emptiness', 'voidDay'],
  },
  '원진': {
    factorKey: 'shinsal_wonjin',
    type: 'unlucky',
    warnings: ['resentment', 'conflict'],
  },
  '양인': {
    factorKey: 'shinsal_yangin',
    type: 'unlucky',
    warnings: ['danger', 'impulsiveness'],
  },
  '괴강': {
    factorKey: 'shinsal_goegang',
    type: 'unlucky',
    warnings: ['extremes', 'intensity'],
  },
  '백호': {
    factorKey: 'shinsal_backho',
    type: 'unlucky',
    warnings: ['accident', 'surgery'],
  },
  '귀문관': {
    factorKey: 'shinsal_guimungwan',
    type: 'unlucky',
    warnings: ['mentalConfusion', 'anxiety'],
  },
  
  // 특수 신살 (Special Spirits)
  '역마': {
    factorKey: 'shinsal_yeokma',
    type: 'special',
    recommendations: ['travel', 'movement'],
  },
  '재살': {
    factorKey: 'shinsal_jaesal',
    type: 'special',
    warnings: ['dispute', 'legalIssue'],
  },
};

/**
 * Map a shinsal name to its factor key, recommendations, and warnings
 * 
 * @param shinsalName - The name of the shinsal (e.g., '태극귀인', '공망')
 * @returns Mapping result with factor key and associated recommendations/warnings
 */
export function mapShinsal(shinsalName: string): ShinsalMappingResult | null {
  const config = SHINSAL_MAP[shinsalName];
  
  if (!config) {
    return null;
  }
  
  return {
    factorKey: config.factorKey,
    recommendations: config.recommendations || [],
    warnings: config.warnings || [],
  };
}

/**
 * Process multiple shinsal results and aggregate their effects
 * 
 * @param activeShinsals - Array of active shinsal objects with name property
 * @returns Aggregated factor keys, recommendations, and warnings
 */
export function processShinsals(
  activeShinsals: Array<{ name: string }>
): {
  factorKeys: string[];
  recommendations: string[];
  warnings: string[];
} {
  const factorKeys: string[] = [];
  const recommendations: string[] = [];
  const warnings: string[] = [];
  
  for (const shinsal of activeShinsals) {
    const mapping = mapShinsal(shinsal.name);
    
    if (mapping) {
      factorKeys.push(mapping.factorKey);
      recommendations.push(...mapping.recommendations);
      warnings.push(...mapping.warnings);
    }
  }
  
  return { factorKeys, recommendations, warnings };
}

/**
 * Get the type (lucky/unlucky/special) of a shinsal
 * 
 * @param shinsalName - The name of the shinsal
 * @returns The shinsal type or null if not found
 */
export function getShinsalType(shinsalName: string): ShinsalType | null {
  const config = SHINSAL_MAP[shinsalName];
  return config?.type || null;
}
