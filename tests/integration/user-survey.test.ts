/**
 * User Survey Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 설문조사 생성 및 관리
 * - 사용자 응답 수집
 * - 결과 분석
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

describe("Integration: User Survey", () => {
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

  describe("Survey Creation", () => {
    it("creates a survey", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "사용자 만족도 조사",
          description: "서비스 개선을 위한 설문조사입니다.",
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(survey.title).toBe("사용자 만족도 조사");
      expect(survey.status).toBe("active");
    });

    it("creates survey with questions", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "기능 선호도 조사",
          status: "active",
          startDate: new Date(),
          questions: {
            items: [
              {
                id: "q1",
                type: "rating",
                text: "전반적인 만족도를 평가해주세요",
                required: true,
                scale: 5,
              },
              {
                id: "q2",
                type: "multiple_choice",
                text: "가장 자주 사용하는 기능은?",
                required: true,
                options: ["사주 분석", "타로 읽기", "궁합 보기", "운세 확인"],
              },
              {
                id: "q3",
                type: "text",
                text: "개선 사항이 있다면 알려주세요",
                required: false,
              },
            ],
          },
        },
      });

      const questions = survey.questions as { items: { id: string }[] };
      expect(questions.items).toHaveLength(3);
    });

    it("creates targeted survey", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "프리미엄 사용자 설문",
          status: "active",
          startDate: new Date(),
          targeting: {
            userTypes: ["premium"],
            minUsageDays: 30,
            platforms: ["ios", "android"],
          },
        },
      });

      const targeting = survey.targeting as { userTypes: string[] };
      expect(targeting.userTypes).toContain("premium");
    });

    it("creates recurring survey", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "월간 NPS 조사",
          status: "active",
          startDate: new Date(),
          isRecurring: true,
          recurringSchedule: {
            frequency: "monthly",
            dayOfMonth: 1,
            notificationTime: "10:00",
          },
        },
      });

      expect(survey.isRecurring).toBe(true);
    });
  });

  describe("Survey Responses", () => {
    it("records survey response", async () => {
      const user = await createTestUserInDb();

      const survey = await testPrisma.survey.create({
        data: {
          title: "Test Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const response = await testPrisma.surveyResponse.create({
        data: {
          userId: user.id,
          surveyId: survey.id,
          answers: {
            q1: 5,
            q2: "사주 분석",
            q3: "매우 만족합니다!",
          },
          completedAt: new Date(),
        },
      });

      const answers = response.answers as { q1: number };
      expect(answers.q1).toBe(5);
    });

    it("records partial response", async () => {
      const user = await createTestUserInDb();

      const survey = await testPrisma.survey.create({
        data: {
          title: "Long Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const response = await testPrisma.surveyResponse.create({
        data: {
          userId: user.id,
          surveyId: survey.id,
          answers: { q1: 4 },
          isComplete: false,
          lastQuestionIndex: 0,
        },
      });

      expect(response.isComplete).toBe(false);
    });

    it("completes partial response", async () => {
      const user = await createTestUserInDb();

      const survey = await testPrisma.survey.create({
        data: {
          title: "Resume Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const response = await testPrisma.surveyResponse.create({
        data: {
          userId: user.id,
          surveyId: survey.id,
          answers: { q1: 4 },
          isComplete: false,
        },
      });

      const updated = await testPrisma.surveyResponse.update({
        where: { id: response.id },
        data: {
          answers: { q1: 4, q2: "타로 읽기", q3: "좋아요" },
          isComplete: true,
          completedAt: new Date(),
        },
      });

      expect(updated.isComplete).toBe(true);
    });

    it("tracks response time", async () => {
      const user = await createTestUserInDb();

      const survey = await testPrisma.survey.create({
        data: {
          title: "Timed Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const startTime = new Date(Date.now() - 5 * 60 * 1000);
      const endTime = new Date();

      const response = await testPrisma.surveyResponse.create({
        data: {
          userId: user.id,
          surveyId: survey.id,
          answers: { q1: 5 },
          startedAt: startTime,
          completedAt: endTime,
          durationSeconds: 300,
          isComplete: true,
        },
      });

      expect(response.durationSeconds).toBe(300);
    });
  });

  describe("Survey Statistics", () => {
    it("counts responses per survey", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Popular Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      for (let i = 0; i < 10; i++) {
        const user = await createTestUserInDb();
        await testPrisma.surveyResponse.create({
          data: {
            userId: user.id,
            surveyId: survey.id,
            answers: { q1: Math.floor(Math.random() * 5) + 1 },
            isComplete: true,
            completedAt: new Date(),
          },
        });
      }

      const count = await testPrisma.surveyResponse.count({
        where: { surveyId: survey.id, isComplete: true },
      });

      expect(count).toBe(10);
    });

    it("calculates average rating", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Rating Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const ratings = [5, 4, 5, 3, 5, 4, 5, 4, 5, 5]; // avg = 4.5

      for (let i = 0; i < ratings.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.surveyResponse.create({
          data: {
            userId: user.id,
            surveyId: survey.id,
            answers: { rating: ratings[i] },
            isComplete: true,
            completedAt: new Date(),
          },
        });
      }

      const responses = await testPrisma.surveyResponse.findMany({
        where: { surveyId: survey.id },
      });

      const avgRating =
        responses.reduce((sum, r) => {
          const answers = r.answers as { rating: number };
          return sum + answers.rating;
        }, 0) / responses.length;

      expect(avgRating).toBe(4.5);
    });

    it("counts responses by answer option", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Choice Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const choices = ["A", "B", "A", "C", "A", "B", "A", "A"];

      for (let i = 0; i < choices.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.surveyResponse.create({
          data: {
            userId: user.id,
            surveyId: survey.id,
            answers: { choice: choices[i] },
            isComplete: true,
            completedAt: new Date(),
          },
        });
      }

      const responses = await testPrisma.surveyResponse.findMany({
        where: { surveyId: survey.id },
      });

      const countA = responses.filter((r) => {
        const answers = r.answers as { choice: string };
        return answers.choice === "A";
      }).length;

      expect(countA).toBe(5);
    });

    it("calculates completion rate", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Completion Survey",
          status: "active",
          startDate: new Date(),
        },
      });

      const completed = [true, true, false, true, true, false, true, true, true, false];

      for (let i = 0; i < completed.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.surveyResponse.create({
          data: {
            userId: user.id,
            surveyId: survey.id,
            answers: { q1: 4 },
            isComplete: completed[i],
            completedAt: completed[i] ? new Date() : null,
          },
        });
      }

      const total = await testPrisma.surveyResponse.count({
        where: { surveyId: survey.id },
      });

      const completedCount = await testPrisma.surveyResponse.count({
        where: { surveyId: survey.id, isComplete: true },
      });

      const completionRate = (completedCount / total) * 100;
      expect(completionRate).toBe(70);
    });
  });

  describe("Survey Management", () => {
    it("updates survey status", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Status Survey",
          status: "draft",
          startDate: new Date(),
        },
      });

      const updated = await testPrisma.survey.update({
        where: { id: survey.id },
        data: { status: "active" },
      });

      expect(updated.status).toBe("active");
    });

    it("closes survey", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Closing Survey",
          status: "active",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const updated = await testPrisma.survey.update({
        where: { id: survey.id },
        data: {
          status: "closed",
          endDate: new Date(),
        },
      });

      expect(updated.status).toBe("closed");
    });

    it("archives survey with results", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Archive Survey",
          status: "closed",
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const updated = await testPrisma.survey.update({
        where: { id: survey.id },
        data: {
          status: "archived",
          archivedAt: new Date(),
          summaryResults: {
            totalResponses: 150,
            completionRate: 85,
            averageRating: 4.2,
            topFeedback: ["UI 개선", "더 많은 기능"],
          },
        },
      });

      expect(updated.status).toBe("archived");
    });
  });

  describe("Survey Queries", () => {
    it("retrieves active surveys", async () => {
      const statuses = ["active", "draft", "active", "closed", "active"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.survey.create({
          data: {
            title: `Survey ${i}`,
            status: statuses[i],
            startDate: new Date(),
          },
        });
      }

      const active = await testPrisma.survey.findMany({
        where: { status: "active" },
      });

      expect(active).toHaveLength(3);
    });

    it("retrieves user's survey responses", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        const survey = await testPrisma.survey.create({
          data: {
            title: `User Survey ${i}`,
            status: "active",
            startDate: new Date(),
          },
        });

        await testPrisma.surveyResponse.create({
          data: {
            userId: user.id,
            surveyId: survey.id,
            answers: { rating: 4 + (i % 2) },
            isComplete: true,
            completedAt: new Date(),
          },
        });
      }

      const responses = await testPrisma.surveyResponse.findMany({
        where: { userId: user.id },
        include: { survey: true },
      });

      expect(responses).toHaveLength(5);
    });

    it("finds unanswered surveys for user", async () => {
      const user = await createTestUserInDb();

      const surveys = [];
      for (let i = 0; i < 5; i++) {
        const survey = await testPrisma.survey.create({
          data: {
            title: `Available Survey ${i}`,
            status: "active",
            startDate: new Date(),
          },
        });
        surveys.push(survey);
      }

      // User answers only 2 surveys
      for (let i = 0; i < 2; i++) {
        await testPrisma.surveyResponse.create({
          data: {
            userId: user.id,
            surveyId: surveys[i].id,
            answers: { rating: 5 },
            isComplete: true,
            completedAt: new Date(),
          },
        });
      }

      const answeredSurveyIds = (
        await testPrisma.surveyResponse.findMany({
          where: { userId: user.id },
          select: { surveyId: true },
        })
      ).map((r) => r.surveyId);

      const unanswered = await testPrisma.survey.findMany({
        where: {
          status: "active",
          id: { notIn: answeredSurveyIds },
        },
      });

      expect(unanswered).toHaveLength(3);
    });
  });

  describe("Survey Deletion", () => {
    it("deletes survey", async () => {
      const survey = await testPrisma.survey.create({
        data: {
          title: "Delete Survey",
          status: "draft",
          startDate: new Date(),
        },
      });

      await testPrisma.survey.delete({
        where: { id: survey.id },
      });

      const found = await testPrisma.survey.findUnique({
        where: { id: survey.id },
      });

      expect(found).toBeNull();
    });
  });
});
