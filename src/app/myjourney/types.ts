export type Profile = {
  birthDate?: string | null
  birthTime?: string | null
  birthCity?: string | null
  tzId?: string | null
  gender?: string | null
  profilePhoto?: string | null
}

export type FortuneAlert = {
  type: 'warning' | 'positive' | 'info'
  msg: string
  icon?: string
}

export type Fortune = {
  overall: number
  love: number
  career: number
  wealth: number
  health: number
  luckyColor: string
  luckyNumber: number
  alerts?: FortuneAlert[]
  source?: string
}

export type ServiceRecord = {
  id: string
  date: string
  service: string
  theme?: string
  summary?: string
  type: string
}

export type DailyHistory = {
  date: string
  records: ServiceRecord[]
}

export type Credits = {
  remaining: number
  total: number
  plan: string
}
