import { EnhancedHexagramData, EnhancedHexagramDataKo } from '../../types'

import { enhancedHexagramData1to8, enhancedHexagramDataKo1to8 } from './hexagrams-01-08'
import { enhancedHexagramData9to16, enhancedHexagramDataKo9to16 } from './hexagrams-09-16'
import { enhancedHexagramData17to24, enhancedHexagramDataKo17to24 } from './hexagrams-17-24'
import { enhancedHexagramData25to32, enhancedHexagramDataKo25to32 } from './hexagrams-25-32'
import { enhancedHexagramData33to40, enhancedHexagramDataKo33to40 } from './hexagrams-33-40'
import { enhancedHexagramData41to48, enhancedHexagramDataKo41to48 } from './hexagrams-41-48'
import { enhancedHexagramData49to56, enhancedHexagramDataKo49to56 } from './hexagrams-49-56'
import { enhancedHexagramData57to64, enhancedHexagramDataKo57to64 } from './hexagrams-57-64'

// Combine all hexagram data
export const enhancedHexagramData: Record<number, EnhancedHexagramData> = {
  ...enhancedHexagramData1to8,
  ...enhancedHexagramData9to16,
  ...enhancedHexagramData17to24,
  ...enhancedHexagramData25to32,
  ...enhancedHexagramData33to40,
  ...enhancedHexagramData41to48,
  ...enhancedHexagramData49to56,
  ...enhancedHexagramData57to64,
}

export const enhancedHexagramDataKo: Record<number, EnhancedHexagramDataKo> = {
  ...enhancedHexagramDataKo1to8,
  ...enhancedHexagramDataKo9to16,
  ...enhancedHexagramDataKo17to24,
  ...enhancedHexagramDataKo25to32,
  ...enhancedHexagramDataKo33to40,
  ...enhancedHexagramDataKo41to48,
  ...enhancedHexagramDataKo49to56,
  ...enhancedHexagramDataKo57to64,
}
