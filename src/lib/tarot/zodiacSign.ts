/**
 * 생년월일 → 별자리 정보.
 * - sign / element: EN 출력용 ("Capricorn", "earth")
 * - signKo / elementKo: KO 출력용 ("염소자리", "흙")
 *
 * 옛 버그: element 한 필드에 KO 만 있어서 EN 프롬프트에 "Mention Capricorn's 흙 element" 같이 박혔음.
 */

export interface ZodiacSign {
  sign: string
  signKo: string
  element: string
  elementKo: string
}

interface ZodiacRange extends ZodiacSign {
  start: [number, number]
  end: [number, number]
}

const ZODIAC_DATA: ZodiacRange[] = [
  { sign: 'Capricorn', signKo: '염소자리', element: 'earth', elementKo: '흙', start: [12, 22], end: [1, 19] },
  { sign: 'Aquarius', signKo: '물병자리', element: 'air', elementKo: '공기', start: [1, 20], end: [2, 18] },
  { sign: 'Pisces', signKo: '물고기자리', element: 'water', elementKo: '물', start: [2, 19], end: [3, 20] },
  { sign: 'Aries', signKo: '양자리', element: 'fire', elementKo: '불', start: [3, 21], end: [4, 19] },
  { sign: 'Taurus', signKo: '황소자리', element: 'earth', elementKo: '흙', start: [4, 20], end: [5, 20] },
  { sign: 'Gemini', signKo: '쌍둥이자리', element: 'air', elementKo: '공기', start: [5, 21], end: [6, 20] },
  { sign: 'Cancer', signKo: '게자리', element: 'water', elementKo: '물', start: [6, 21], end: [7, 22] },
  { sign: 'Leo', signKo: '사자자리', element: 'fire', elementKo: '불', start: [7, 23], end: [8, 22] },
  { sign: 'Virgo', signKo: '처녀자리', element: 'earth', elementKo: '흙', start: [8, 23], end: [9, 22] },
  { sign: 'Libra', signKo: '천칭자리', element: 'air', elementKo: '공기', start: [9, 23], end: [10, 22] },
  { sign: 'Scorpio', signKo: '전갈자리', element: 'water', elementKo: '물', start: [10, 23], end: [11, 21] },
  { sign: 'Sagittarius', signKo: '사수자리', element: 'fire', elementKo: '불', start: [11, 22], end: [12, 21] },
]

function parseBirthMonthDay(birthdate: string): { month: number; day: number } | null {
  // YYYY-MM-DD 우선 — UTC 로 강제해 타임존 shift 제거.
  const directDateMatch = (birthdate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (directDateMatch) {
    const year = Number(directDateMatch[1])
    const month = Number(directDateMatch[2])
    const day = Number(directDateMatch[3])
    const utcDate = new Date(Date.UTC(year, month - 1, day))
    if (
      utcDate.getUTCFullYear() === year &&
      utcDate.getUTCMonth() + 1 === month &&
      utcDate.getUTCDate() === day
    ) {
      return { month, day }
    }
    return null
  }
  // 기타 ISO-like 입력 — UTC 필드 사용 (결정론적).
  const parsed = new Date(birthdate)
  if (Number.isNaN(parsed.getTime())) return null
  return { month: parsed.getUTCMonth() + 1, day: parsed.getUTCDate() }
}

export function getZodiacSign(birthdate: string): ZodiacSign | null {
  const parts = parseBirthMonthDay(birthdate)
  if (!parts) return null
  const { month, day } = parts

  for (const z of ZODIAC_DATA) {
    const [startM, startD] = z.start
    const [endM, endD] = z.end
    const inWrappedRange =
      startM > endM && ((month === startM && day >= startD) || (month === endM && day <= endD))
    const inNormalRange =
      startM <= endM &&
      ((month === startM && day >= startD) ||
        (month === endM && day <= endD) ||
        (month > startM && month < endM))
    if (inWrappedRange || inNormalRange) {
      return { sign: z.sign, signKo: z.signKo, element: z.element, elementKo: z.elementKo }
    }
  }
  return null
}
