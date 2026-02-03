/**
 * Common database (Prisma) mocks for testing
 */

import { vi } from 'vitest'

/**
 * Mock Prisma client with common operations
 */
export function mockPrisma() {
  const mockCreate = vi.fn().mockResolvedValue({ id: 'mock-id' })
  const mockFindUnique = vi.fn().mockResolvedValue(null)
  const mockFindMany = vi.fn().mockResolvedValue([])
  const mockUpdate = vi.fn().mockResolvedValue({ id: 'mock-id' })
  const mockDelete = vi.fn().mockResolvedValue({ id: 'mock-id' })

  vi.mock('@/lib/db/prisma', () => ({
    prisma: {
      reading: {
        create: mockCreate,
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        update: mockUpdate,
        delete: mockDelete,
      },
      user: {
        create: mockCreate,
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        update: mockUpdate,
        delete: mockDelete,
      },
      tarotReading: {
        create: mockCreate,
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        update: mockUpdate,
        delete: mockDelete,
      },
      chatSession: {
        create: mockCreate,
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        update: mockUpdate,
        delete: mockDelete,
      },
      credit: {
        create: mockCreate,
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        update: mockUpdate,
        delete: mockDelete,
      },
    },
  }))

  return {
    reading: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
    user: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
    tarotReading: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
    chatSession: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
    credit: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      delete: mockDelete,
    },
  }
}

/**
 * Mock Prisma with specific data
 */
export function mockPrismaWithData<T>(modelName: string, data: T | T[]) {
  const dataArray = Array.isArray(data) ? data : [data]

  vi.mock('@/lib/db/prisma', () => ({
    prisma: {
      [modelName]: {
        create: vi.fn().mockResolvedValue(dataArray[0]),
        findUnique: vi.fn().mockResolvedValue(dataArray[0]),
        findMany: vi.fn().mockResolvedValue(dataArray),
        update: vi.fn().mockResolvedValue(dataArray[0]),
        delete: vi.fn().mockResolvedValue(dataArray[0]),
      },
    },
  }))

  return {
    [modelName]: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }
}
