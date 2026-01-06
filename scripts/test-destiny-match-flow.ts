/**
 * Destiny Match 기능 사용자 플로우 테스트
 *
 * 테스트 항목:
 * 1. 프로필 생성/조회
 * 2. 프로필 발견 (Discover)
 * 3. 스와이프 (Like/Pass/SuperLike)
 * 4. 매치 확인
 * 5. 채팅
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: unknown;
}

const results: TestResult[] = [];

function log(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, data?: unknown) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} [${test}] ${message}`);
  if (data) console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 500));
  results.push({ test, status, message, data });
}

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    log('DB Connection', 'PASS', '데이터베이스 연결 성공');
    return true;
  } catch (error) {
    log('DB Connection', 'FAIL', `데이터베이스 연결 실패: ${error}`);
    return false;
  }
}

async function testMatchProfileSchema() {
  try {
    // MatchProfile 테이블 존재 확인
    const count = await prisma.matchProfile.count();
    log('Schema Check', 'PASS', `MatchProfile 테이블 존재 (현재 ${count}개 프로필)`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      log('Schema Check', 'FAIL', 'MatchProfile 테이블이 존재하지 않습니다. prisma migrate 필요');
    } else {
      log('Schema Check', 'FAIL', `스키마 확인 실패: ${errorMessage}`);
    }
    return false;
  }
}

async function testExistingData() {
  try {
    // 기존 데이터 현황 파악
    const profiles = await prisma.matchProfile.count();
    const swipes = await prisma.matchSwipe.count();
    const connections = await prisma.matchConnection.count();
    const messages = await prisma.matchMessage.count();

    log('Data Overview', 'PASS', `프로필: ${profiles}, 스와이프: ${swipes}, 매치: ${connections}, 메시지: ${messages}`);

    // 활성 프로필 확인
    const activeProfiles = await prisma.matchProfile.findMany({
      where: { isActive: true, isVisible: true },
      include: { user: { select: { name: true, birthDate: true, gender: true } } },
      take: 5
    });

    if (activeProfiles.length > 0) {
      log('Active Profiles', 'PASS', `${activeProfiles.length}개 활성 프로필 발견`,
        activeProfiles.map(p => ({
          id: p.id,
          name: p.displayName,
          city: p.city,
          userName: p.user.name,
          hasBirthData: !!p.user.birthDate
        }))
      );
    } else {
      log('Active Profiles', 'SKIP', '활성 프로필 없음 - 테스트 데이터 생성 필요');
    }

    return { profiles, activeProfiles };
  } catch (error) {
    log('Data Overview', 'FAIL', `데이터 조회 실패: ${error}`);
    return { profiles: 0, activeProfiles: [] };
  }
}

async function testUsersWithBirthData() {
  try {
    // 생년월일이 있는 사용자 확인 (궁합 계산에 필요)
    const usersWithBirth = await prisma.user.findMany({
      where: {
        birthDate: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        matchProfile: { select: { id: true } }
      },
      take: 10
    });

    if (usersWithBirth.length > 0) {
      const withProfile = usersWithBirth.filter(u => u.matchProfile);
      const withoutProfile = usersWithBirth.filter(u => !u.matchProfile);

      log('Users with Birth Data', 'PASS',
        `생년월일 있는 사용자: ${usersWithBirth.length}명 (프로필 있음: ${withProfile.length}, 없음: ${withoutProfile.length})`,
        usersWithBirth.map(u => ({
          name: u.name,
          birthDate: u.birthDate,
          hasProfile: !!u.matchProfile
        }))
      );

      return { usersWithBirth, withProfile, withoutProfile };
    } else {
      log('Users with Birth Data', 'SKIP', '생년월일이 있는 사용자가 없습니다');
      return { usersWithBirth: [], withProfile: [], withoutProfile: [] };
    }
  } catch (error) {
    log('Users with Birth Data', 'FAIL', `사용자 조회 실패: ${error}`);
    return { usersWithBirth: [], withProfile: [], withoutProfile: [] };
  }
}

async function testMatchConnections() {
  try {
    const connections = await prisma.matchConnection.findMany({
      where: { status: 'active' },
      include: {
        user1Profile: { include: { user: { select: { name: true } } } },
        user2Profile: { include: { user: { select: { name: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } }
      },
      take: 5
    });

    if (connections.length > 0) {
      log('Active Connections', 'PASS', `${connections.length}개 활성 매치 발견`,
        connections.map(c => ({
          id: c.id,
          user1: c.user1Profile.user.name,
          user2: c.user2Profile.user.name,
          score: c.compatibilityScore,
          chatStarted: c.chatStarted,
          lastMessage: c.messages[0]?.content?.substring(0, 50)
        }))
      );
    } else {
      log('Active Connections', 'SKIP', '활성 매치 없음');
    }

    return connections;
  } catch (error) {
    log('Active Connections', 'FAIL', `매치 조회 실패: ${error}`);
    return [];
  }
}

async function testSwipeHistory() {
  try {
    const recentSwipes = await prisma.matchSwipe.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        swiperProfile: { select: { displayName: true } },
        targetProfile: { select: { displayName: true } }
      }
    });

    if (recentSwipes.length > 0) {
      const actionCounts = recentSwipes.reduce((acc, s) => {
        acc[s.action] = (acc[s.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      log('Swipe History', 'PASS', `최근 스와이프: ${recentSwipes.length}개 (like: ${actionCounts['like'] || 0}, pass: ${actionCounts['pass'] || 0}, super_like: ${actionCounts['super_like'] || 0})`);
    } else {
      log('Swipe History', 'SKIP', '스와이프 기록 없음');
    }

    return recentSwipes;
  } catch (error) {
    log('Swipe History', 'FAIL', `스와이프 조회 실패: ${error}`);
    return [];
  }
}

async function testDiscoverLogic() {
  try {
    // 발견 로직 시뮬레이션: 특정 사용자 입장에서 발견 가능한 프로필
    const testProfile = await prisma.matchProfile.findFirst({
      where: { isActive: true },
      include: { user: true }
    });

    if (!testProfile) {
      log('Discover Logic', 'SKIP', '테스트할 프로필 없음');
      return;
    }

    // 이미 스와이프한 프로필 ID 수집
    const swipedIds = await prisma.matchSwipe.findMany({
      where: { swiperId: testProfile.id },
      select: { targetId: true }
    });
    const swipedSet = new Set(swipedIds.map(s => s.targetId));

    // 발견 가능한 프로필
    const discoverable = await prisma.matchProfile.findMany({
      where: {
        id: { not: testProfile.id, notIn: Array.from(swipedSet) },
        isActive: true,
        isVisible: true
      },
      include: { user: { select: { name: true, birthDate: true, gender: true } } },
      take: 5
    });

    log('Discover Logic', 'PASS',
      `${testProfile.displayName} 입장에서 발견 가능한 프로필: ${discoverable.length}개`,
      {
        testUser: testProfile.displayName,
        alreadySwiped: swipedSet.size,
        discoverable: discoverable.map(p => p.displayName)
      }
    );
  } catch (error) {
    log('Discover Logic', 'FAIL', `발견 로직 테스트 실패: ${error}`);
  }
}

async function testCompatibilityData() {
  try {
    // 궁합 데이터가 있는 연결 확인
    const withCompatibility = await prisma.matchConnection.findMany({
      where: {
        compatibilityData: { not: null }
      },
      select: {
        id: true,
        compatibilityScore: true,
        compatibilityData: true
      },
      take: 3
    });

    if (withCompatibility.length > 0) {
      log('Compatibility Data', 'PASS', `궁합 데이터가 있는 매치: ${withCompatibility.length}개`,
        withCompatibility.map(c => ({
          score: c.compatibilityScore,
          hasData: !!c.compatibilityData
        }))
      );
    } else {
      log('Compatibility Data', 'SKIP', '궁합 데이터가 있는 매치 없음');
    }
  } catch (error) {
    log('Compatibility Data', 'FAIL', `궁합 데이터 조회 실패: ${error}`);
  }
}

async function testPersonalityIntegration() {
  try {
    // 성격 테스트 결과가 매치 프로필에 연동되어 있는지 확인
    const profilesWithPersonality = await prisma.matchProfile.findMany({
      where: {
        personalityType: { not: null }
      },
      select: {
        displayName: true,
        personalityType: true,
        personalityName: true,
        personalityScores: true
      },
      take: 5
    });

    if (profilesWithPersonality.length > 0) {
      log('Personality Integration', 'PASS', `성격 테스트 연동 프로필: ${profilesWithPersonality.length}개`,
        profilesWithPersonality.map(p => ({
          name: p.displayName,
          type: p.personalityType,
          persona: p.personalityName
        }))
      );
    } else {
      // PersonalityResult 테이블에 데이터가 있는지 확인
      const personalityResults = await prisma.personalityResult.count();
      if (personalityResults > 0) {
        log('Personality Integration', 'SKIP',
          `성격 테스트 결과 ${personalityResults}개 있으나 매치 프로필에 연동 안됨`);
      } else {
        log('Personality Integration', 'SKIP', '성격 테스트 결과 없음');
      }
    }
  } catch (error) {
    log('Personality Integration', 'FAIL', `성격 테스트 연동 확인 실패: ${error}`);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Destiny Match 테스트 결과 요약');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⏭️ SKIP: ${skipped}`);

  if (failed > 0) {
    console.log('\n🔴 실패한 테스트:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }

  if (skipped > 0) {
    console.log('\n🟡 스킵된 테스트 (데이터 부족):');
    results.filter(r => r.status === 'SKIP').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // 사용자 입장에서 필요한 조치 제안
  console.log('\n💡 사용자 플로우 점검 결과:');

  const dataOverview = results.find(r => r.test === 'Data Overview');
  if (dataOverview?.data && typeof dataOverview.data === 'string' && dataOverview.data.includes('프로필: 0')) {
    console.log('   ⚠️ 매치 프로필이 없습니다. /destiny-match/setup 에서 프로필 생성 필요');
  }

  const activeProfiles = results.find(r => r.test === 'Active Profiles');
  if (activeProfiles?.status === 'SKIP') {
    console.log('   ⚠️ 활성 프로필이 없어서 발견할 상대가 없습니다');
  }

  const usersWithBirth = results.find(r => r.test === 'Users with Birth Data');
  if (usersWithBirth?.status === 'SKIP') {
    console.log('   ⚠️ 생년월일 데이터가 없어서 궁합 계산이 불가능합니다');
  }
}

async function main() {
  console.log('🔮 Destiny Match 사용자 플로우 테스트 시작\n');
  console.log('='.repeat(60) + '\n');

  // 1. 기본 연결 테스트
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ 데이터베이스 연결 실패로 테스트 중단');
    return;
  }

  // 2. 스키마 확인
  const schemaOk = await testMatchProfileSchema();
  if (!schemaOk) {
    console.log('\n❌ 스키마 문제로 테스트 중단');
    console.log('💡 해결: npx prisma migrate dev 또는 npx prisma db push 실행');
    return;
  }

  console.log('\n--- 데이터 현황 확인 ---\n');

  // 3. 기존 데이터 현황
  await testExistingData();

  // 4. 생년월일 있는 사용자 확인
  await testUsersWithBirthData();

  // 5. 성격 테스트 연동 확인
  await testPersonalityIntegration();

  console.log('\n--- 매칭 시스템 테스트 ---\n');

  // 6. 매치 연결 확인
  await testMatchConnections();

  // 7. 스와이프 히스토리
  await testSwipeHistory();

  // 8. 발견 로직 테스트
  await testDiscoverLogic();

  // 9. 궁합 데이터 확인
  await testCompatibilityData();

  // 결과 요약
  await printSummary();

  await prisma.$disconnect();
}

main().catch(console.error);
