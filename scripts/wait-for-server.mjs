#!/usr/bin/env node
/**
 * Wait for server to be ready before running E2E tests
 * Polls the server until it responds or timeout is reached
 */

import http from 'http';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const MAX_ATTEMPTS = 60; // 60 attempts
const RETRY_DELAY = 2000; // 2 seconds between attempts
const TIMEOUT = MAX_ATTEMPTS * RETRY_DELAY; // Total: 2 minutes

const url = new URL(BASE_URL);

console.log(`⏳ Waiting for server at ${BASE_URL}...`);
console.log(`   Max wait time: ${TIMEOUT / 1000} seconds\n`);

async function checkServer(attempt = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: '/',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 500) {
        console.log(`✅ Server is ready! (Status: ${res.statusCode})`);
        resolve(true);
      } else {
        reject(new Error(`Unexpected status code: ${res.statusCode}`));
      }
    });

    req.on('error', (_err) => {
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`   Attempt ${attempt}/${MAX_ATTEMPTS} - Waiting...\r`);
        setTimeout(() => {
          checkServer(attempt + 1).then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        console.error(`\n❌ Server did not respond after ${TIMEOUT / 1000} seconds`);
        reject(new Error('Server timeout'));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`   Attempt ${attempt}/${MAX_ATTEMPTS} - Waiting...\r`);
        setTimeout(() => {
          checkServer(attempt + 1).then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        console.error(`\n❌ Server did not respond after ${TIMEOUT / 1000} seconds`);
        reject(new Error('Server timeout'));
      }
    });

    req.end();
  });
}

checkServer()
  .then(() => {
    console.log('✅ Server health check passed!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Server health check failed:', err.message);
    process.exit(1);
  });
