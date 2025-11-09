import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import * as swisseph from 'swisseph'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const zodiacSigns = [
  '양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'
]

const planetsToCalculate = [
  { name: '태양', id: swisseph.SE_SUN }, { name: '달', id: swisseph.SE_MOON }, { name: '수성', id: swisseph.SE_MERCURY },
  { name: '금성', id: swisseph.SE_VENUS }, { name: '화성', id: swisseph.SE_MARS }, { name: '목성', id: swisseph.SE_JUPITER },
  { name: '토성', id: swisseph.SE_SATURN }, { name: '천왕성', id: swisseph.SE_URANUS }, { name: '해왕성', id: swisseph.SE_NEPTUNE },
  { name: '명왕성', id: swisseph.SE_PLUTO },
]

function initializeSwisseph() {
  const ephePath = path.join(process.cwd(), 'public', 'ephe')
  if (!fs.existsSync(ephePath) || !fs.readdirSync(ephePath).some(file => file.endsWith('.se1'))) {
    throw new Error('서버 설정 오류: public/ephe 폴더에 천체력(.se1) 파일이 없습니다.')
  }
  swisseph.swe_set_ephe_path(ephePath)
}

// AM/PM 포함 HH:mm 파서
function parseHM(input: string) {
  const s = String(input).trim().toUpperCase()
  const ampm = (s.match(/\s?(AM|PM)$/) || [])[1]
  const core = s.replace(/\s?(AM|PM)$/, '')
  const [hhRaw, mmRaw = '0'] = core.split(':')
  let h = Number(hhRaw), m = Number(mmRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error('시간 형식이 올바르지 않습니다.')
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error('시간 범위가 올바르지 않습니다.')
  return { h, m }
}

export async function POST(request: Request) {
  try {
    initializeSwisseph()

    const body = await request.json()
    const { date, time, latitude, longitude, timeZone } = body

    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json({ error: '필수 입력(date, time, latitude, longitude, timeZone)이 누락되었습니다.' }, { status: 400 })
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: '위도/경도 값이 올바르지 않습니다.' }, { status: 400 })
    }

    const [year, month, day] = String(date).split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: '날짜 형식은 YYYY-MM-DD 이어야 합니다.' }, { status: 400 })
    }

    const { h, m } = parseHM(String(time))

    // 입력된 TZ 기준 로컬 → UTC (KST -9h 보정 제거)
    const local = dayjs.tz(
      `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
      'YYYY-MM-DD HH:mm',
      String(timeZone)
    )
    if (!local.isValid()) {
      return NextResponse.json({ error: '날짜/시간/시간대 조합이 올바르지 않습니다.' }, { status: 400 })
    }
    const u = local.utc()

    const utcYear = u.year()
    const utcMonth = u.month() + 1
    const utcDay = u.date()
    const utcHour = u.hour() + u.minute() / 60 + u.second() / 3600

    const jd = swisseph.swe_julday(utcYear, utcMonth, utcDay, utcHour, swisseph.SE_GREG_CAL)
    if (!Number.isFinite(jd)) throw new Error('율리우스일(JD) 계산 실패')

    // 행성 계산: 콜백 → Promise 래핑 유지
    const planetPromises = planetsToCalculate.map(
      p =>
        new Promise((resolve, reject) => {
          swisseph.swe_calc_ut(jd, p.id, swisseph.SEFLG_SPEED, (res: any) =>
            res && res.error ? reject(new Error(res.error)) : resolve(res)
          )
        })
    )

    // 하우스 계산: 3인자 호출(0.5.17 호환)
    const housePromise = new Promise((resolve, reject) => {
      const houseResult: any = (swisseph as any).swe_houses(jd, latitude, longitude)
      if (houseResult && houseResult.error) return reject(new Error(`House calculation failed: ${houseResult.error}`))
      if (houseResult && houseResult.house && houseResult.ascendant !== undefined && houseResult.mc !== undefined) {
        return resolve(houseResult)
      }
      reject(new Error('하우스 정보를 계산할 수 없습니다. 서버 로그를 확인해주세요.'))
    })

    const [planetResults, houseResult]: [any[], any] = await Promise.all([Promise.all(planetPromises), housePromise])

    const chartData = {
      planets: planetResults.map((p: any, i: number) => ({
        planet: planetsToCalculate[i].name,
        zodiacSign: zodiacSigns[Math.floor(p.longitude / 30)],
        degree: parseFloat((p.longitude % 30).toFixed(2)),
      })),
      ascendant: {
        zodiacSign: zodiacSigns[Math.floor(houseResult.ascendant / 30)],
        degree: parseFloat((houseResult.ascendant % 30).toFixed(2)),
      },
      midheaven: {
        zodiacSign: zodiacSigns[Math.floor(houseResult.mc / 30)],
        degree: parseFloat((houseResult.mc % 30).toFixed(2)),
      },
    }

    // 여기만 수정: interpretation을 빈 문자열로 보내지 않음
    const planetLines = chartData.planets
      .map(p => `${p.planet}: ${p.zodiacSign} ${p.degree}°`)
      .join('\n')

    const basics =
      `Ascendant: ${chartData.ascendant.zodiacSign} ${chartData.ascendant.degree}°\n` +
      `MC: ${chartData.midheaven.zodiacSign} ${chartData.midheaven.degree}°`

    const interpretation =
      `기본 천궁도 요약\n` +
      `${basics}\n\n` +
      `행성 위치\n${planetLines}\n\n` +
      `주의: 이 해석은 자동 생성된 요약입니다.`

    return NextResponse.json({ chartData, interpretation }, { status: 200 })
  } catch (error: any) {
    console.error('API 처리 중 최종 에러:', error)
    return NextResponse.json({ error: error.message || '알 수 없는 에러가 발생했습니다.' }, { status: 500 })
  }
}