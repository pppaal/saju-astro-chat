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

    // 행성 계산
    const planetPromises = planetsToCalculate.map(
      p =>
        new Promise((resolve, reject) => {
          swisseph.swe_calc_ut(jd, p.id, swisseph.SEFLG_SPEED, (res: any) =>
            res && res.error ? reject(new Error(res.error)) : resolve(res)
          )
        })
    )

    // 하우스 계산: Placidus 명시 + asc/mc 안전 추출
    const housePromise = new Promise((resolve, reject) => {
      try {
        const hsys = 'P' // Placidus
        const flags = swisseph.SEFLG_SPEED
        const hr: any = (swisseph as any).swe_houses_ex(jd, flags, latitude, longitude, hsys)

        // 일부 빌드에서 asc 키명 차이 대응
        const ascRaw = (hr.ascendant ?? hr.asc ?? hr.ASC) as number | undefined
        const mcRaw = (hr.mc ?? hr.MC) as number | undefined

        if (ascRaw == null || mcRaw == null || !Number.isFinite(ascRaw) || !Number.isFinite(mcRaw)) {
          throw new Error('ASC/MC 값을 가져오지 못했습니다.')
        }

        resolve({ ascendant: ascRaw, mc: mcRaw, houseCusps: hr.house })
      } catch (e: any) {
        reject(new Error(`House calculation failed: ${e?.message || e}`))
      }
    })

    const [planetResults, houseResult]: [any[], any] = await Promise.all([Promise.all(planetPromises), housePromise])

    const chartData = {
      planets: planetResults.map((p: any, i: number) => ({
        planet: planetsToCalculate[i].name,
        zodiacSign: zodiacSigns[Math.floor(p.longitude / 30)],
        degree: parseFloat((p.longitude % 30).toFixed(2)),
        longitude: parseFloat(p.longitude?.toFixed?.(5) ?? String(p.longitude)),
      })),
      ascendant: {
        zodiacSign: zodiacSigns[Math.floor(houseResult.ascendant / 30)],
        degree: parseFloat((houseResult.ascendant % 30).toFixed(2)),
        longitude: parseFloat(houseResult.ascendant.toFixed(5)),
      },
      midheaven: {
        zodiacSign: zodiacSigns[Math.floor(houseResult.mc / 30)],
        degree: parseFloat((houseResult.mc % 30).toFixed(2)),
        longitude: parseFloat(houseResult.mc.toFixed(5)),
      },
    }

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

    // 디버그 정보: 입력 에코백 + UTC/JD + ASC/MC 원시값 + 하우스 시스템/좌표
    const debug = {
      input: { date, time, timeZone, latitude, longitude },
      utc: u.format('YYYY-MM-DD HH:mm:ss[Z]'),
      jd,
      ascRaw: chartData.ascendant.longitude, // 0–360
      mcRaw: chartData.midheaven.longitude,  // 0–360
      hsys: 'P',
      lat: latitude,
      lon: longitude,
    }

    return NextResponse.json({ chartData, interpretation, debug }, { status: 200 })
  } catch (error: any) {
    console.error('API 처리 중 최종 에러:', error)
    return NextResponse.json({ error: error.message || '알 수 없는 에러가 발생했습니다.' }, { status: 500 })
  }
}