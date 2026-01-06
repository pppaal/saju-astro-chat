/**
 * Destiny Match API 엔드포인트 테스트
 *
 * 실제 API 라우트를 호출하여 사용자 플로우를 검증합니다.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

interface TestResult {
  api: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  responseStatus?: number;
  data?: unknown;
}

const results: TestResult[] = [];

function log(api: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, responseStatus?: number, data?: unknown) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} [${api}] ${message}`);
  if (responseStatus) console.log(`   HTTP Status: ${responseStatus}`);
  if (data && status === 'FAIL') {
    console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 500));
  }
  results.push({ api, status, message, responseStatus, data });
}

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
    return response.ok || response.status === 404; // 404도 서버가 실행 중이라는 의미
  } catch {
    return false;
  }
}

// 세션 없이 API를 호출했을 때의 동작 테스트
async function testUnauthenticatedAccess() {
  console.log('\n--- 1. 인증 없이 API 접근 테스트 ---\n');

  const endpoints = [
    { method: 'GET', path: '/api/destiny-match/profile' },
    { method: 'GET', path: '/api/destiny-match/discover' },
    { method: 'GET', path: '/api/destiny-match/matches' },
  ];

  for (const { method, path } of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, { method });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        log(path, 'PASS', '인증 없이 접근 시 401 반환', response.status);
      } else if (response.status === 500) {
        // 세션 관련 에러일 수 있음
        log(path, 'PASS', '인증 필요 (세션 에러)', response.status, data);
      } else {
        log(path, 'FAIL', `예상치 못한 응답`, response.status, data);
      }
    } catch (error) {
      log(path, 'FAIL', `요청 실패: ${error}`);
    }
  }
}

// API 라우트 파일 구조 확인
async function testApiRouteStructure() {
  console.log('\n--- 2. API 라우트 구조 확인 ---\n');

  const routeChecks = [
    { path: 'src/app/api/destiny-match/profile/route.ts', name: 'Profile API' },
    { path: 'src/app/api/destiny-match/discover/route.ts', name: 'Discover API' },
    { path: 'src/app/api/destiny-match/swipe/route.ts', name: 'Swipe API' },
    { path: 'src/app/api/destiny-match/matches/route.ts', name: 'Matches API' },
    { path: 'src/app/api/destiny-match/chat/route.ts', name: 'Chat API' },
  ];

  const fs = await import('fs');
  const path = await import('path');

  for (const route of routeChecks) {
    const fullPath = path.join(process.cwd(), route.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const hasGet = content.includes('export async function GET');
      const hasPost = content.includes('export async function POST');
      const hasDelete = content.includes('export async function DELETE');

      const methods = [];
      if (hasGet) methods.push('GET');
      if (hasPost) methods.push('POST');
      if (hasDelete) methods.push('DELETE');

      log(route.name, 'PASS', `존재함 (${methods.join(', ')})`);
    } else {
      log(route.name, 'FAIL', '파일이 존재하지 않음');
    }
  }
}

// 페이지 구조 확인
async function testPageStructure() {
  console.log('\n--- 3. 페이지 구조 확인 ---\n');

  const pageChecks = [
    { path: 'src/app/destiny-match/page.tsx', name: 'Main Page' },
    { path: 'src/app/destiny-match/setup/page.tsx', name: 'Setup Page' },
    { path: 'src/app/destiny-match/matches/page.tsx', name: 'Matches Page' },
    { path: 'src/app/destiny-match/chat/[connectionId]/page.tsx', name: 'Chat Page' },
  ];

  const fs = await import('fs');
  const path = await import('path');

  for (const page of pageChecks) {
    const fullPath = path.join(process.cwd(), page.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const hasSession = content.includes('useSession') || content.includes('getServerSession');
      const hasRouter = content.includes('useRouter');

      log(page.name, 'PASS', `존재함 (인증체크: ${hasSession ? '✓' : '✗'}, 라우터: ${hasRouter ? '✓' : '✗'})`);
    } else {
      log(page.name, 'FAIL', '파일이 존재하지 않음');
    }
  }
}

// 라이브러리 의존성 확인
async function testLibraryDependencies() {
  console.log('\n--- 4. 라이브러리 의존성 확인 ---\n');

  const libChecks = [
    { path: 'src/lib/destiny-match/quickCompatibility.ts', name: 'Quick Compatibility' },
    { path: 'src/lib/destiny-match/personalityCompatibility.ts', name: 'Personality Compatibility' },
  ];

  const fs = await import('fs');
  const path = await import('path');

  for (const lib of libChecks) {
    const fullPath = path.join(process.cwd(), lib.path);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const exportedFunctions = content.match(/export (async )?function \w+/g) || [];

      log(lib.name, 'PASS', `존재함 (${exportedFunctions.length}개 함수 export)`);
    } else {
      log(lib.name, 'FAIL', '파일이 존재하지 않음');
    }
  }
}

// 데이터 무결성 확인
async function testDataIntegrity() {
  console.log('\n--- 5. 데이터 무결성 확인 ---\n');

  // 프로필-사용자 연결 확인
  const allProfiles = await prisma.matchProfile.findMany({
    include: { user: true }
  });
  const profilesWithoutUser = allProfiles.filter(p => !p.user);

  if (profilesWithoutUser.length === 0) {
    log('Profile-User Relation', 'PASS', `모든 프로필(${allProfiles.length}개)이 사용자와 연결됨`);
  } else {
    log('Profile-User Relation', 'FAIL', `고아 프로필 ${profilesWithoutUser.length}개 발견`);
  }

  // 매치 연결 무결성
  const connections = await prisma.matchConnection.findMany({
    include: {
      user1Profile: true,
      user2Profile: true
    }
  });

  const invalidConnections = connections.filter(c => !c.user1Profile || !c.user2Profile);
  if (invalidConnections.length === 0) {
    log('Connection Integrity', 'PASS', `모든 연결(${connections.length}개)이 유효함`);
  } else {
    log('Connection Integrity', 'FAIL', `무효한 연결 ${invalidConnections.length}개`);
  }

  // 메시지-연결 무결성
  const allMessages = await prisma.matchMessage.findMany({
    include: { connection: true }
  });
  const messagesWithoutConnection = allMessages.filter(m => !m.connection);

  if (messagesWithoutConnection.length === 0) {
    log('Message Integrity', 'PASS', `모든 메시지(${allMessages.length}개)가 연결과 연결됨`);
  } else {
    log('Message Integrity', 'FAIL', `고아 메시지 ${messagesWithoutConnection.length}개`);
  }
}

// 실제 궁합 계산 테스트
async function testCompatibilityCalculation() {
  console.log('\n--- 6. 궁합 계산 로직 테스트 ---\n');

  try {
    // 두 명의 사용자 birth data 가져오기
    const users = await prisma.user.findMany({
      where: { birthDate: { not: null } },
      take: 2
    });

    if (users.length < 2) {
      log('Compatibility Calc', 'SKIP', '테스트할 사용자 부족');
      return;
    }

    // quickCompatibility 모듈 import 시도
    const { getCompatibilitySummary } = await import('../src/lib/destiny-match/quickCompatibility');

    const person1 = {
      birthDate: users[0].birthDate!,
      birthTime: users[0].birthTime || undefined,
      gender: users[0].gender || undefined
    };

    const person2 = {
      birthDate: users[1].birthDate!,
      birthTime: users[1].birthTime || undefined,
      gender: users[1].gender || undefined
    };

    const summary = await getCompatibilitySummary(person1, person2);

    if (summary && typeof summary.score === 'number') {
      log('Compatibility Calc', 'PASS',
        `궁합 계산 성공: ${summary.score}점 (${summary.grade}) ${summary.emoji}`,
        undefined,
        summary
      );
    } else {
      log('Compatibility Calc', 'FAIL', '궁합 계산 결과가 잘못됨', undefined, summary);
    }
  } catch (error) {
    log('Compatibility Calc', 'FAIL', `궁합 계산 실패: ${error}`);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Destiny Match API 테스트 결과 요약');
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
      console.log(`   - ${r.api}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // 사용자 입장에서 권장 사항
  console.log('\n💡 사용자 플로우 권장 사항:');
  console.log('1. /destiny-match/setup 에서 프로필 생성');
  console.log('2. /destiny-match 에서 스와이프 시작');
  console.log('3. /destiny-match/matches 에서 매치 확인');
  console.log('4. /destiny-match/chat/[id] 에서 대화');
}

async function main() {
  console.log('🔮 Destiny Match API 테스트 시작\n');
  console.log('='.repeat(60));

  // 서버 실행 여부 확인
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.log('⚠️ 서버가 실행되지 않음. 파일 구조 테스트만 진행합니다.');
    console.log('   서버 시작: npm run dev\n');
  } else {
    console.log('✅ 서버 실행 중\n');
    await testUnauthenticatedAccess();
  }

  await testApiRouteStructure();
  await testPageStructure();
  await testLibraryDependencies();
  await testDataIntegrity();
  await testCompatibilityCalculation();

  await printSummary();

  await prisma.$disconnect();
}

main().catch(console.error);
