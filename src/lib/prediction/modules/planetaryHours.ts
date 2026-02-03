// src/lib/prediction/modules/planetaryHours.ts
// 행성시 (Planetary Hours) 계산 모듈

import type { FiveElement } from '../timingScore'
import type { PlanetaryHour } from './types'

// ============================================================
// 행성시 설정
// ============================================================

const DAY_PLANET_ORDER: PlanetaryHour['planet'][] = [
  'Sun',
  'Venus',
  'Mercury',
  'Moon',
  'Saturn',
  'Jupiter',
  'Mars',
]

const PLANET_ELEMENT: Record<PlanetaryHour['planet'], FiveElement> = {
  Sun: '화',
  Moon: '수',
  Mars: '화',
  Mercury: '수',
  Jupiter: '목',
  Venus: '금',
  Saturn: '토',
}

const PLANET_QUALITY: Record<
  PlanetaryHour['planet'],
  'excellent' | 'good' | 'neutral' | 'caution' | 'avoid'
> = {
  Sun: 'excellent',
  Jupiter: 'excellent',
  Venus: 'good',
  Moon: 'good',
  Mercury: 'neutral',
  Saturn: 'caution',
  Mars: 'caution',
}

// ============================================================
// 행성시 계산 함수
// ============================================================

/**
 * 특정 날짜의 행성시 계산
 * @param date 날짜
 * @param latitude 위도 (일출/일몰 계산용)
 * @param longitude 경도
 */
export function calculatePlanetaryHours(
  date: Date,
  latitude: number = 37.5665, // 서울 기본값
  longitude: number = 126.978
): PlanetaryHour[] {
  // 간단한 일출/일몰 계산 (실제로는 천문학적 계산 필요)
  // UTC 기준으로 연초부터 일수 계산 (서버 타임존 영향 제거)
  const yearStartUtc = Date.UTC(date.getFullYear(), 0, 0)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const dayOfYear = Math.floor((dateUtc - yearStartUtc) / (1000 * 60 * 60 * 24))

  // 서울 기준 근사 일출/일몰 시간
  const sunriseHour = 5 + Math.sin(((dayOfYear - 80) * Math.PI) / 182.5) * 1.5
  const sunsetHour = 18 + Math.sin(((dayOfYear - 80) * Math.PI) / 182.5) * 1.5

  const dayLength = sunsetHour - sunriseHour
  const nightLength = 24 - dayLength

  const dayHourLength = dayLength / 12
  const nightHourLength = nightLength / 12

  // 요일별 첫 행성시 행성
  const dayOfWeek = date.getDay() // 0=일, 1=월, ...
  const firstPlanetIndex = dayOfWeek // 일=Sun, 월=Moon, ...

  const hours: PlanetaryHour[] = []

  // 주간 12시간
  for (let i = 0; i < 12; i++) {
    const planetIndex = (firstPlanetIndex + i) % 7
    const planet = DAY_PLANET_ORDER[planetIndex]
    const startHour = sunriseHour + i * dayHourLength
    const endHour = sunriseHour + (i + 1) * dayHourLength

    const startTime = new Date(date)
    startTime.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0)

    const endTime = new Date(date)
    endTime.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0)

    hours.push({
      hour: Math.floor(startHour),
      startTime,
      endTime,
      planet,
      element: PLANET_ELEMENT[planet],
      isDay: true,
      quality: PLANET_QUALITY[planet],
      goodFor: getPlanetaryHourActivities(planet),
    })
  }

  // 야간 12시간
  for (let i = 0; i < 12; i++) {
    const planetIndex = (firstPlanetIndex + 12 + i) % 7
    const planet = DAY_PLANET_ORDER[planetIndex]
    const startHour = sunsetHour + i * nightHourLength
    const endHour = sunsetHour + (i + 1) * nightHourLength

    const adjustedStartHour = startHour >= 24 ? startHour - 24 : startHour
    const adjustedEndHour = endHour >= 24 ? endHour - 24 : endHour

    const startTime = new Date(date)
    if (startHour >= 24) {
      startTime.setDate(startTime.getDate() + 1)
    }
    startTime.setHours(
      Math.floor(adjustedStartHour),
      Math.round((adjustedStartHour % 1) * 60),
      0,
      0
    )

    const endTime = new Date(date)
    if (endHour >= 24) {
      endTime.setDate(endTime.getDate() + 1)
    }
    endTime.setHours(Math.floor(adjustedEndHour), Math.round((adjustedEndHour % 1) * 60), 0, 0)

    hours.push({
      hour: Math.floor(adjustedStartHour),
      startTime,
      endTime,
      planet,
      element: PLANET_ELEMENT[planet],
      isDay: false,
      quality: PLANET_QUALITY[planet],
      goodFor: getPlanetaryHourActivities(planet),
    })
  }

  return hours
}

function getPlanetaryHourActivities(planet: PlanetaryHour['planet']): string[] {
  const activities: Record<PlanetaryHour['planet'], string[]> = {
    Sun: ['리더십', '승진', '공식 업무', '권위적 결정', '명예', '건강'],
    Moon: ['가정', '육아', '부동산', '대중 접촉', '직관', '여행 시작'],
    Mars: ['운동', '경쟁', '외과수술', '분쟁 해결', '에너지 필요 활동'],
    Mercury: ['의사소통', '계약', '학습', '글쓰기', '여행', '거래'],
    Jupiter: ['법률', '교육', '출판', '확장', '투자', '종교', '행운'],
    Venus: ['연애', '예술', '미용', '사교', '협상', '금전 수령'],
    Saturn: ['부동산', '농업', '광업', '장기 계획', '규율', '제한 수용'],
  }
  return activities[planet]
}
