import { calculateSajuData } from '../src/lib/Saju/saju'
import { getShinsalHits, toSajuPillarsLike } from '../src/lib/Saju/shinsal'

const saju: any = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')

const sajuLike = toSajuPillarsLike({
  yearPillar: saju.yearPillar,
  monthPillar: saju.monthPillar,
  dayPillar: saju.dayPillar,
  timePillar: saju.timePillar,
})
console.log('sajuLike:', JSON.stringify(sajuLike, null, 2))

const hits = getShinsalHits(sajuLike, {
  includeLucky: true,
  includeUnlucky: true,
  includeTwelveAll: true,
  includeGeneralShinsal: true,
  includeLuckyDetails: true,
  ruleSet: 'your',
})
console.log('hits:', JSON.stringify(hits, null, 2))
console.log(`총 ${hits.length}건`)
