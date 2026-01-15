#!/usr/bin/env node
/**
 * Direct SQL approach - Generate SQL from Prisma and apply it
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up test database with direct SQL approach...\n');

// Load .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf-8');
const testDbUrlMatch = envContent.match(/^TEST_DATABASE_URL=(.+)$/m);

if (!testDbUrlMatch) {
  console.error('❌ TEST_DATABASE_URL not found');
  process.exit(1);
}

let testDbUrl = testDbUrlMatch[1].trim();

// Convert pooling to direct if needed
if (testDbUrl.includes(':6543/')) {
  console.log('📝 Converting pooling URL to direct connection...');
  const urlMatch = testDbUrl.match(/postgresql:\/\/([^.]+)\.([^:]+):([^@]+)@([^:]+):6543\/(.+)/);
  if (urlMatch) {
    const [, user, projectRef, password, host, database] = urlMatch;
    testDbUrl = `postgresql://${user}.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/${database}`;
    console.log(`✓ Direct URL created\n`);
  }
}

console.log(`📍 Target: ${testDbUrl.substring(0, 50)}...\n`);

// Try using Prisma's migration SQL files directly
const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');

if (fs.existsSync(migrationsPath)) {
  console.log('📂 Found migrations directory');
  console.log('💡 Suggestion: Use existing migrations with psql or pg client\n');
  console.log('Example command:');
  console.log(`  psql "${testDbUrl}" -f prisma/migrations/[migration_name]/migration.sql\n`);
} else {
  console.log('⚠️  No migrations directory found\n');
}

// Alternative: Just try to connect and create basic structure
console.log('🔄 Attempting to initialize with Prisma Generate...\n');

try {
  // First, generate the Prisma Client
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n✅ Prisma Client generated');
  console.log('\n📋 Next steps:');
  console.log('1. Manually run migrations using psql or Supabase Dashboard SQL editor');
  console.log('2. Or use: npx prisma migrate deploy --url="<TEST_DATABASE_URL>"');
  console.log('3. Or use: npx prisma db push --url="<TEST_DATABASE_URL>"\n');
} catch (error) {
  console.error('❌ Generate failed');
  process.exit(1);
}
