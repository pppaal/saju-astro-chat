import { calculateSajuData } from '../src/lib/Saju/saju'
const saju: any = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
console.log('top-level yearPillar:', saju.yearPillar)
console.log('top-level timePillar:', saju.timePillar)
console.log('pillars.time:', saju.pillars?.time)
