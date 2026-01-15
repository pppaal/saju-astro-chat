#!/usr/bin/env node
/**
 * Migrate Test Database Schema
 * This script loads TEST_DATABASE_URL from .env.local and runs Prisma migrations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up test database schema...\n');

// Load .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('❌ Error: .env.local not found');
  console.error('Please create .env.local with TEST_DATABASE_URL\n');
  process.exit(1);
}

// Parse .env.local
const envContent = fs.readFileSync(envLocalPath, 'utf-8');
const testDbUrlMatch = envContent.match(/^TEST_DATABASE_URL=(.+)$/m);

if (!testDbUrlMatch) {
  console.error('❌ Error: TEST_DATABASE_URL not found in .env.local');
  console.error('Please add: TEST_DATABASE_URL=postgresql://...\n');
  process.exit(1);
}

const testDbUrl = testDbUrlMatch[1].trim();
console.log('📂 Loaded TEST_DATABASE_URL from .env.local');
console.log(`📍 Database: ${testDbUrl.substring(0, 50)}...\n`);

// Set DATABASE_URL temporarily for migration
process.env.DATABASE_URL = testDbUrl;

console.log('📦 Running Prisma migrations...\n');

try {
  // Run prisma migrate deploy
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDbUrl },
    cwd: path.join(__dirname, '..')
  });

  console.log('\n✅ Test database schema is ready!');
  console.log('You can now run integration tests with:');
  console.log('  npm run test:integration\n');
} catch (error) {
  console.error('\n❌ Migration failed!');
  console.error('Error:', error.message);
  process.exit(1);
}
