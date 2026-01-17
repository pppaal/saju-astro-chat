/**
 * Summary Builder
 * 요약 텍스트 생성 모듈
 *
 * Builds summary text for destiny map results combining
 * astrology and saju information.
 */

import type { SummaryInput, AstrologyChartFacts } from './types';

/**
 * Build summary text for destiny map result
 * 운명 지도 결과 요약 텍스트 생성
 *
 * Includes:
 * - Name (if provided)
 * - Sun sign
 * - Moon sign
 * - Ascendant sign
 * - MC sign
 * - Dominant element
 * - Day Master (일주)
 *
 * @param input - Summary input data
 * @returns Formatted summary string
 */
export function buildSummary(input: SummaryInput): string {
  const { name, planets, ascendant, mc, astrologyFacts, dayMaster } = input;

  // Get sun and moon signs
  const sun = planets.find((p) => p.name === 'Sun')?.sign ?? '-';
  const moon = planets.find((p) => p.name === 'Moon')?.sign ?? '-';

  // Get dominant element
  const element = astrologyFacts.elementRatios
    ? Object.entries(astrologyFacts.elementRatios)
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0]
    : undefined;

  // Format day master text
  const dayMasterText = dayMaster?.name
    ? `${dayMaster.name} (${dayMaster.element ?? ''})`
    : dayMaster?.element
    ? `(${dayMaster.element})`
    : 'Unknown';

  // Build summary parts
  const parts = [
    name ? `Name: ${name}` : '',
    `Sun: ${sun}`,
    `Moon: ${moon}`,
    `Asc: ${ascendant?.sign ?? '-'}`,
    `MC: ${mc?.sign ?? '-'}`,
    element ? `Dominant Element: ${element}` : '',
    `Day Master: ${dayMasterText}`,
  ];

  return parts.filter(Boolean).join(' | ');
}

/**
 * Build error summary for failed calculations
 * @returns Error summary string
 */
export function buildErrorSummary(): string {
  return 'Calculation error occurred. Returning data-only result.';
}
