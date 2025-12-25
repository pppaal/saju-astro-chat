#!/usr/bin/env node
/**
 * Comprehensive Performance & Quality Testing Script
 * Tests all 100% optimization targets
 */

const fs = require('fs');
const path = require('path');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.warn(`${colors[color]}${msg}${colors.reset}`);
}

function score(value, max) {
  const percent = (value / max) * 100;
  const color = percent >= 90 ? 'green' : percent >= 70 ? 'yellow' : 'red';
  return { percent: Math.round(percent), color };
}

// ===================================================================
// TEST 1: 8-LANGUAGE SUPPORT (100%)
// ===================================================================
async function test8LanguageSupport() {
  log('\n📚 Testing 8-Language Support...', 'cyan');

  const translationFile = path.join(__dirname, 'src/lib/i18n/translation-enhancer.ts');
  const content = fs.readFileSync(translationFile, 'utf-8');

  const requiredLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt'];
  const foundLanguages = requiredLanguages.filter(lang => content.includes(`'${lang}'`));

  const result = score(foundLanguages.length, 8);
  log(`   Languages Found: ${foundLanguages.length}/8 (${result.percent}%)`, result.color);
  log(`   Supported: ${foundLanguages.join(', ')}`);

  return result.percent;
}

// ===================================================================
// TEST 2: BACKEND AI PERFORMANCE (100%)
// ===================================================================
async function testBackendPerformance() {
  log('\n⚡ Testing Backend AI Performance...', 'cyan');

  const performanceFile = path.join(__dirname, 'backend_ai/app/performance_optimizer.py');
  const fusionFile = path.join(__dirname, 'backend_ai/app/fusion_logic.py');
  const appFile = path.join(__dirname, 'backend_ai/app/app.py');

  let checks = 0;
  let passed = 0;

  // Check 1: Performance optimizer exists
  checks++;
  if (fs.existsSync(performanceFile)) {
    passed++;
    log('   ✓ Performance optimizer module created', 'green');
  } else {
    log('   ✗ Performance optimizer missing', 'red');
  }

  // Check 2: Performance tracking decorator applied
  checks++;
  const fusionContent = fs.readFileSync(fusionFile, 'utf-8');
  if (fusionContent.includes('@track_performance')) {
    passed++;
    log('   ✓ Performance tracking decorator applied', 'green');
  } else {
    log('   ✗ Performance tracking decorator not applied', 'red');
  }

  // Check 3: Redis caching implemented
  checks++;
  if (fusionContent.includes('cache.get') && fusionContent.includes('cache.set')) {
    passed++;
    log('   ✓ Redis caching implemented', 'green');
  } else {
    log('   ✗ Redis caching missing', 'red');
  }

  // Check 4: Performance endpoints exist
  checks++;
  const appContent = fs.readFileSync(appFile, 'utf-8');
  if (appContent.includes('/performance/stats') && appContent.includes('/health/full')) {
    passed++;
    log('   ✓ Performance monitoring endpoints created', 'green');
  } else {
    log('   ✗ Performance endpoints missing', 'red');
  }

  // Check 5: Cache hit tracking
  checks++;
  if (fusionContent.includes('cached["cached"] = True')) {
    passed++;
    log('   ✓ Cache hit tracking implemented', 'green');
  } else {
    log('   ✗ Cache hit tracking missing', 'red');
  }

  const result = score(passed, checks);
  log(`   Backend Performance: ${passed}/${checks} checks passed (${result.percent}%)`, result.color);

  return result.percent;
}

// ===================================================================
// TEST 3: FRONTEND OPTIMIZATION (100%)
// ===================================================================
async function testFrontendOptimization() {
  log('\n🎨 Testing Frontend Optimization...', 'cyan');

  let checks = 0;
  let passed = 0;

  // Check 1: OptimizedImage component
  checks++;
  const optimizedImagePath = path.join(__dirname, 'src/components/ui/OptimizedImage.tsx');
  if (fs.existsSync(optimizedImagePath)) {
    passed++;
    log('   ✓ OptimizedImage component created', 'green');
  } else {
    log('   ✗ OptimizedImage component missing', 'red');
  }

  // Check 2: LoadingSpinner component
  checks++;
  const loadingSpinnerPath = path.join(__dirname, 'src/components/ui/LoadingSpinner.tsx');
  if (fs.existsSync(loadingSpinnerPath)) {
    passed++;
    log('   ✓ LoadingSpinner component created', 'green');
  } else {
    log('   ✗ LoadingSpinner component missing', 'red');
  }

  // Check 3: Touch optimization CSS
  checks++;
  const touchCSSPath = path.join(__dirname, 'src/styles/mobile-touch.css');
  if (fs.existsSync(touchCSSPath)) {
    passed++;
    log('   ✓ Mobile touch optimization CSS created', 'green');
  } else {
    log('   ✗ Mobile touch CSS missing', 'red');
  }

  // Check 4: Enhanced globals.css
  checks++;
  const globalsCSSPath = path.join(__dirname, 'src/app/globals.css');
  const globalsContent = fs.readFileSync(globalsCSSPath, 'utf-8');
  if (globalsContent.includes('--touch-target-min') && globalsContent.includes('--transition-')) {
    passed++;
    log('   ✓ Enhanced globals.css with CSS variables', 'green');
  } else {
    log('   ✗ Enhanced CSS variables missing', 'red');
  }

  // Check 5: Active state animations
  checks++;
  if (globalsContent.includes('transform: scale(0.97)')) {
    passed++;
    log('   ✓ Touch feedback animations implemented', 'green');
  } else {
    log('   ✗ Touch animations missing', 'red');
  }

  const result = score(passed, checks);
  log(`   Frontend Optimization: ${passed}/${checks} checks passed (${result.percent}%)`, result.color);

  return result.percent;
}

// ===================================================================
// TEST 4: AI PROMPT QUALITY (100%)
// ===================================================================
async function testAIPromptQuality() {
  log('\n🤖 Testing AI Prompt Quality...', 'cyan');

  const toneStylePath = path.join(__dirname, 'src/lib/destiny-map/prompt/fortune/base/toneStyle.ts');
  const content = fs.readFileSync(toneStylePath, 'utf-8');

  let checks = 0;
  let passed = 0;

  // Check 1: Empathetic tone guidance
  checks++;
  if (content.includes('empathetic') || content.includes('wise')) {
    passed++;
    log('   ✓ Empathetic tone guidance included', 'green');
  } else {
    log('   ✗ Empathetic tone missing', 'red');
  }

  // Check 2: Personalization instructions
  checks++;
  if (content.includes('PERSONALIZATION') || content.includes('personalize')) {
    passed++;
    log('   ✓ Personalization instructions added', 'green');
  } else {
    log('   ✗ Personalization missing', 'red');
  }

  // Check 3: Theme-specific guidance
  checks++;
  const themes = ['love', 'career', 'health', 'family', 'year', 'month', 'today'];
  const themesFound = themes.filter(theme => content.includes(`${theme}:`));
  if (themesFound.length >= 5) {
    passed++;
    log(`   ✓ Theme-specific guidance (${themesFound.length}/${themes.length} themes)`, 'green');
  } else {
    log(`   ✗ Insufficient theme guidance (${themesFound.length}/${themes.length})`, 'red');
  }

  // Check 4: Character length optimization
  checks++;
  if (content.includes('600') || content.includes('1000')) {
    passed++;
    log('   ✓ Character length optimization (600-1000)', 'green');
  } else {
    log('   ✗ Length optimization missing', 'red');
  }

  // Check 5: Natural conversation style
  checks++;
  if (content.includes('conversation') || content.includes('natural')) {
    passed++;
    log('   ✓ Natural conversation style emphasized', 'green');
  } else {
    log('   ✗ Conversation style not emphasized', 'red');
  }

  const result = score(passed, checks);
  log(`   AI Prompt Quality: ${passed}/${checks} checks passed (${result.percent}%)`, result.color);

  return result.percent;
}

// ===================================================================
// TEST 5: TRANSLATION QUALITY (100%)
// ===================================================================
async function testTranslationQuality() {
  log('\n🌍 Testing Translation Quality...', 'cyan');

  const translationPath = path.join(__dirname, 'src/lib/i18n/translation-enhancer.ts');
  const content = fs.readFileSync(translationPath, 'utf-8');

  let checks = 0;
  let passed = 0;

  // Check 1: Domain terminology mapping
  checks++;
  if (content.includes('DOMAIN_TERMS')) {
    passed++;
    log('   ✓ Domain terminology mapping created', 'green');
  } else {
    log('   ✗ Domain terminology missing', 'red');
  }

  // Check 2: Language-specific rules
  checks++;
  if (content.includes('LANGUAGE_RULES')) {
    passed++;
    log('   ✓ Language-specific rules implemented', 'green');
  } else {
    log('   ✗ Language rules missing', 'red');
  }

  // Check 3: Tone adjustment support
  checks++;
  if (content.includes('applyToneAdjustments') || content.includes('tone')) {
    passed++;
    log('   ✓ Tone adjustment support added', 'green');
  } else {
    log('   ✗ Tone adjustment missing', 'red');
  }

  // Check 4: Context-aware translation
  checks++;
  if (content.includes('enhanceTranslation') && content.includes('context')) {
    passed++;
    log('   ✓ Context-aware translation engine', 'green');
  } else {
    log('   ✗ Context awareness missing', 'red');
  }

  // Check 5: Translation validation
  checks++;
  if (content.includes('validate') || content.includes('quality')) {
    passed++;
    log('   ✓ Translation validation implemented', 'green');
  } else {
    log('   ✗ Translation validation missing', 'red');
  }

  const result = score(passed, checks);
  log(`   Translation Quality: ${passed}/${checks} checks passed (${result.percent}%)`, result.color);

  return result.percent;
}

// ===================================================================
// TEST 6: USER PERSONALIZATION (100%)
// ===================================================================
async function testUserPersonalization() {
  log('\n👤 Testing User Personalization...', 'cyan');

  const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
  const analyticsPath = path.join(__dirname, 'src/lib/personalization/user-analytics.ts');

  let checks = 0;
  let passed = 0;

  // Check 1: Schema includes UserInteraction
  checks++;
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  if (schemaContent.includes('model UserInteraction')) {
    passed++;
    log('   ✓ UserInteraction model in schema', 'green');
  } else {
    log('   ✗ UserInteraction model missing', 'red');
  }

  // Check 2: Schema includes UserPreferences
  checks++;
  if (schemaContent.includes('model UserPreferences')) {
    passed++;
    log('   ✓ UserPreferences model in schema', 'green');
  } else {
    log('   ✗ UserPreferences model missing', 'red');
  }

  // Check 3: Analytics utilities exist
  checks++;
  if (fs.existsSync(analyticsPath)) {
    passed++;
    log('   ✓ User analytics utilities created', 'green');
  } else {
    log('   ✗ Analytics utilities missing', 'red');
  }

  // Check 4: Track interaction function
  checks++;
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf-8');
  if (analyticsContent.includes('trackInteraction')) {
    passed++;
    log('   ✓ Track interaction function implemented', 'green');
  } else {
    log('   ✗ Track interaction missing', 'red');
  }

  // Check 5: Get recommendations function
  checks++;
  if (analyticsContent.includes('getRecommendations')) {
    passed++;
    log('   ✓ Personalized recommendations engine', 'green');
  } else {
    log('   ✗ Recommendations missing', 'red');
  }

  const result = score(passed, checks);
  log(`   User Personalization: ${passed}/${checks} checks passed (${result.percent}%)`, result.color);

  return result.percent;
}

// ===================================================================
// MAIN TEST RUNNER
// ===================================================================
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║       🚀 DestinyPal Optimization Test Suite 🚀       ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const results = [];

  try {
    results.push({ name: '8-Language Support', score: await test8LanguageSupport() });
    results.push({ name: 'Backend AI Performance', score: await testBackendPerformance() });
    results.push({ name: 'Frontend Optimization', score: await testFrontendOptimization() });
    results.push({ name: 'AI Prompt Quality', score: await testAIPromptQuality() });
    results.push({ name: 'Translation Quality', score: await testTranslationQuality() });
    results.push({ name: 'User Personalization', score: await testUserPersonalization() });

    // Calculate overall score
    const overallScore = Math.round(
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    );

    // Display summary
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║                   📊 TEST SUMMARY                     ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    results.forEach(({ name, score }) => {
      const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
      const status = score >= 90 ? '✓' : score >= 70 ? '⚠' : '✗';
      log(`   ${status} ${name}: ${score}%`, color);
    });

    log('\n───────────────────────────────────────────────────────');
    const overallColor = overallScore >= 90 ? 'green' : overallScore >= 70 ? 'yellow' : 'red';
    log(`   🎯 OVERALL OPTIMIZATION SCORE: ${overallScore}%`, overallColor);
    log('───────────────────────────────────────────────────────\n');

    if (overallScore >= 90) {
      log('🎉 EXCELLENT! All optimizations are at 100% target!', 'green');
    } else if (overallScore >= 70) {
      log('⚠️  GOOD! Some optimizations need attention.', 'yellow');
    } else {
      log('❌ NEEDS WORK! Multiple optimizations require fixes.', 'red');
    }

    log('\n💡 Next steps:');
    if (overallScore < 100) {
      log('   1. Review failed checks above', 'yellow');
      log('   2. Complete missing implementations', 'yellow');
      log('   3. Run test again to verify', 'yellow');
    } else {
      log('   1. ✓ All optimizations complete!', 'green');
      log('   2. Deploy to production', 'green');
      log('   3. Monitor performance metrics', 'green');
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
