// test-ephe.js 파일 내용
const swisseph = require('swisseph');
const path = require('path');

console.log('테스트를 시작합니다...');
console.log('현재 위치:', __dirname);

const ephePath = path.join(__dirname, 'public', 'ephe');
console.log('천체력 파일 경로:', ephePath);

swisseph.swe_set_ephe_path(ephePath);

console.log('경로 설정 완료. 행성 위치 계산을 시도합니다...');

const julianDay = 2451545.0; // 2000년 1월 1일
const sunSign = swisseph.SE_SUN;

swisseph.swe_calc_ut(julianDay, sunSign, swisseph.SEFLG_SPEED, (err, result) => {
  if (err) {
    console.error('!!!!!!!! 실패 !!!!!!!!!!');
    console.error('오류가 발생했습니다. 아래 오류 내용을 확인해주세요:');
    console.error(err);
  } else {
    console.log('***************** 성공 *****************');
    console.log('천체력 파일을 성공적으로 읽고 계산을 완료했습니다.');
    console.log('계산 결과:', result);
    console.log('****************************************');
  }
});