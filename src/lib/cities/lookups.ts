/**
 * City and Country Name Lookups
 *
 * This file has been refactored for better maintainability.
 * Data is now stored in JSON files.
 *
 * Structure:
 * - src/lib/cities/data/city-names-kr.json (1057 cities)
 * - src/lib/cities/data/country-names-kr.json (158 countries)
 */

import cityNamesKr from './data/city-names-kr.json'
import countryNamesKr from './data/country-names-kr.json'
import regionNamesKr from './data/region-names-kr.json'

// JSON 키에 literal single quote 가 wrap 되어 들어오는 export 사고를 또
// 만나도 lookup 이 조용히 실패하지 않도록 import 시점에 strip. 같은 키가
// quoted/unquoted 둘 다 있을 때는 unquoted 우선(데이터에 동일 값으로
// 들어 있는 케이스만 확인됨).
function normalizeCityKeys(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const nk = k.startsWith("'") && k.endsWith("'") ? k.slice(1, -1) : k
    if (!(nk in out)) {
      out[nk] = v
    }
  }
  return out
}

/**
 * Korean translations for major cities
 */
export const CITY_NAME_KR: Record<string, string> = normalizeCityKeys(cityNamesKr)

/**
 * Korean translations for countries (ISO 3166-1 alpha-2 codes)
 */
export const COUNTRY_NAME_KR: Record<string, string> = countryNamesKr

/**
 * Korean translations for admin1 regions (states / provinces / 도).
 * Keys are dr5hn state.name (English). 5,060 entries covering 95%
 * of the 5,308 admin1 regions in the source dataset.
 */
export const REGION_NAME_KR: Record<string, string> = regionNamesKr

/**
 * Full country names for better display
 */
const countryFullNameFallbacks: Record<string, string> = {
  KR: 'South Korea',
  US: 'United States',
  JP: 'Japan',
  CN: 'China',
  GB: 'United Kingdom',
  FR: 'France',
}

const countryDisplayNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

export const COUNTRY_FULL_NAME: Record<string, string> = Object.fromEntries(
  Object.keys(COUNTRY_NAME_KR).map((code) => [
    code,
    countryFullNameFallbacks[code] ?? countryDisplayNames?.of(code) ?? code,
  ])
)
