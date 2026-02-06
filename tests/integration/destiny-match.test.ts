/**
 * Destiny Match Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 매칭 프로필 생성 및 관리
 * - 스와이프 및 매칭 로직
 * - 메시지 기능
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Destiny Match System", () => {
  if (!hasTestDb) {
    it("skips when test database is unavailable", () => {
      expect(true).toBe(true);
    });
    return;
  }

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await cleanupAllTestUsers();
    await disconnectTestDb();
  });

  afterEach(async () => {
    await cleanupAllTestUsers();
  });

  describe("Match Profile Creation", () => {
    it("creates a match profile for user", async () => {
      const user = await createTestUserInDb({
        birthDate: "1990-05-15",
        gender: "M",
      });

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "민준",
          bio: "열정적인 개발자입니다",
          birthDate: new Date("1990-05-15"),
          gender: "male",
          interestedIn: "female",
          photos: JSON.stringify(["photo1.jpg", "photo2.jpg"]),
          preferences: JSON.stringify({
            ageRange: { min: 25, max: 35 },
            distance: 50,
          }),
        },
      });

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(user.id);
      expect(profile.displayName).toBe("민준");
      expect(profile.gender).toBe("male");
    });

    it("stores Saju compatibility data", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "수진",
          birthDate: new Date("1992-08-20"),
          gender: "female",
          interestedIn: "male",
          sajuData: JSON.stringify({
            yearPillar: { stem: "壬", branch: "申" },
            monthPillar: { stem: "戊", branch: "申" },
            dayPillar: { stem: "甲", branch: "寅" },
            timePillar: { stem: "庚", branch: "午" },
            fiveElements: { wood: 2, fire: 1, earth: 2, metal: 3, water: 2 },
          }),
        },
      });

      const sajuData = JSON.parse(profile.sajuData as string);
      expect(sajuData.yearPillar.stem).toBe("壬");
      expect(sajuData.fiveElements.metal).toBe(3);
    });

    it("enforces one profile per user", async () => {
      const user = await createTestUserInDb();

      await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "First Profile",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      // Attempting to create another profile should fail
      await expect(
        testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: "Second Profile",
            birthDate: new Date("1990-01-01"),
            gender: "male",
            interestedIn: "female",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Swipe Functionality", () => {
    it("records a like swipe", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      const swipe = await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          direction: "right",
        },
      });

      expect(swipe.direction).toBe("right");
      expect(swipe.swiperId).toBe(profile1.id);
      expect(swipe.targetId).toBe(profile2.id);
    });

    it("records a pass swipe", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      const swipe = await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          direction: "left",
        },
      });

      expect(swipe.direction).toBe("left");
    });

    it("prevents duplicate swipes on same profile", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          direction: "right",
        },
      });

      // Second swipe should fail due to unique constraint
      await expect(
        testPrisma.matchSwipe.create({
          data: {
            swiperId: profile1.id,
            targetId: profile2.id,
            direction: "left",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Match Creation", () => {
    it("creates a match when both users swipe right", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      // User1 swipes right on User2
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          direction: "right",
        },
      });

      // User2 swipes right on User1
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile2.id,
          targetId: profile1.id,
          direction: "right",
        },
      });

      // Create match connection
      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          compatibilityScore: 85,
        },
      });

      expect(connection).toBeDefined();
      expect(connection.compatibilityScore).toBe(85);
    });

    it("does not create match for one-sided swipes", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      // Only User1 swipes right
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          direction: "right",
        },
      });

      // Check for mutual match
      const mutualSwipe = await testPrisma.matchSwipe.findFirst({
        where: {
          swiperId: profile2.id,
          targetId: profile1.id,
          direction: "right",
        },
      });

      expect(mutualSwipe).toBeNull();
    });

    it("stores compatibility analysis in match", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          compatibilityScore: 78,
          analysisData: JSON.stringify({
            sajuCompatibility: 80,
            elementHarmony: 75,
            zodiacMatch: 82,
            strengths: ["Communication", "Shared values"],
            challenges: ["Different energy levels"],
          }),
        },
      });

      const analysisData = JSON.parse(connection.analysisData as string);
      expect(analysisData.sajuCompatibility).toBe(80);
      expect(analysisData.strengths).toContain("Communication");
    });
  });

  describe("Match Messaging", () => {
    it("sends message between matched users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          compatibilityScore: 85,
        },
      });

      const message = await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: "안녕하세요! 반갑습니다 😊",
        },
      });

      expect(message).toBeDefined();
      expect(message.content).toBe("안녕하세요! 반갑습니다 😊");
      expect(message.senderId).toBe(user1.id);
    });

    it("retrieves conversation history", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          compatibilityScore: 85,
        },
      });

      // Create conversation
      const messages = [
        { senderId: user1.id, content: "안녕하세요!" },
        { senderId: user2.id, content: "안녕하세요! 반가워요 :)" },
        { senderId: user1.id, content: "프로필 사진이 멋지네요" },
        { senderId: user2.id, content: "감사합니다~" },
      ];

      for (const msg of messages) {
        await testPrisma.matchMessage.create({
          data: {
            connectionId: connection.id,
            senderId: msg.senderId,
            content: msg.content,
          },
        });
      }

      const conversation = await testPrisma.matchMessage.findMany({
        where: { connectionId: connection.id },
        orderBy: { createdAt: "asc" },
      });

      expect(conversation).toHaveLength(4);
      expect(conversation[0].content).toBe("안녕하세요!");
      expect(conversation[3].content).toBe("감사합니다~");
    });

    it("marks messages as read", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User 1",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User 2",
          birthDate: new Date("1992-06-15"),
          gender: "female",
          interestedIn: "male",
        },
      });

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          compatibilityScore: 85,
        },
      });

      const message = await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: "Hello!",
          read: false,
        },
      });

      expect(message.read).toBe(false);

      // Mark as read
      const updatedMessage = await testPrisma.matchMessage.update({
        where: { id: message.id },
        data: { read: true, readAt: new Date() },
      });

      expect(updatedMessage.read).toBe(true);
      expect(updatedMessage.readAt).toBeInstanceOf(Date);
    });
  });

  describe("Profile Discovery", () => {
    it("finds profiles matching preferences", async () => {
      const mainUser = await createTestUserInDb();

      // Create main user's profile (male looking for female)
      await testPrisma.matchProfile.create({
        data: {
          userId: mainUser.id,
          displayName: "Main User",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
          preferences: JSON.stringify({ ageRange: { min: 25, max: 35 } }),
        },
      });

      // Create potential matches
      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `Female User ${i}`,
            birthDate: new Date(`199${i}-06-15`),
            gender: "female",
            interestedIn: "male",
          },
        });
      }

      // Find female profiles interested in males
      const potentialMatches = await testPrisma.matchProfile.findMany({
        where: {
          gender: "female",
          interestedIn: "male",
          userId: { not: mainUser.id },
        },
      });

      expect(potentialMatches).toHaveLength(5);
    });

    it("excludes already swiped profiles", async () => {
      const mainUser = await createTestUserInDb();

      const mainProfile = await testPrisma.matchProfile.create({
        data: {
          userId: mainUser.id,
          displayName: "Main User",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      // Create 5 potential matches
      const targetProfiles = [];
      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        const profile = await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `User ${i}`,
            birthDate: new Date(`199${i}-06-15`),
            gender: "female",
            interestedIn: "male",
          },
        });
        targetProfiles.push(profile);
      }

      // Swipe on first 2 profiles
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: mainProfile.id,
          targetId: targetProfiles[0].id,
          direction: "right",
        },
      });

      await testPrisma.matchSwipe.create({
        data: {
          swiperId: mainProfile.id,
          targetId: targetProfiles[1].id,
          direction: "left",
        },
      });

      // Find profiles not yet swiped
      const swipedIds = await testPrisma.matchSwipe.findMany({
        where: { swiperId: mainProfile.id },
        select: { targetId: true },
      });

      const swipedTargetIds = swipedIds.map((s) => s.targetId);

      const unswiped = await testPrisma.matchProfile.findMany({
        where: {
          gender: "female",
          interestedIn: "male",
          id: { notIn: swipedTargetIds },
          userId: { not: mainUser.id },
        },
      });

      expect(unswiped).toHaveLength(3);
    });
  });

  describe("Profile Updates", () => {
    it("updates profile bio", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "User",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
          bio: "Original bio",
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: { bio: "Updated bio with more details" },
      });

      expect(updated.bio).toBe("Updated bio with more details");
    });

    it("updates profile photos", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "User",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
          photos: JSON.stringify(["photo1.jpg"]),
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: {
          photos: JSON.stringify(["photo1.jpg", "photo2.jpg", "photo3.jpg"]),
        },
      });

      const photos = JSON.parse(updated.photos as string);
      expect(photos).toHaveLength(3);
    });
  });

  describe("Cascade Deletes", () => {
    it("deletes profile and related data when user is deleted", async () => {
      const userData = {
        id: `test_match_${Date.now()}`,
        email: `match_${Date.now()}@test.example.com`,
        name: "Match Test User",
      };

      const user = await testPrisma.user.create({ data: userData });

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "Test User",
          birthDate: new Date("1990-01-01"),
          gender: "male",
          interestedIn: "female",
        },
      });

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify profile is deleted
      const deletedProfile = await testPrisma.matchProfile.findUnique({
        where: { id: profile.id },
      });

      expect(deletedProfile).toBeNull();
    });
  });
});
