// src/lib/cities/types.ts
// City-related type definitions

export interface CityFormatOptions {
  locale?: 'ko' | 'en'
  style?: 'short' | 'full'
}

export interface CityResult {
  name: string
  country: string
  lat: number
  lon: number
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}
