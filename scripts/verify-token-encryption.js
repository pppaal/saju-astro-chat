#!/usr/bin/env node
/**
 * 토큰 암호화 키가 설정되어 있는지 검증
 * Usage: node scripts/verify-token-encryption.js
 *
 * Exit codes:
 *   0 - Success
 *   1 - TOKEN_ENCRYPTION_KEY not set or invalid
 */

// Load environment variables
require('dotenv').config();

const chalkImport = require('chalk');
const chalkResolved = chalkImport.default || chalkImport;
const chalk = {
  red: typeof chalkResolved.red === 'function' ? chalkResolved.red.bind(chalkResolved) : (value) => value,
  yellow: typeof chalkResolved.yellow === 'function' ? chalkResolved.yellow.bind(chalkResolved) : (value) => value,
  gray: typeof chalkResolved.gray === 'function' ? chalkResolved.gray.bind(chalkResolved) : (value) => value,
  green: typeof chalkResolved.green === 'function' ? chalkResolved.green.bind(chalkResolved) : (value) => value,
  blue: typeof chalkResolved.blue === 'function' ? chalkResolved.blue.bind(chalkResolved) : (value) => value,
};

function main() {
  console.log('🔐 Verifying TOKEN_ENCRYPTION_KEY configuration...\n');

  const key = process.env.TOKEN_ENCRYPTION_KEY;

  // Check if key exists
  if (!key) {
    console.error(chalk.red('❌ TOKEN_ENCRYPTION_KEY is not set!'));
    console.error(chalk.yellow('\nGenerate a new key:'));
    console.error(chalk.gray('  openssl rand -base64 32'));
    console.error(chalk.yellow('\nOr use the secret generation script:'));
    console.error(chalk.gray('  bash .security-cleanup/generate-new-secrets.sh'));
    console.error('');
    process.exit(1);
  }

  // Check key length
  if (key.length < 32) {
    console.error(chalk.red('❌ TOKEN_ENCRYPTION_KEY must be at least 32 characters'));
    console.error(chalk.yellow(`   Current length: ${key.length} characters`));
    console.error(chalk.yellow('\nGenerate a longer key:'));
    console.error(chalk.gray('  openssl rand -base64 32'));
    console.error('');
    process.exit(1);
  }

  // Check if key is placeholder
  const placeholderPatterns = [
    'replace_me',
    'placeholder',
    'changeme',
    'your-key-here',
    '32_byte',
    'ci-placeholder',
  ];

  const lowerKey = key.toLowerCase();
  const isPlaceholder = placeholderPatterns.some((pattern) =>
    lowerKey.includes(pattern)
  );

  if (isPlaceholder) {
    console.error(chalk.red('❌ TOKEN_ENCRYPTION_KEY appears to be a placeholder'));
    console.error(chalk.yellow('   Replace with a real encryption key'));
    console.error('');
    process.exit(1);
  }

  // Warn if key looks weak (all same character, sequential, etc.)
  const uniqueChars = new Set(key).size;
  if (uniqueChars < 10) {
    console.warn(chalk.yellow('⚠️  Warning: TOKEN_ENCRYPTION_KEY may be weak'));
    console.warn(
      chalk.yellow(`   Only ${uniqueChars} unique characters detected`)
    );
    console.warn(
      chalk.yellow('   Consider generating a more random key with OpenSSL')
    );
    console.warn('');
  }

  // Success
  console.log(chalk.green('✅ TOKEN_ENCRYPTION_KEY is properly configured'));
  console.log(chalk.gray(`   Length: ${key.length} characters`));
  console.log(chalk.gray(`   Unique characters: ${uniqueChars}`));
  console.log(chalk.gray(`   First 4 chars: ${key.substring(0, 4)}...`));
  console.log(chalk.gray(`   Last 4 chars: ...${key.substring(key.length - 4)}`));
  console.log('');

  // Additional checks
  console.log(chalk.blue('ℹ️  Additional information:'));

  // Check if tokenCrypto module exists
  try {
    const tokenCrypto = require('../src/lib/security/tokenCrypto');
    console.log(
      chalk.green('   ✅ tokenCrypto module found and loaded successfully')
    );

    // Check if encryption key is actually being used
    if (typeof tokenCrypto.hasTokenEncryptionKey === 'function') {
      const hasKey = tokenCrypto.hasTokenEncryptionKey();
      if (hasKey) {
        console.log(chalk.green('   ✅ tokenCrypto confirms encryption key is available'));
      } else {
        console.log(chalk.yellow('   ⚠️  tokenCrypto reports no encryption key'));
      }
    }
  } catch (error) {
    console.log(
      chalk.yellow(
        '   ⚠️  Could not load tokenCrypto module (may be in TypeScript)'
      )
    );
    console.log(chalk.gray(`      Error: ${error.message}`));
  }

  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(chalk.gray(`   Environment: ${nodeEnv}`));

  if (nodeEnv === 'production') {
    console.log(
      chalk.green('   ✅ Running in production mode - encryption is critical')
    );
  } else {
    console.log(
      chalk.yellow(
        '   ℹ️  Running in non-production mode - encryption recommended but not critical'
      )
    );
  }

  console.log('');
  console.log(chalk.green('✅ Token encryption validation passed'));
  process.exit(0);
}

main();
