// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

// HMR/다중 import 방지(개발 환경)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 로그가 필요하면 켜기
    // log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;