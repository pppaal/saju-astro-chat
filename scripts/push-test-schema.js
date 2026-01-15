#!/usr/bin/env node
/**
 * Push Schema to Test Database
 * Uses TEST_DATABASE_URL from .env.local and runs prisma db push
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Pushing schema to test database...\n');

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

let testDbUrl = testDbUrlMatch[1].trim();

// Convert pooling URL (port 6543) to direct URL (port 5432) if needed
if (testDbUrl.includes(':6543/')) {
  console.log('⚠️  Detected connection pooling URL (port 6543)');
  console.log('📝 Converting to direct connection URL (port 5432)...');

  // Extract components
  const urlMatch = testDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):6543\/(.+)/);
  if (urlMatch) {
    const [, user, password, host, database] = urlMatch;
    // Convert pooler host to direct host
    const directHost = host.replace('.pooler.supabase.com', '').replace('aws-1-ap-southeast-1.pooler', 'db');
    testDbUrl = `postgresql://${user}:${password}@db.${directHost}.supabase.co:5432/${database}`;
    console.log(`📍 Direct URL: ${testDbUrl.substring(0, 50)}...\n`);
  }
} else {
  console.log('📂 Loaded TEST_DATABASE_URL from .env.local');
  console.log(`📍 Database: ${testDbUrl.substring(0, 50)}...\n`);
}

// Set both DATABASE_URL and TEST_DATABASE_URL
process.env.DATABASE_URL = testDbUrl;
process.env.TEST_DATABASE_URL = testDbUrl;

console.log('📦 Running prisma db push...\n');

try {
  // Run prisma db push
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl
    },
    cwd: path.join(__dirname, '..')
  });

  console.log('\n✅ Test database schema is ready!');
  console.log('You can now run integration tests with:');
  console.log('  npm run test:integration\n');
} catch (error) {
  console.error('\n❌ Schema push failed!');
  console.error('Error:', error.message);
  console.error('\n💡 Troubleshooting:');
  console.error('1. Make sure TEST_DATABASE_URL uses Direct connection (port 5432)');
  console.error('2. Check if the database server is accessible');
  console.error('3. Verify credentials are correct\n');
  process.exit(1);
}
