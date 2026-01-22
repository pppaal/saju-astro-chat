// src/lib/db/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { encryptToken } from '@/lib/security/tokenCrypto';
import { logger } from '@/lib/logger';

// Re-export Prisma namespace for type usage
export { Prisma };

// HMR/다중 import 방지(개발 환경)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool };

const encryptAccountTokens = <T>(data: T): T => {
  if (!data || typeof data !== 'object') return data;
  const fields = ['access_token', 'refresh_token', 'id_token'] as const;
  const result = { ...data } as Record<string, unknown>;
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      result[field] = encryptToken(result[field] as string);
    }
  }
  return result as T;
};

function createPrismaClient(): PrismaClient {
  // Prisma 7.x: Use adapter for database connection
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create connection pool
  const pool = globalForPrisma.pool ?? new Pool({ connectionString });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }

  // Create adapter
  const adapter = new PrismaPg(pool);

  const basePrisma = new PrismaClient({
    adapter,
    // 로그가 필요하면 켜기
    // log: ['query', 'error', 'warn'],
  });

  return basePrisma;
}

// 연결 끊김 시 재연결을 위한 함수
export async function ensureDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.warn('[prisma] Connection lost, reconnecting...');
    await prisma.$disconnect();
    await prisma.$connect();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper for encrypting tokens before Account operations
export const encryptAccountData = encryptAccountTokens;
