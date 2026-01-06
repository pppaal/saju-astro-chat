/**
 * Destiny Match 테스트 데이터 생성
 *
 * 기존 사용자들에게 매칭 프로필을 생성하고
 * 테스트용 스와이프/매치 데이터를 추가합니다.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INTERESTS_OPTIONS = [
  'Tarot', 'Astrology', 'Meditation', 'Yoga', 'Crystals',
  'Moon Phases', 'Numerology', 'Dream Analysis', 'Energy Healing',
  'Spirituality', 'Manifestation', 'Chakras', 'Herbalism', 'Nature',
  'Music', 'Art', 'Travel', 'Reading', 'Coffee', 'Cooking'
];

const CITIES = ['서울', '부산', '인천', '대구', '광주'];
const OCCUPATIONS = ['학생', '직장인', '프리랜서', '자영업', '예술가', '개발자'];
const BIOS = [
  '매일 타로카드를 보며 하루를 시작해요 ✨',
  '별자리 운세를 좋아하는 사람입니다 🌙',
  '명상과 요가를 즐기는 힐링 추구형 💫',
  '영적인 성장에 관심이 많아요 🔮',
  '운명적인 만남을 기다리고 있어요 💕'
];

function randomPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedMatchProfiles() {
  console.log('🔮 Destiny Match 테스트 데이터 생성 시작\n');

  // 1. 생년월일이 있는 사용자 찾기
  const usersWithBirth = await prisma.user.findMany({
    where: {
      birthDate: { not: null },
      matchProfile: null // 아직 프로필이 없는 사용자만
    },
    take: 10
  });

  console.log(`📋 프로필 생성 대상 사용자: ${usersWithBirth.length}명\n`);

  if (usersWithBirth.length === 0) {
    console.log('⚠️ 프로필 생성할 사용자가 없습니다.');

    // 기존 사용자 목록 확인
    const existingUsers = await prisma.user.findMany({
      select: { id: true, name: true, birthDate: true, matchProfile: { select: { id: true } } },
      take: 10
    });
    console.log('기존 사용자:', existingUsers.map(u => ({
      name: u.name,
      hasBirth: !!u.birthDate,
      hasProfile: !!u.matchProfile
    })));
    return;
  }

  // 2. 각 사용자에게 매칭 프로필 생성
  const createdProfiles = [];

  for (const user of usersWithBirth) {
    try {
      const profile = await prisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: user.name || `User_${user.id.slice(-4)}`,
          bio: BIOS[randomInt(0, BIOS.length - 1)],
          occupation: OCCUPATIONS[randomInt(0, OCCUPATIONS.length - 1)],
          city: CITIES[randomInt(0, CITIES.length - 1)],
          latitude: 37.5 + (Math.random() * 0.5 - 0.25), // 서울 근처
          longitude: 127.0 + (Math.random() * 0.5 - 0.25),
          interests: JSON.stringify(randomPick(INTERESTS_OPTIONS, randomInt(3, 6))),
          photos: JSON.stringify([]),
          ageMin: 20,
          ageMax: 40,
          maxDistance: 50,
          genderPreference: 'all',
          isActive: true,
          isVisible: true,
          superLikeCount: 3
        }
      });

      createdProfiles.push(profile);
      console.log(`✅ 프로필 생성: ${profile.displayName} (${user.email})`);
    } catch (error) {
      console.log(`❌ 프로필 생성 실패 (${user.name}): ${error}`);
    }
  }

  console.log(`\n📊 생성된 프로필: ${createdProfiles.length}개\n`);

  // 3. 테스트 스와이프 생성 (서로 좋아요 -> 매치)
  if (createdProfiles.length >= 2) {
    console.log('💕 테스트 매치 생성...\n');

    const [profile1, profile2] = createdProfiles;

    // 첫 번째가 두 번째에게 like
    const swipe1 = await prisma.matchSwipe.create({
      data: {
        swiperId: profile1.id,
        targetId: profile2.id,
        action: 'like',
        compatibilityScore: 85,
        isMatched: false
      }
    });
    console.log(`➡️ ${profile1.displayName} → ${profile2.displayName} (like)`);

    // 두 번째가 첫 번째에게 like (매치 성사!)
    const swipe2 = await prisma.matchSwipe.create({
      data: {
        swiperId: profile2.id,
        targetId: profile1.id,
        action: 'like',
        compatibilityScore: 85,
        isMatched: true,
        matchedAt: new Date()
      }
    });
    console.log(`➡️ ${profile2.displayName} → ${profile1.displayName} (like)`);

    // 첫 번째 스와이프도 매치됨으로 업데이트
    await prisma.matchSwipe.update({
      where: { id: swipe1.id },
      data: { isMatched: true, matchedAt: new Date() }
    });

    // user1Id < user2Id 순서로 정렬 (스키마 요구사항)
    const [user1Id, user2Id] = [profile1.userId, profile2.userId].sort();
    const [user1ProfileId, user2ProfileId] = profile1.userId < profile2.userId
      ? [profile1.id, profile2.id]
      : [profile2.id, profile1.id];

    // MatchConnection 생성
    const connection = await prisma.matchConnection.create({
      data: {
        user1Id: user1ProfileId,
        user2Id: user2ProfileId,
        compatibilityScore: 85,
        compatibilityData: JSON.stringify({
          grade: 'A',
          strengths: ['비슷한 관심사', '좋은 에너지 교류'],
          challenges: ['거리가 조금 멀 수 있음'],
          advice: '서로의 관심사에 대해 더 이야기해보세요!'
        }),
        status: 'active',
        isSuperLikeMatch: false,
        chatStarted: false
      }
    });
    console.log(`\n💞 매치 생성 완료! (connectionId: ${connection.id})`);

    // matchCount 업데이트
    await prisma.matchProfile.update({
      where: { id: profile1.id },
      data: { matchCount: 1, likesGiven: 1, likesReceived: 1 }
    });
    await prisma.matchProfile.update({
      where: { id: profile2.id },
      data: { matchCount: 1, likesGiven: 1, likesReceived: 1 }
    });

    // 4. 테스트 메시지 생성
    console.log('\n💬 테스트 메시지 생성...\n');

    const messages = [
      { senderId: profile1.userId, content: '안녕하세요! 반가워요 😊' },
      { senderId: profile2.userId, content: '안녕하세요! 프로필 보고 관심이 갔어요!' },
      { senderId: profile1.userId, content: '저도요! 관심사가 비슷하네요 ✨' }
    ];

    for (const msg of messages) {
      await prisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: msg.senderId,
          content: msg.content,
          messageType: 'text',
          isRead: true,
          readAt: new Date()
        }
      });
      console.log(`💬 ${msg.content}`);
    }

    // chatStarted 업데이트
    await prisma.matchConnection.update({
      where: { id: connection.id },
      data: { chatStarted: true, lastInteractionAt: new Date() }
    });

    console.log('\n✅ 테스트 데이터 생성 완료!');
  }

  // 5. 최종 현황
  console.log('\n' + '='.repeat(50));
  console.log('📊 최종 데이터 현황');
  console.log('='.repeat(50));

  const finalCounts = {
    profiles: await prisma.matchProfile.count(),
    swipes: await prisma.matchSwipe.count(),
    connections: await prisma.matchConnection.count(),
    messages: await prisma.matchMessage.count()
  };

  console.log(`프로필: ${finalCounts.profiles}개`);
  console.log(`스와이프: ${finalCounts.swipes}개`);
  console.log(`매치 연결: ${finalCounts.connections}개`);
  console.log(`메시지: ${finalCounts.messages}개`);

  await prisma.$disconnect();
}

seedMatchProfiles().catch(console.error);
