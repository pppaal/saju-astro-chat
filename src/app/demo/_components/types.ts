export type DemoProfile = {
  name: string
  birthDate: string
  birthTime: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  gender: 'male' | 'female'
}

export const DEFAULT_DEMO_PROFILE: DemoProfile = {
  name: 'Demo User',
  birthDate: '1995-02-09',
  birthTime: '06:40',
  city: 'Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  gender: 'male',
}
