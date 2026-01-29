#!/usr/bin/env ts-node
/**
 * Sentry 연동 테스트 스크립트
 * Usage: ts-node scripts/test-sentry.ts
 *
 * 이 스크립트는 Sentry DSN이 올바르게 설정되었는지 테스트하고
 * 테스트 메시지와 에러를 Sentry 대시보드로 전송합니다.
 */

import * as Sentry from '@sentry/nextjs'
import { logger } from '../src/lib/logger'

function initializeSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!dsn) {
    console.error('❌ SENTRY_DSN not configured')
    console.error('   Set SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN environment variable')
    process.exit(1)
  }

  console.log('🔧 Initializing Sentry...')
  console.log(`   DSN: ${dsn.substring(0, 30)}...`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('')

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    beforeSend(event) {
      // Log event before sending
      console.log('📤 Sending event to Sentry:', event.event_id)
      return event
    },
  })

  console.log('✅ Sentry initialized')
  console.log('')
}

async function runTests() {
  console.log('🧪 Running Sentry tests...\n')

  // Test 1: Capture message
  console.log('Test 1: Sending test message...')
  const messageId = Sentry.captureMessage('Security cleanup: Sentry test message', 'info')
  console.log(`   ✅ Message sent (ID: ${messageId})`)
  console.log('')

  // Test 2: Capture warning
  console.log('Test 2: Sending test warning...')
  const warningId = Sentry.captureMessage('Security cleanup: Sentry test warning', 'warning')
  console.log(`   ✅ Warning sent (ID: ${warningId})`)
  console.log('')

  // Test 3: Capture error
  console.log('Test 3: Sending test error...')
  const testError = new Error('Security cleanup: Sentry test error')
  testError.name = 'SentryTestError'
  const errorId = Sentry.captureException(testError)
  console.log(`   ✅ Error sent (ID: ${errorId})`)
  console.log('')

  // Test 4: Capture error with context
  console.log('Test 4: Sending error with context...')
  Sentry.withScope((scope) => {
    scope.setTag('test', 'security-cleanup')
    scope.setContext('test_context', {
      script: 'test-sentry.ts',
      timestamp: new Date().toISOString(),
      purpose: 'verify Sentry configuration',
    })
    scope.setUser({
      id: 'test-user',
      username: 'security-test',
    })

    const contextError = new Error('Sentry test error with context')
    const contextId = Sentry.captureException(contextError)
    console.log(`   ✅ Error with context sent (ID: ${contextId})`)
  })
  console.log('')

  // Test 5: Test logger integration
  console.log('Test 5: Testing logger integration...')
  try {
    logger.info('Security cleanup test: Logger info message')
    logger.warn('Security cleanup test: Logger warning message', {
      testData: 'sample',
    })
    logger.error('Security cleanup test: Logger error message', {
      error: new Error('Test error from logger'),
    })
    console.log('   ✅ Logger messages sent')
  } catch (error) {
    console.error('   ❌ Logger test failed:', error)
  }
  console.log('')

  // Wait for events to be sent
  console.log('⏳ Flushing Sentry events...')
  await Sentry.flush(2000)
  console.log('✅ Events flushed')
  console.log('')
}

async function main() {
  console.log('════════════════════════════════════════════════════════════')
  console.log('🔒 Sentry Configuration Test')
  console.log('════════════════════════════════════════════════════════════')
  console.log('')

  try {
    initializeSentry()
    await runTests()

    console.log('════════════════════════════════════════════════════════════')
    console.log('✅ All Sentry tests completed successfully!')
    console.log('════════════════════════════════════════════════════════════')
    console.log('')
    console.log('Next steps:')
    console.log('1. Check Sentry dashboard for test events')
    console.log('2. Verify events appear in Issues tab')
    console.log('3. Check that tags and context are properly set')
    console.log('4. Confirm email alerts are working (if configured)')
    console.log('')
    console.log('Sentry Dashboard:')
    console.log('https://sentry.io/organizations/[your-org]/issues/')
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('❌ Sentry test failed:', error)
    console.error('')
    process.exit(1)
  }
}

main()
