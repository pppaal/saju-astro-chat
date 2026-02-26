const base = 'http://localhost:3000/api/review/assessment'
const token = '<REVIEW_TOKEN>'

console.log('Review assessment API examples:')
console.log('')
console.log(`1) GET fixture D_A`)
console.log(`curl "${base}?fixture=D_A&locale=ko&token=${token}"`)
console.log('')
console.log(`2) GET fixture D_T`)
console.log(`curl "${base}?fixture=D_T&locale=ko&token=${token}"`)
console.log('')
console.log(`3) GET fixture E_P`)
console.log(`curl "${base}?fixture=E_P&locale=ko&token=${token}"`)
console.log('')
console.log('4) POST custom answers')
console.log(
  `curl -X POST "${base}?locale=ko&token=${token}" -H "Content-Type: application/json" -d "{\\"personalityAnswers\\":{\\"q1\\":\\"A\\"},\\"icpAnswers\\":{\\"ag_02\\":\\"5\\",\\"re_04\\":\\"3\\",\\"wa_03\\":\\"3\\",\\"ag_04\\":\\"2\\",\\"bo_02\\":\\"5\\",\\"re_01\\":\\"3\\",\\"wa_04\\":\\"2\\",\\"bo_03\\":\\"5\\"}}"`
)
