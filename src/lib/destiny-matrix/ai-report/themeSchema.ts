export const REPORT_THEME_VALUES = ['love', 'career', 'wealth', 'health', 'family'] as const

export type ReportThemeValue = (typeof REPORT_THEME_VALUES)[number]

const THEME_SET = new Set<string>(REPORT_THEME_VALUES)

const THEME_ALIASES: Record<string, ReportThemeValue> = {
  love: 'love',
  romance: 'love',
  relationship: 'love',
  relationships: 'love',
  career: 'career',
  work: 'career',
  job: 'career',
  wealth: 'wealth',
  money: 'wealth',
  finance: 'wealth',
  health: 'health',
  wellness: 'health',
  family: 'family',
  home: 'family',
}

const THEMED_SECTION_KEYS: Record<ReportThemeValue, readonly string[]> = {
  love: [
    'deepAnalysis',
    'patterns',
    'timing',
    'compatibility',
    'spouseProfile',
    'marriageTiming',
    'recommendations',
    'actionPlan',
  ],
  career: [
    'deepAnalysis',
    'patterns',
    'timing',
    'strategy',
    'roleFit',
    'turningPoints',
    'recommendations',
    'actionPlan',
  ],
  wealth: [
    'deepAnalysis',
    'patterns',
    'timing',
    'strategy',
    'incomeStreams',
    'riskManagement',
    'recommendations',
    'actionPlan',
  ],
  health: [
    'deepAnalysis',
    'patterns',
    'timing',
    'prevention',
    'riskWindows',
    'recoveryPlan',
    'recommendations',
    'actionPlan',
  ],
  family: [
    'deepAnalysis',
    'patterns',
    'timing',
    'dynamics',
    'communication',
    'legacy',
    'recommendations',
    'actionPlan',
  ],
}

export function isReportTheme(value: unknown): value is ReportThemeValue {
  return typeof value === 'string' && THEME_SET.has(value)
}

export function normalizeReportTheme(value?: string | null): ReportThemeValue | undefined {
  if (!value) return undefined
  const key = value.trim().toLowerCase()
  if (!key) return undefined
  return THEME_ALIASES[key]
}

export function getThemedSectionKeys(theme: ReportThemeValue): readonly string[] {
  return THEMED_SECTION_KEYS[theme]
}
