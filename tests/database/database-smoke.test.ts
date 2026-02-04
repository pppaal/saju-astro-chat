// tests/database/database-smoke.test.ts
/**
 * Smoke tests for database configuration and models
 * Validates Prisma schema and database utilities
 */
import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Database Smoke Tests', () => {
  describe('Prisma Schema (1)', () => {
    it('should have prisma schema file', () => {
      const filePath = resolve(process.cwd(), 'prisma/schema.prisma')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Prisma Configuration (1)', () => {
    it('should have prisma config file', () => {
      const filePath = resolve(process.cwd(), 'prisma.config.ts')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('Prisma Client (1)', () => {
    it('should import prisma client module', async () => {
      const prisma = await import('@/lib/db/prisma')

      expect(prisma).toBeDefined()
      expect(Object.keys(prisma).length).toBeGreaterThan(0)
    })
  })

  describe('Database Summary', () => {
    it('should have all database essentials', () => {
      const files = ['prisma/schema.prisma', 'prisma.config.ts']

      files.forEach((file) => {
        const filePath = resolve(process.cwd(), file)
        expect(existsSync(filePath)).toBe(true)
      })

      expect(files.length).toBe(2)
    })
  })
})
