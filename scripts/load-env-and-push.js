#!/usr/bin/env node
/**
 * Load .env.local explicitly and run Prisma db push
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

// Get TEST_DATABASE_URL
let testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.error('❌ TEST_DATABASE_URL not found');
  process.exit(1);
}

// Convert pooling to direct URL if needed
if (testDbUrl.includes(':6543/')) {
  const urlMatch = testDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):6543\/(.+)/);
  if (urlMatch) {
    const [, user, password, host, database] = urlMatch;
    const projectRef = host.replace('.pooler.supabase.com', '').replace('aws-1-ap-southeast-1.pooler', '');
    testDbUrl = `postgresql://${user}:${password}@db.${projectRef}.supabase.co:5432/${database}`;
  }
}

console.log(`📍 Using: ${testDbUrl.substring(0, 50)}...`);

// Set DATABASE_URL for Prisma
process.env.DATABASE_URL = testDbUrl;
process.env.TEST_DATABASE_URL = testDbUrl;

// Create a temporary .env file for Prisma
const tempEnvPath = path.join(__dirname, '..', '.env.prisma.tmp');
fs.writeFileSync(tempEnvPath, `DATABASE_URL="${testDbUrl}"\nTEST_DATABASE_URL="${testDbUrl}"\n`);

console.log('📦 Running prisma db push...\n');

try {
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl,
      DOTENV_CONFIG_PATH: tempEnvPath
    }
  });

  // Clean up
  fs.unlinkSync(tempEnvPath);

  console.log('\n✅ Schema pushed successfully!');
  console.log('Run: npm run test:integration\n');
} catch (error) {
  // Clean up on error
  if (fs.existsSync(tempEnvPath)) {
    fs.unlinkSync(tempEnvPath);
  }
  console.error('\n❌ Failed');
  process.exit(1);
}
