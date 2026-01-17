/**
 * 데이터 구조 디버그 스크립트
 */
import { computeDestinyMapRefactored } from '../src/lib/destiny-map/astrology/engine-core';

async function main() {
  const input = {
    name: 'Test',
    birthDate: '1995-02-09',
    birthTime: '06:40',
    latitude: 37.5665,
    longitude: 126.9780,
    gender: 'male' as const,
    tz: 'Asia/Seoul',
    userTimezone: 'Asia/Seoul',
  };

  console.log('Computing...');
  const result = await computeDestinyMapRefactored(input);

  console.log('\n=== extraPoints 구조 ===');
  console.log('extraPoints:', JSON.stringify(result.extraPoints, null, 2));

  console.log('\n=== asteroids 구조 ===');
  console.log('asteroids:', JSON.stringify(result.asteroids, null, 2));

  console.log('\n=== chiron 위치 확인 ===');
  console.log('result.extraPoints?.chiron:', result.extraPoints?.chiron);

  // extraPoints 내부에 chiron이 있는지 확인
  if (result.extraPoints) {
    console.log('extraPoints keys:', Object.keys(result.extraPoints));
  }

  // asteroids 내부 구조 확인
  if (result.asteroids) {
    console.log('\nasteroids keys:', Object.keys(result.asteroids));
    console.log('asteroids.ceres:', (result.asteroids as any).ceres);
    console.log('asteroids.juno:', (result.asteroids as any).juno);
  }
}

main().catch(console.error);
