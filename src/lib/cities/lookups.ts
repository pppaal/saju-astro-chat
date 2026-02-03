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

/**
 * Korean translations for major cities
 */
export const CITY_NAME_KR: Record<string, string> = cityNamesKr

/**
 * Korean translations for countries (ISO 3166-1 alpha-2 codes)
 */
export const COUNTRY_NAME_KR: Record<string, string> = countryNamesKr

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
