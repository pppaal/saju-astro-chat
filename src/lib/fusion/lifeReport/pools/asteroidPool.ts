// src/lib/fusion/lifeReport/pools/asteroidPool.ts
//
// 4 소행성 (Ceres / Pallas / Juno / Vesta) × 12궁 cross pool.
//
// Source: src/lib/destiny-matrix/data/layer9-asteroid-house.ts
// ASTEROID_HOUSE_MATRIX — 4 asteroids × 12 houses × { keyword, advice }
// = 48 entries. Already calculated for every natal chart but the
// matrix sat unused outside destiny-matrix/engine until now.
//
// Each asteroid has a natural domain:
// - Ceres → nurturing / motherhood / family
// - Pallas → intelligence / strategy / wisdom
// - Juno → partnership / loyalty / love
// - Vesta → devotion / spirituality

import { ASTEROID_HOUSE_MATRIX } from '@/lib/destiny-matrix/data/layer9-asteroid-house'

type AsteroidName = 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'
type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

const ASTEROID_LABEL: Record<AsteroidName, { ko: string; en: string; domain: string }> = {
  Ceres: { ko: '세레스', en: 'Ceres', domain: 'nurturing' },
  Pallas: { ko: '팔라스', en: 'Pallas', domain: 'wisdom' },
  Juno: { ko: '주노', en: 'Juno', domain: 'partnership' },
  Vesta: { ko: '베스타', en: 'Vesta', domain: 'devotion' },
}

/**
 * One-line bilingual narrative for an (asteroid, house) pair. Returns
 * empty string when either is undefined.
 */
export function asteroidHouseLine(
  asteroid: AsteroidName,
  house: number | undefined,
  lang: 'ko' | 'en'
): string {
  if (!house || house < 1 || house > 12) return ''
  const houseN = house as HouseNumber
  const entry = ASTEROID_HOUSE_MATRIX[asteroid]?.[houseN]
  if (!entry) return ''
  const label = ASTEROID_LABEL[asteroid]
  const keyword = lang === 'ko' ? entry.keyword : entry.keywordEn
  if (lang === 'ko') {
    return `${label.ko} (${asteroid}) × ${houseN}궁 — ${keyword}. ${
      'advice' in entry && typeof entry.advice === 'string' ? entry.advice : ''
    }`.trim()
  }
  return `${label.en} × house ${houseN} — ${keyword}.`
}

export type { AsteroidName }
