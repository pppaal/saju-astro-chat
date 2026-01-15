#!/usr/bin/env node
/**
 * Apply complete-schema.sql to test database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  console.log('🔧 Applying schema to test database...\n');

  // Load .env.local
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const testDbUrlMatch = envContent.match(/^TEST_DATABASE_URL=(.+)$/m);

  if (!testDbUrlMatch) {
    console.error('❌ TEST_DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  let connectionString = testDbUrlMatch[1].trim();

  // Convert pooling URL to direct connection URL
  if (connectionString.includes(':6543/')) {
    console.log('📝 Converting to direct connection URL...');

    // Extract components from pooling URL
    // Format: postgresql://postgres.PROJECT:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
    const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):6543\/(.+)/);
    if (match) {
      const [, user, password, host, database] = match;

      // Extract project ref from user (e.g., "postgres.tyxvaepcgufawdbooaio" -> "tyxvaepcgufawdbooaio")
      const projectRef = user.includes('.') ? user.split('.')[1] : user;

      // Build direct connection URL
      // Format: postgresql://postgres.PROJECT:PASSWORD@db.PROJECT.supabase.co:5432/postgres
      connectionString = `postgresql://${user}:${password}@db.${projectRef}.supabase.co:5432/${database}`;
      console.log(`✓ Using project: ${projectRef}`);
      console.log(`✓ Direct connection: port 5432\n`);
    }
  }

  console.log('📂 Reading complete-schema.sql...');
  const schemaPath = path.join(__dirname, '..', 'complete-schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ complete-schema.sql not found');
    console.error('Please run the schema generation first');
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  console.log(`✓ Loaded ${schemaSql.split('\n').length} lines of SQL\n`);

  console.log('🔌 Connecting to database...');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected\n');

    console.log('📦 Executing schema...');
    await client.query(schemaSql);
    console.log('✓ Schema applied successfully\n');

    // Verify tables were created
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('📋 Created tables:');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));

    console.log('\n✅ Test database is ready!');
    console.log('Run integration tests with:');
    console.log('  npm run test:integration\n');

  } catch (error) {
    console.error('\n❌ Error applying schema:');
    console.error(error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Please check:');
      console.error('1. Is the database server running?');
      console.error('2. Is the connection string correct?');
      console.error('3. Are you using Direct connection (port 5432)?');
    } else if (error.code === '42P07') {
      console.error('\n💡 Tables already exist. This is OK - schema is already set up!');
      console.log('\n✅ You can proceed with:');
      console.log('  npm run test:integration\n');
    }

    process.exit(error.code === '42P07' ? 0 : 1);
  } finally {
    await client.end();
  }
}

applySchema().catch(console.error);
