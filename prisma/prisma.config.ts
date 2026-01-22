import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'
import { join } from 'path'
import { existsSync } from 'fs'

// Try loading .env.prisma.tmp first (for test DB setup), then .env.local
const prismaEnvPath = join(__dirname, '..', '.env.prisma.tmp')
const localEnvPath = join(__dirname, '..', '.env.local')

if (existsSync(prismaEnvPath)) {
  config({ path: prismaEnvPath })
} else if (existsSync(localEnvPath)) {
  config({ path: localEnvPath })
}

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    // Using pooled connection since direct connection is blocked
    url: process.env.DATABASE_URL,
  },
})
