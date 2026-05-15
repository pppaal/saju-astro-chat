/**
 * 도시명 → 위경도·타임존 lookup.
 * 기존 API의 LOCATION_COORDS는 server-only 컨텍스트에 묶여있어
 * 클라이언트에서 import하면 빌드 깨짐. 동일 데이터의 클라이언트 안전 사본.
 *
 * TODO: 기존 LOCATION_COORDS를 별도 'pure data' 모듈로 분리하면 이 파일 삭제 가능.
 */
export interface LocationCoord {
  lat: number
  lng: number
  tz: string
}

export const LOCATION_COORDS: Record<string, LocationCoord> = {
  Seoul:         { lat: 37.5665, lng: 126.978,  tz: 'Asia/Seoul' },
  'Seoul, KR':   { lat: 37.5665, lng: 126.978,  tz: 'Asia/Seoul' },
  '서울':         { lat: 37.5665, lng: 126.978,  tz: 'Asia/Seoul' },
  Busan:         { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  'Busan, KR':   { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  '부산':         { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  Incheon:       { lat: 37.4563, lng: 126.7052, tz: 'Asia/Seoul' },
  Daegu:         { lat: 35.8714, lng: 128.6014, tz: 'Asia/Seoul' },
  Daejeon:       { lat: 36.3504, lng: 127.3845, tz: 'Asia/Seoul' },
  Tokyo:         { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  'Tokyo, JP':   { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  Osaka:         { lat: 34.6937, lng: 135.5023, tz: 'Asia/Tokyo' },
  Beijing:       { lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
  Shanghai:      { lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
  'Hong Kong':   { lat: 22.3193, lng: 114.1694, tz: 'Asia/Hong_Kong' },
  Singapore:     { lat: 1.3521,  lng: 103.8198, tz: 'Asia/Singapore' },
  'New York':    { lat: 40.7128, lng: -74.0060, tz: 'America/New_York' },
  'Los Angeles': { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  London:        { lat: 51.5074, lng: -0.1278,  tz: 'Europe/London' },
  Paris:         { lat: 48.8566, lng: 2.3522,   tz: 'Europe/Paris' },
}
