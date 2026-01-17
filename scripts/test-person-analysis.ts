/**
 * Test script for Saju + Astrology analysis
 * 1995.02.09 06:40 서울 출신 남성
 */

import { computeDestinyMapRefactored } from '../src/lib/destiny-map/astrology/engine-core';

async function main() {
  // Enable debug logs
  process.env.ENABLE_DESTINY_LOGS = 'true';

  // 서울 좌표
  const SEOUL_LAT = 37.5665;
  const SEOUL_LON = 126.9780;

  const input = {
    name: 'Test User',
    birthDate: '1995-02-09',
    birthTime: '06:40',
    latitude: SEOUL_LAT,
    longitude: SEOUL_LON,
    gender: 'male' as const,
    tz: 'Asia/Seoul',
    userTimezone: 'Asia/Seoul',
  };

  console.log('='.repeat(80));
  console.log('🔮 사주 + 점성학 통합 분석');
  console.log('='.repeat(80));
  console.log('\n📋 입력 정보:');
  console.log(`  - 생년월일: ${input.birthDate}`);
  console.log(`  - 출생시간: ${input.birthTime}`);
  console.log(`  - 출생지: 서울 (${SEOUL_LAT}, ${SEOUL_LON})`);
  console.log(`  - 성별: ${input.gender}`);
  console.log('\n');

  try {
    console.log('⏳ 분석 중...\n');
    const result = await computeDestinyMapRefactored(input);

    // ================== 사주 정보 ==================
    console.log('='.repeat(80));
    console.log('📿 사주 (四柱) 분석 결과');
    console.log('='.repeat(80));

    if (result.saju?.pillars) {
      const { pillars, dayMaster } = result.saju;

      console.log('\n🏛️ 사주팔자 (四柱八字):');
      console.log('┌─────────┬─────────┬─────────┬─────────┐');
      console.log('│  년주   │  월주   │  일주   │  시주   │');
      console.log('├─────────┼─────────┼─────────┼─────────┤');
      console.log(`│ ${(pillars.year?.heavenlyStem?.name || '?').padStart(3)}     │ ${(pillars.month?.heavenlyStem?.name || '?').padStart(3)}     │ ${(pillars.day?.heavenlyStem?.name || '?').padStart(3)}     │ ${(pillars.time?.heavenlyStem?.name || '?').padStart(3)}     │`);
      console.log(`│ ${(pillars.year?.earthlyBranch?.name || '?').padStart(3)}     │ ${(pillars.month?.earthlyBranch?.name || '?').padStart(3)}     │ ${(pillars.day?.earthlyBranch?.name || '?').padStart(3)}     │ ${(pillars.time?.earthlyBranch?.name || '?').padStart(3)}     │`);
      console.log('└─────────┴─────────┴─────────┴─────────┘');

      console.log('\n👤 일주 (日主):');
      console.log(`  - 천간: ${dayMaster?.name || '알 수 없음'}`);
      console.log(`  - 오행: ${dayMaster?.element || '알 수 없음'}`);
      console.log(`  - 음양: ${dayMaster?.yinYang || '알 수 없음'}`);
    }

    // 운세 주기
    if (result.saju?.unse) {
      const { daeun, annual, monthly } = result.saju.unse;

      console.log('\n📅 대운 (大運):');
      if (Array.isArray(daeun) && daeun.length > 0) {
        daeun.slice(0, 5).forEach((d: any, i: number) => {
          console.log(`  ${i + 1}. ${d.startAge || '?'}세 ~ ${d.endAge || '?'}세: ${d.stem || '?'}${d.branch || '?'} (${d.element || ''})`);
        });
        if (daeun.length > 5) console.log(`  ... 외 ${daeun.length - 5}개`);
      } else {
        console.log('  대운 정보 없음');
      }

      console.log('\n📅 세운 (歲運) - 향후 5년:');
      if (Array.isArray(annual) && annual.length > 0) {
        annual.slice(0, 5).forEach((a: any) => {
          console.log(`  - ${a.year || '?'}년: ${a.stem || '?'}${a.branch || '?'} (${a.element || ''})`);
        });
      } else {
        console.log('  세운 정보 없음');
      }
    }

    // 고급 분석
    if (result.saju?.advancedAnalysis) {
      const adv = result.saju.advancedAnalysis;

      console.log('\n🔬 고급 사주 분석:');

      if (adv.extended) {
        console.log(`\n  📊 신강/신약: ${adv.extended.strength?.level || '?'} (점수: ${adv.extended.strength?.score || '?'})`);
        console.log(`  📊 격국: ${adv.extended.geokguk?.type || '?'} - ${adv.extended.geokguk?.name || ''}`);
      }

      if (adv.geokguk) {
        console.log(`\n  🎯 격국 상세: ${JSON.stringify(adv.geokguk).slice(0, 100)}...`);
      }

      if (adv.yongsin) {
        console.log(`\n  ⚡ 용신: ${JSON.stringify(adv.yongsin).slice(0, 100)}...`);
      }

      if (adv.tonggeun) {
        console.log(`\n  🌳 통근력: ${JSON.stringify(adv.tonggeun).slice(0, 100)}...`);
      }

      if (adv.hyeongchung) {
        console.log(`\n  💫 형충회합: ${JSON.stringify(adv.hyeongchung).slice(0, 150)}...`);
      }

      if (adv.sibsin) {
        console.log(`\n  🔯 십신 분석: ${JSON.stringify(adv.sibsin).slice(0, 150)}...`);
      }

      if (adv.healthCareer) {
        console.log(`\n  💼 건강/직업: ${JSON.stringify(adv.healthCareer).slice(0, 150)}...`);
      }

      if (adv.score) {
        console.log(`\n  📈 종합 점수: ${JSON.stringify(adv.score).slice(0, 100)}...`);
      }

      if (adv.ultraAdvanced) {
        console.log(`\n  🌟 초고급 분석: ${JSON.stringify(adv.ultraAdvanced).slice(0, 200)}...`);
      }
    }

    // 신살
    if (result.saju?.sinsal) {
      console.log('\n🔮 신살 (神煞):');
      console.log(`  ${JSON.stringify(result.saju.sinsal).slice(0, 300)}...`);
    }

    // ================== 점성학 정보 ==================
    console.log('\n\n' + '='.repeat(80));
    console.log('⭐ 서양 점성학 분석 결과');
    console.log('='.repeat(80));

    if (result.astrology) {
      const { planets, houses, ascendant, mc, aspects, facts } = result.astrology;

      // 행성 위치
      if (Array.isArray(planets) && planets.length > 0) {
        console.log('\n🪐 행성 위치:');
        planets.forEach((p: any) => {
          const retro = p.retrograde ? ' (R)' : '';
          console.log(`  ${(p.name || '?').padEnd(12)}: ${(p.sign || '?').padEnd(12)} ${(p.degree || 0).toString().padStart(2)}° ${(p.minute || 0).toString().padStart(2)}'${retro} [${p.house || '?'}하우스]`);
        });
      }

      // ASC / MC
      console.log('\n📍 주요 포인트:');
      if (ascendant) {
        console.log(`  ASC (상승점): ${(ascendant as any).sign || '?'} ${(ascendant as any).degree || 0}°`);
      }
      if (mc) {
        console.log(`  MC (천정): ${(mc as any).sign || '?'} ${(mc as any).degree || 0}°`);
      }

      // 하우스
      if (Array.isArray(houses) && houses.length > 0) {
        console.log('\n🏠 하우스 커스프:');
        houses.slice(0, 6).forEach((h: any, i: number) => {
          console.log(`  ${(i + 1).toString().padStart(2)}하우스: ${h.cusp?.toFixed(2) || '?'}°`);
        });
        console.log('  ...');
      }

      // 주요 애스펙트
      if (Array.isArray(aspects) && aspects.length > 0) {
        console.log('\n🔗 주요 애스펙트 (상위 10개):');
        aspects.slice(0, 10).forEach((a: any) => {
          console.log(`  ${(a.planet1 || a.p1 || '?').padEnd(10)} ${(a.aspect || a.type || '?').padEnd(12)} ${a.planet2 || a.p2 || '?'} (오브: ${(a.orb || 0).toFixed(2)}°)`);
        });
      }

      // 차트 팩트
      if (facts) {
        console.log('\n📊 차트 팩트:');
        console.log(`  ${JSON.stringify(facts).slice(0, 300)}...`);
      }
    }

    // 고급 점성학 데이터
    console.log('\n\n' + '='.repeat(80));
    console.log('🌌 고급 점성학 데이터');
    console.log('='.repeat(80));

    if (result.extraPoints) {
      console.log('\n✨ 추가 포인트 (키론, 릴리스 등):');
      console.log(`  ${JSON.stringify(result.extraPoints).slice(0, 300)}...`);
    }

    if (result.progressions) {
      console.log('\n📈 프로그레션:');
      console.log(`  Secondary: ${result.progressions.secondary ? '있음' : '없음'}`);
      console.log(`  Solar Arc: ${result.progressions.solarArc ? '있음' : '없음'}`);
    }

    if (result.solarReturn) {
      console.log('\n☀️ 태양 회귀차트:');
      console.log(`  ${JSON.stringify(result.solarReturn).slice(0, 200)}...`);
    }

    if (result.lunarReturn) {
      console.log('\n🌙 달 회귀차트:');
      console.log(`  ${JSON.stringify(result.lunarReturn).slice(0, 200)}...`);
    }

    if (result.draconic) {
      console.log('\n🐉 드라코닉 차트:');
      console.log(`  ${JSON.stringify(result.draconic).slice(0, 200)}...`);
    }

    if (result.harmonics) {
      console.log('\n🎵 하모닉 차트:');
      console.log(`  ${JSON.stringify(result.harmonics).slice(0, 200)}...`);
    }

    if (result.asteroids) {
      console.log('\n☄️ 소행성:');
      console.log(`  ${JSON.stringify(result.asteroids).slice(0, 200)}...`);
    }

    if (result.fixedStars && result.fixedStars.length > 0) {
      console.log('\n⭐ 항성:');
      result.fixedStars.slice(0, 5).forEach((s: any) => {
        console.log(`  - ${s.name}: ${s.longitude?.toFixed(2)}° (${s.magnitude}등급)`);
      });
    }

    if (result.eclipses) {
      console.log('\n🌑 일식/월식:');
      console.log(`  ${JSON.stringify(result.eclipses).slice(0, 200)}...`);
    }

    if (result.electional) {
      console.log('\n📅 이렉셔널 분석:');
      console.log(`  ${JSON.stringify(result.electional).slice(0, 200)}...`);
    }

    if (result.midpoints) {
      console.log('\n🎯 미드포인트:');
      console.log(`  ${JSON.stringify(result.midpoints).slice(0, 200)}...`);
    }

    // 요약
    console.log('\n\n' + '='.repeat(80));
    console.log('📝 종합 요약');
    console.log('='.repeat(80));
    if (result.summary) {
      console.log(`\n${result.summary}`);
    }

    // Full JSON (optional)
    console.log('\n\n' + '='.repeat(80));
    console.log('📄 전체 결과 (JSON)');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ 분석 중 오류 발생:', error);
  }
}

main();
