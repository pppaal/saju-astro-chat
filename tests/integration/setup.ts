/**
 * Integration Test Setup
 * - Uses real database connection
 * - Provides test data cleanup utilities
 * - NO mocking of Prisma
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env files
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

process.env.NODE_ENV = process.env.NODE_ENV || "test";
if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
}

// Use test database URL from environment
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL or DATABASE_URL must be set for integration tests"
  );
}

// Create separate Prisma client for integration tests
const pool = new Pool({
  connectionString: TEST_DATABASE_URL,
  connectionTimeoutMillis: Number(process.env.TEST_DB_CONNECT_TIMEOUT_MS || 3000),
});
const adapter = new PrismaPg(pool);

export const testPrisma = new PrismaClient({ adapter });

let testDbAvailable: boolean | null = null;

export async function checkTestDbConnection() {
  if (testDbAvailable !== null) return testDbAvailable;
  try {
    await pool.query("SELECT 1");
    testDbAvailable = true;
  } catch (error) {
    testDbAvailable = false;
    if (process.env.CI) {
      throw error;
    }
    console.warn(
      "Integration tests skipped: test database is unavailable. Start Postgres or set a reachable TEST_DATABASE_URL.",
      error
    );
  }
  return testDbAvailable;
}

// Test user data generator
export function generateTestUser(overrides: Record<string, unknown> = {}) {
  const id = `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    email: `${id}@test.example.com`,
    name: `Test User ${id.slice(-6)}`,
    ...overrides,
  };
}

// Cleanup utilities
export async function cleanupTestUser(userId: string) {
  try {
    // Delete in correct order to respect foreign key constraints
    await testPrisma.matchMessage.deleteMany({ where: { senderId: userId } });
    await testPrisma.pushSubscription.deleteMany({ where: { userId } });
    await testPrisma.tarotReading.deleteMany({ where: { userId } });
    await testPrisma.personalityResult.deleteMany({ where: { userId } });
    await testPrisma.savedCalendarDate.deleteMany({ where: { userId } });
    await testPrisma.referralReward.deleteMany({ where: { userId } });
    await testPrisma.bonusCreditPurchase.deleteMany({ where: { userId } });
    await testPrisma.counselorChatSession.deleteMany({ where: { userId } });
    await testPrisma.premiumContentAccess.deleteMany({ where: { userId } });
    await testPrisma.userCredits.deleteMany({ where: { userId } });
    await testPrisma.subscription.deleteMany({ where: { userId } });
    await testPrisma.consultationHistory.deleteMany({ where: { userId } });
    await testPrisma.personaMemory.deleteMany({ where: { userId } });
    await testPrisma.userPreferences.deleteMany({ where: { userId } });
    await testPrisma.userInteraction.deleteMany({ where: { userId } });
    await testPrisma.dailyFortune.deleteMany({ where: { userId } });
    await testPrisma.destinySnapshot.deleteMany({ where: { userId } });
    await testPrisma.fortune.deleteMany({ where: { userId } });
    await testPrisma.reading.deleteMany({ where: { userId } });
    await testPrisma.session.deleteMany({ where: { userId } });
    await testPrisma.account.deleteMany({ where: { userId } });

    // Handle MatchProfile and related tables
    const matchProfile = await testPrisma.matchProfile.findUnique({
      where: { userId },
    });
    if (matchProfile) {
      await testPrisma.matchSwipe.deleteMany({
        where: { OR: [{ swiperId: matchProfile.id }, { targetId: matchProfile.id }] },
      });
      await testPrisma.matchConnection.deleteMany({
        where: { OR: [{ user1Id: matchProfile.id }, { user2Id: matchProfile.id }] },
      });
      await testPrisma.matchProfile.delete({ where: { userId } });
    }

    // Finally delete user
    await testPrisma.user.delete({ where: { id: userId } });
  } catch (error) {
    // User might not exist or already deleted
    console.warn(`Cleanup warning for user ${userId}:`, error);
  }
}

// Cleanup all test users created in this session
const createdTestUserIds: string[] = [];

export function trackTestUser(userId: string) {
  createdTestUserIds.push(userId);
}

export async function cleanupAllTestUsers() {
  for (const userId of createdTestUserIds) {
    await cleanupTestUser(userId);
  }
  createdTestUserIds.length = 0;
}

// Connection management
export async function connectTestDb() {
  const available = await checkTestDbConnection();
  if (!available) return;
  await testPrisma.$connect();
}

export async function disconnectTestDb() {
  const available = testDbAvailable !== false;
  if (available) {
    await testPrisma.$disconnect();
  }
  await pool.end();
}

// Test data factory functions
export async function createTestUserInDb(
  overrides: Record<string, unknown> = {}
) {
  const userData = generateTestUser(overrides);
  const { id, email, name, ...rest } = userData;
  const user = await testPrisma.user.create({
    data: {
      id,
      email,
      name,
      ...rest,
    },
  });
  trackTestUser(user.id);
  return user;
}

export async function createTestSubscription(
  userId: string,
  plan: string = "starter",
  status: string = "active"
) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return testPrisma.subscription.create({
    data: {
      userId,
      status,
      plan,
      billingCycle: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      stripeCustomerId: `cus_test_${Date.now()}`,
      stripeSubscriptionId: `sub_test_${Date.now()}`,
    },
  });
}

export async function createTestUserCredits(
  userId: string,
  plan: string = "free"
) {
  const planConfigs: Record<string, { monthly: number; compat: number; followUp: number; retention: number }> = {
    free: { monthly: 7, compat: 0, followUp: 0, retention: 7 },
    starter: { monthly: 25, compat: 2, followUp: 2, retention: 30 },
    pro: { monthly: 80, compat: 5, followUp: 5, retention: 90 },
    premium: { monthly: 150, compat: 10, followUp: 10, retention: 365 },
  };

  const config = planConfigs[plan] || planConfigs.free;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return testPrisma.userCredits.create({
    data: {
      userId,
      plan,
      monthlyCredits: config.monthly,
      usedCredits: 0,
      bonusCredits: 0,
      compatibilityUsed: 0,
      followUpUsed: 0,
      compatibilityLimit: config.compat,
      followUpLimit: config.followUp,
      historyRetention: config.retention,
      periodStart: now,
      periodEnd,
    },
  });
}
