import { calculateSajuData } from '@/lib/Saju/saju'
import { getSolarTermKST } from '@/lib/Saju/constants'
import { toDate } from 'date-fns-tz'

const r = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')

console.log('=== 8자 ===')
console.log('년주:', r.pillars.year.heavenlyStem.name + r.pillars.year.earthlyBranch.name)
console.log('월주:', r.pillars.month.heavenlyStem.name + r.pillars.month.earthlyBranch.name)
console.log('일주:', r.pillars.day.heavenlyStem.name + r.pillars.day.earthlyBranch.name)
console.log('시주:', r.pillars.time.heavenlyStem.name + r.pillars.time.earthlyBranch.name)
console.log()
console.log('=== 대운 ===')
console.log('대운수:', r.daeWoon.startAge, '/ 순행:', r.daeWoon.isForward)
console.log()
console.log('대운 시퀀스:')
for (const c of r.daeWoon.list.slice(0, 8)) {
  console.log(`  ${String(c.age).padStart(2)}-${c.age + 9}세: ${c.heavenlyStem}${c.earthlyBranch}  · 천간십성=${c.sibsin?.cheon}`)
}
const queryDate = new Date('2026-04-28T12:00:00+09:00')
const birthDateForAge = new Date('1995-02-09T06:40:00+09:00')
const ageYears = (queryDate.getTime() - birthDateForAge.getTime()) / (365.25 * 24 * 3600 * 1000)
let current = null
for (let i = r.daeWoon.list.length - 1; i >= 0; i--) {
  if (ageYears >= r.daeWoon.list[i].age) { current = r.daeWoon.list[i]; break }
}
console.log()
console.log(`2026-04-28 (${ageYears.toFixed(1)}세) 현재 대운: ${current?.heavenlyStem}${current?.earthlyBranch} (${current?.age}-${(current?.age ?? 0) + 9}세)`)

// 직접 계산 검증
const birthLocalIso = '1995-02-09T06:40:00'
const birthUTC = toDate(birthLocalIso, { timeZone: 'Asia/Seoul' })
const ipchun = getSolarTermKST(1995, 2)
const gyeongchip = getSolarTermKST(1995, 3)

console.log()
console.log('=== 시간 비교 ===')
console.log('출생 (KST):', birthLocalIso, '→ UTC:', birthUTC?.toISOString())
console.log('입춘 1995:', ipchun?.toISOString(), '(KST:', new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(ipchun), ')')
console.log('경칩 1995:', gyeongchip?.toISOString(), '(KST:', new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(gyeongchip), ')')

if (birthUTC && ipchun && gyeongchip) {
  const diffFromIpchunMs = birthUTC.getTime() - ipchun.getTime()
  const diffFromIpchunDays = diffFromIpchunMs / 86400000
  const diffToGyeongchipMs = gyeongchip.getTime() - birthUTC.getTime()
  const diffToGyeongchipDays = diffToGyeongchipMs / 86400000
  console.log()
  console.log('=== 대운수 검증 ===')
  console.log('출생 - 입춘:', diffFromIpchunDays.toFixed(3), '일')
  console.log('역행 시 대운수 = 출생 - 입춘 일수 / 3 =', (diffFromIpchunDays / 3).toFixed(3), '년')
  console.log('  Math.round →', Math.round(diffFromIpchunDays / 3))
  console.log()
  console.log('경칩 - 출생:', diffToGyeongchipDays.toFixed(3), '일')
  console.log('순행 시 대운수 = 경칩 - 출생 일수 / 3 =', (diffToGyeongchipDays / 3).toFixed(3), '년')
  console.log('  Math.round →', Math.round(diffToGyeongchipDays / 3))
}
