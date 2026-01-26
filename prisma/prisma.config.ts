import { defineConfig } from '@prisma/client/config'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
const loadEnv = () => {
  // Try to load dotenv
  try {
    const dotenv = require('dotenv')

    // Load .env first (base)
    const envPath = resolve(process.cwd(), '.env')
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath })
    }

    // Then load .env.local (override)
    const envLocalPath = resolve(process.cwd(), '.env.local')
    if (existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true })
    }
  } catch {
    // dotenv not available, use process.env directly
  }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL
const directUrl = process.env.DIRECT_DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL not found in environment variables')
}

export default defineConfig({
  datasources: {
    db: {
      url: databaseUrl,
      directUrl: directUrl,
    },
  },
})
