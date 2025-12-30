// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { encryptToken } from '@/lib/security/tokenCrypto';

// HMR/다중 import 방지(개발 환경)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

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
  const basePrisma = new PrismaClient({
    // 로그가 필요하면 켜기
    // log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Prisma 6.x: use Client Extensions instead of deprecated $use middleware
  // Token encryption is handled at the application layer when needed
  // The extension API has type compatibility issues with groupBy, so we skip it
  // and rely on explicit encryption calls where needed

  return basePrisma;
}

// 연결 끊김 시 재연결을 위한 함수
export async function ensureDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.warn('[prisma] Connection lost, reconnecting...');
    await prisma.$disconnect();
    await prisma.$connect();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper for encrypting tokens before Account operations
export const encryptAccountData = encryptAccountTokens;
