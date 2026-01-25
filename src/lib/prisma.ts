// src/lib/prisma.ts
// Prisma client stub - implement with actual Prisma client when database is configured

import { logger } from "./logger";

// Stub types for share functionality
interface SharedResult {
  id: string;
  resultType: string;
  title: string;
  description: string | null;
  resultData: unknown;
  imageUrl: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  viewCount: number;
}

interface PrismaStub {
  sharedResult: {
    findUnique: (args: { where: { id: string } }) => Promise<SharedResult | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<SharedResult>;
    create: (args: { data: Record<string, unknown> }) => Promise<SharedResult>;
  };
}

// Stub implementation - replace with actual Prisma client when needed
const prismaStub: PrismaStub = {
  sharedResult: {
    async findUnique({ where }) {
      logger.warn("[prisma stub] findUnique called", { where });
      return null;
    },
    async update({ where, data }) {
      logger.warn("[prisma stub] update called", { where, data });
      return {
        id: where.id,
        resultType: "stub",
        title: "Stub",
        description: null,
        resultData: {},
        imageUrl: null,
        createdAt: new Date(),
        expiresAt: null,
        viewCount: 0,
      };
    },
    async create({ data }) {
      logger.warn("[prisma stub] create called", { data });
      return {
        id: "stub-id",
        resultType: String(data.resultType || "stub"),
        title: String(data.title || "Stub"),
        description: null,
        resultData: data.resultData || {},
        imageUrl: null,
        createdAt: new Date(),
        expiresAt: null,
        viewCount: 0,
      };
    },
  },
};

export const prisma = prismaStub;
