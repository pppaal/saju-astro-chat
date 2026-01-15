#!/usr/bin/env node

/**
 * Pre-flight check script for performance tests
 * Verifies that the server is running before executing tests
 */

const http = require('http');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const CHECK_URL = new URL('/api/auth/session', API_BASE);

console.log('\n' + '='.repeat(60));
console.log('Performance Test Pre-Flight Check');
console.log('='.repeat(60));
console.log(`\nChecking server at: ${API_BASE}\n`);

function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.get(CHECK_URL, (res) => {
      if (res.statusCode < 500) {
        resolve(true);
      } else {
        reject(new Error(`Server returned status ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

async function main() {
  try {
    await checkServer();
    console.log('✅ Server is ready!');
    console.log('\nYou can now run performance tests:');
    console.log('  npm run test:performance');
    console.log('  npm run test:load:basic\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Server is not ready!\n');
    console.error(`Error: ${error.message}\n`);
    console.error('Please start the development server first:\n');
    console.error('  Terminal 1: npm run dev');
    console.error('  Terminal 2: npm run test:performance\n');
    console.error('Or set API_BASE_URL environment variable:');
    console.error('  API_BASE_URL=https://your-server.com npm run test:performance\n');
    process.exit(1);
  }
}

main();
