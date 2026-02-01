#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function loadEnv(file) {
  if (fs.existsSync(file)) {
    require('dotenv').config({ path: file, override: true });
  }
}

loadEnv(path.resolve(process.cwd(), '.env'));
loadEnv(path.resolve(process.cwd(), '.env.local'));

const { PrismaClient } = require('@prisma/client');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Configure .env or .env.local.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const whereClause = {
      OR: [
        { access_token: { not: null } },
        { refresh_token: { not: null } },
        { id_token: { not: null } },
        { token_type: { not: null } },
        { scope: { not: null } },
        { session_state: { not: null } },
      ],
    };

    const count = await prisma.account.count({ where: whereClause });

    if (dryRun) {
      console.log(`Accounts with stored OAuth tokens: ${count}`);
      console.log('Dry run only. No changes made.');
      return;
    }

    const result = await prisma.account.updateMany({
      data: {
        access_token: null,
        refresh_token: null,
        id_token: null,
        token_type: null,
        scope: null,
        session_state: null,
      },
    });

    console.log(`Cleared OAuth tokens for ${result.count} account(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to clear OAuth tokens.');
  console.error(error?.message || String(error));
  process.exit(1);
});
