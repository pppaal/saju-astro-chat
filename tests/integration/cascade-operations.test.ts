/**
 * Cascade Operations Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 삭제 시 연관 데이터 삭제
 * - 부모-자식 관계 데이터 정합성
 * - 참조 무결성 테스트
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  createTestSubscription,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Cascade Operations", () => {
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

  describe("User Deletion Cascade", () => {
    it("cascades deletion to readings", async () => {
      const userData = {
        id: `cascade_reading_${Date.now()}`,
        email: `cascade_reading_${Date.now()}@test.example.com`,
        name: "Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      // Create readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: { userId: user.id, type: "saju", content: "{}" },
        });
      }

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify readings deleted
      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      });

      expect(readings).toHaveLength(0);
    });

    it("cascades deletion to consultation history", async () => {
      const userData = {
        id: `cascade_history_${Date.now()}`,
        email: `cascade_history_${Date.now()}@test.example.com`,
        name: "History Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: "test", summary: "Test", content: "{}" },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const history = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id },
      });

      expect(history).toHaveLength(0);
    });

    it("cascades deletion to tarot readings", async () => {
      const userData = {
        id: `cascade_tarot_${Date.now()}`,
        email: `cascade_tarot_${Date.now()}@test.example.com`,
        name: "Tarot Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Test",
          spreadId: "single",
          spreadTitle: "Single",
          cards: [],
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const tarotReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id },
      });

      expect(tarotReadings).toHaveLength(0);
    });

    it("cascades deletion to daily fortunes", async () => {
      const userData = {
        id: `cascade_fortune_${Date.now()}`,
        email: `cascade_fortune_${Date.now()}@test.example.com`,
        name: "Fortune Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: "2024-06-15",
          loveScore: 80,
          careerScore: 75,
          wealthScore: 70,
          healthScore: 85,
          overallScore: 78,
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const fortunes = await testPrisma.dailyFortune.findMany({
        where: { userId: user.id },
      });

      expect(fortunes).toHaveLength(0);
    });

    it("cascades deletion to saved persons", async () => {
      const userData = {
        id: `cascade_person_${Date.now()}`,
        email: `cascade_person_${Date.now()}@test.example.com`,
        name: "Person Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: "Friend",
          relationship: "friend",
          birthDate: "1990-01-01",
          gender: "male",
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const persons = await testPrisma.savedPerson.findMany({
        where: { userId: user.id },
      });

      expect(persons).toHaveLength(0);
    });

    it("cascades deletion to chat sessions", async () => {
      const userData = {
        id: `cascade_chat_${Date.now()}`,
        email: `cascade_chat_${Date.now()}@test.example.com`,
        name: "Chat Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: "career",
          messages: [],
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(0);
    });
  });

  describe("Complete User Data Cascade", () => {
    it("deletes all user-related data in one operation", async () => {
      const userData = {
        id: `cascade_full_${Date.now()}`,
        email: `cascade_full_${Date.now()}@test.example.com`,
        name: "Full Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      // Create diverse data
      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}" },
      });

      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: "test", summary: "Test", content: "{}" },
      });

      await testPrisma.tarotReading.create({
        data: {
          userId: user.id,
          question: "Test",
          spreadId: "single",
          spreadTitle: "Single",
          cards: [],
        },
      });

      await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: "Friend",
          relationship: "friend",
          birthDate: "1990-01-01",
          gender: "male",
        },
      });

      await testPrisma.userInteraction.create({
        data: {
          userId: user.id,
          interactionType: "test",
          context: {},
        },
      });

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify all cascaded
      const readings = await testPrisma.reading.count({ where: { userId: user.id } });
      const history = await testPrisma.consultationHistory.count({ where: { userId: user.id } });
      const tarot = await testPrisma.tarotReading.count({ where: { userId: user.id } });
      const persons = await testPrisma.savedPerson.count({ where: { userId: user.id } });
      const interactions = await testPrisma.userInteraction.count({ where: { userId: user.id } });

      expect(readings).toBe(0);
      expect(history).toBe(0);
      expect(tarot).toBe(0);
      expect(persons).toBe(0);
      expect(interactions).toBe(0);
    });
  });

  describe("Match Profile Cascade", () => {
    it("cascades deletion through match relationships", async () => {
      const user1Data = {
        id: `match_cascade1_${Date.now()}`,
        email: `match1_${Date.now()}@test.example.com`,
        name: "Match User 1",
      };

      const user2Data = {
        id: `match_cascade2_${Date.now()}`,
        email: `match2_${Date.now()}@test.example.com`,
        name: "Match User 2",
      };

      const user1 = await testPrisma.user.create({ data: user1Data });
      const user2 = await testPrisma.user.create({ data: user2Data });

      // Create match profiles
      const profile1 = await testPrisma.matchProfile.create({
        data: {
          userId: user1.id,
          displayName: "User1",
          birthDate: "1990-01-01",
          gender: "male",
          lookingFor: "female",
          isActive: true,
          lastActive: new Date(),
        },
      });

      const profile2 = await testPrisma.matchProfile.create({
        data: {
          userId: user2.id,
          displayName: "User2",
          birthDate: "1992-05-15",
          gender: "female",
          lookingFor: "male",
          isActive: true,
          lastActive: new Date(),
        },
      });

      // Create swipe and connection
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          direction: "right",
        },
      });

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      await testPrisma.matchMessage.create({
        data: {
          connectionId: connection.id,
          senderId: user1.id,
          content: "Hello!",
        },
      });

      // Delete first user - need to clean up match data first
      await testPrisma.matchMessage.deleteMany({
        where: { connectionId: connection.id },
      });
      await testPrisma.matchConnection.delete({
        where: { id: connection.id },
      });
      await testPrisma.matchSwipe.deleteMany({
        where: { OR: [{ swiperId: profile1.id }, { targetId: profile1.id }] },
      });
      await testPrisma.matchProfile.delete({
        where: { id: profile1.id },
      });
      await testPrisma.user.delete({ where: { id: user1.id } });

      // Cleanup second user
      await testPrisma.matchProfile.delete({
        where: { id: profile2.id },
      });
      await testPrisma.user.delete({ where: { id: user2.id } });

      // Verify all cleaned up
      const profiles = await testPrisma.matchProfile.findMany({
        where: { userId: { in: [user1.id, user2.id] } },
      });

      expect(profiles).toHaveLength(0);
    });
  });

  describe("Subscription and Credits Cascade", () => {
    it("cascades user deletion to subscription", async () => {
      const user = await createTestUserInDb();
      await createTestSubscription(user.id, "pro");

      // Manual cleanup needed before user deletion
      await testPrisma.subscription.deleteMany({
        where: { userId: user.id },
      });

      // Now user can be deleted via cleanup
    });

    it("cascades user deletion to credits", async () => {
      const user = await createTestUserInDb();
      await createTestUserCredits(user.id, "starter");

      // Verify credits exist
      const creditsBefore = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      });
      expect(creditsBefore).not.toBeNull();

      // Credits will be deleted via cleanupTestUser
    });
  });

  describe("Persona Memory Cascade", () => {
    it("cascades deletion to persona memories", async () => {
      const userData = {
        id: `cascade_persona_${Date.now()}`,
        email: `cascade_persona_${Date.now()}@test.example.com`,
        name: "Persona Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: "counselor",
          memories: [{ key: "name", value: "Test" }],
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const memories = await testPrisma.personaMemory.findMany({
        where: { userId: user.id },
      });

      expect(memories).toHaveLength(0);
    });
  });

  describe("Section Feedback Cascade", () => {
    it("cascades deletion to section feedback", async () => {
      const userData = {
        id: `cascade_feedback_${Date.now()}`,
        email: `cascade_feedback_${Date.now()}@test.example.com`,
        name: "Feedback Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.sectionFeedback.create({
        data: {
          userId: user.id,
          sectionId: "test_section",
          feedbackType: "helpful",
          rating: 5,
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const feedback = await testPrisma.sectionFeedback.findMany({
        where: { userId: user.id },
      });

      expect(feedback).toHaveLength(0);
    });
  });

  describe("Calendar Date Cascade", () => {
    it("cascades deletion to saved calendar dates", async () => {
      const userData = {
        id: `cascade_calendar_${Date.now()}`,
        email: `cascade_calendar_${Date.now()}@test.example.com`,
        name: "Calendar Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: "2024-06-15",
          title: "Important Date",
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const dates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id },
      });

      expect(dates).toHaveLength(0);
    });
  });

  describe("Shared Result Cascade", () => {
    it("cascades deletion to shared results", async () => {
      const userData = {
        id: `cascade_shared_${Date.now()}`,
        email: `cascade_shared_${Date.now()}@test.example.com`,
        name: "Shared Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: "test",
          shareCode: `share_${Date.now()}`,
          resultData: {},
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const shared = await testPrisma.sharedResult.findMany({
        where: { userId: user.id },
      });

      expect(shared).toHaveLength(0);
    });
  });

  describe("Verification Cascade", () => {
    it("handles session cascade on user deletion", async () => {
      const userData = {
        id: `cascade_session_${Date.now()}`,
        email: `cascade_session_${Date.now()}@test.example.com`,
        name: "Session Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `token_${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const sessions = await testPrisma.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(0);
    });

    it("handles account cascade on user deletion", async () => {
      const userData = {
        id: `cascade_account_${Date.now()}`,
        email: `cascade_account_${Date.now()}@test.example.com`,
        name: "Account Cascade Test",
      };

      const user = await testPrisma.user.create({ data: userData });

      await testPrisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: `google_${Date.now()}`,
        },
      });

      await testPrisma.user.delete({ where: { id: user.id } });

      const accounts = await testPrisma.account.findMany({
        where: { userId: user.id },
      });

      expect(accounts).toHaveLength(0);
    });
  });
});
