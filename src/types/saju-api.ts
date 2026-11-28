// Jijanggan processing types
export interface JGItem {
  name?: string
  sibsin?: string
}

interface JijangganObject {
  chogi?: JGItem
  junggi?: JGItem
  jeonggi?: JGItem
}

export type JijangganAny =
  | string
  | Record<string, unknown>
  | JGItem[]
  | JijangganObject
  | null
  | undefined

// Premium check cache
export interface PremiumCacheEntry {
  value: boolean
  expires: number
}
