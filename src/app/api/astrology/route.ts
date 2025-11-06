// src/app/api/astrology/route.ts
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import * as swisseph from 'swisseph'

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

export async function POST(request: Request) {
  try {
    initializeSwisseph()

    const body = await request.json()
    const { date, time, latitude, longitude } = body

    if (!date || !time || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: '필수 입력 필드가 누락되었습니다.' }, { status: 400 })
    }

    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    const inputDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
    inputDate.setHours(inputDate.getHours() - 9) // KST -> UTC

    const utcYear = inputDate.getUTCFullYear()
    const utcMonth = inputDate.getUTCMonth() + 1
    const utcDay = inputDate.getUTCDate()
    const utcHour = inputDate.getUTCHours() + inputDate.getUTCMinutes() / 60

    const jd = swisseph.swe_julday(utcYear, utcMonth, utcDay, utcHour, swisseph.SE_GREG_CAL)
    if (typeof jd !== 'number' || !isFinite(jd)) {
      throw new Error('율리우스력(JD) 계산에 실패했습니다. 날짜/시간 입력이 올바른지 확인하세요.')
    }

    const planetPromises = planetsToCalculate.map(
      p =>
        new Promise((resolve, reject) => {
          swisseph.swe_calc_ut(jd, p.id, swisseph.SEFLG_SPEED, res =>
            'error' in res ? reject(new Error(res.error)) : resolve(res)
          )
        })
    )

    const housePromise = new Promise((resolve, reject) => {
      const houseResult = swisseph.swe_houses(jd, latitude, longitude, 'P')
      // @ts-ignore
      if (houseResult && houseResult.error) return reject(new Error(`House calculation failed: ${houseResult.error}`))
      if (houseResult && houseResult.house && houseResult.ascendant !== undefined && houseResult.mc !== undefined) {
        return resolve(houseResult)
      }
      reject(new Error('하우스 정보를 계산할 수 없습니다. 서버 로그를 확인해주세요.'))
    })

    const [planetResults, houseResult] = (await Promise.all([Promise.all(planetPromises), housePromise])) as [any[], any]

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

    // Gemini 제거: 해석문 없이 천궁도 데이터만 반환
    return NextResponse.json({ chartData, interpretation: '' })
  } catch (error: any) {
    console.error('API 처리 중 최종 에러:', error)
    return NextResponse.json({ error: error.message || '알 수 없는 에러가 발생했습니다.' }, { status: 500 })
  }
}