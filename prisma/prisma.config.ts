import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Manually load .env.local
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(`DATABASE_URL not found. Checked: ${envPath}`)
}

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
