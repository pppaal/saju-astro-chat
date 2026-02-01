// src/lib/cities/formatter.ts
// Lookup tables extracted to ./lookups.ts for tree-shaking and code splitting

import { CITY_NAME_KR, COUNTRY_NAME_KR, COUNTRY_FULL_NAME } from './lookups';

export { CITY_NAME_KR, COUNTRY_NAME_KR, COUNTRY_FULL_NAME };

export interface CityFormatOptions {
  locale?: 'ko' | 'en';
  style?: 'short' | 'full';
}

/**
 * Capitalize each word in a string
 */
function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format city name for display
 */
export function formatCityName(
  cityName: string,
  countryCode?: string,
  options: CityFormatOptions = {}
): string {
  const { locale = 'en', style = 'short' } = options;

  let city = cityName;
  let country = countryCode;

  if (!country && cityName.includes(',')) {
    const parts = cityName.split(',').map(p => p.trim());
    city = parts[0];
    country = parts[1]?.toUpperCase();
  }

  city = capitalizeWords(city);

  if (locale === 'ko') {
    const cityKr = CITY_NAME_KR[city] || city;
    const countryKr = country ? COUNTRY_NAME_KR[country.toUpperCase()] || country : '';
    return countryKr ? `${cityKr}, ${countryKr}` : cityKr;
  }

  const countryDisplay = country
    ? (style === 'full' ? COUNTRY_FULL_NAME[country.toUpperCase()] || country : country)
    : '';

  return countryDisplay ? `${city}, ${countryDisplay}` : city;
}

/**
 * Format city for dropdown display
 */
export function formatCityForDropdown(
  cityName: string,
  countryCode: string,
  locale: 'ko' | 'en' = 'en'
): string {
  const city = capitalizeWords(cityName);
  const country = countryCode.toUpperCase();

  if (locale === 'ko') {
    const cityKr = CITY_NAME_KR[city];
    const countryKr = COUNTRY_NAME_KR[country];

    if (cityKr && countryKr) {
      return `${cityKr}, ${countryKr}`;
    } else if (cityKr) {
      return `${cityKr}, ${country}`;
    } else if (countryKr) {
      return `${city}, ${countryKr}`;
    }
  }

  const countryDisplay = COUNTRY_FULL_NAME[country] || country;
  return `${city}, ${countryDisplay}`;
}

/**
 * Get city name in Korean (for search)
 */
export function getCityNameInKorean(cityName: string): string | null {
  const city = capitalizeWords(cityName);
  return CITY_NAME_KR[city] || null;
}

/**
 * Get country name in Korean (for search)
 */
export function getCountryNameInKorean(countryCode: string): string | null {
  const code = countryCode.toUpperCase();
  return COUNTRY_NAME_KR[code] || null;
}

/**
 * Reverse lookup: Get English city name from Korean name
 */
export function getCityNameFromKorean(koreanName: string): string | null {
  for (const [eng, kor] of Object.entries(CITY_NAME_KR)) {
    if (kor === koreanName) {
      return eng;
    }
  }
  return null;
}
