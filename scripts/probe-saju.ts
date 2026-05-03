import { calculateSajuData } from '../src/lib/Saju/saju'

const saju = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
console.log(JSON.stringify(saju.pillars, null, 2))
console.log('--- gyeokguk:', saju.gyeokguk)
console.log('--- shinsalList:', saju.shinsalList)
console.log('--- sibsin:', JSON.stringify(saju.sibsin, null, 2))
console.log('--- twelveStages:', JSON.stringify(saju.twelveStages, null, 2))
console.log('--- daeWoon current:', JSON.stringify(saju.daeWoon?.current, null, 2))
console.log('--- unse current:', JSON.stringify(saju.unse?.current, null, 2))
console.log('--- relations:', JSON.stringify(saju.relations, null, 2))
