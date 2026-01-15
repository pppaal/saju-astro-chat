# Test Failures Summary
Generated: 2026-01-14

## Overall Results
- ✅ **9,868 tests passed** (99.4%)
- ❌ **59 tests failed** (0.6%)
- 📁 **267 test files** (250 passed, 17 failed)
- ⏱️ **Duration**: 71.84s

## Failed Tests by Category

### 1. Precision Engine (2 failures)
**File**: `tests/lib/prediction/precisionEngine.test.ts`

#### Test: `should cycle through 28 mansions`
- **Issue**: Lunar mansion cycling logic error
- **Error**: `expected 17 not to be 17 // Object.is equality`
- **Impact**: Low - edge case in lunar mansion calculation

#### Test: `should detect day/night period accurately`
- **Issue**: Day/night detection boundary condition
- **Error**: Time calculation at edge case
- **Impact**: Low - affects precision timing predictions

### 2. Destiny Matrix AI Reports (5 failures)
**File**: `tests/lib/destiny-matrix/ai-report-generator.test.ts`

All 5 failures are **timeout issues** with OpenAI API calls:
- `should generate premium report from matrix report`
- `should include correct meta information`
- `should preserve structure from matrix report`
- `should handle different languages`
- `should respect token limit parameter`

**Root Cause**: Tests hitting real OpenAI API with 30s timeout
**Impact**: Medium - these are integration-style tests that should be mocked or marked as slow
**Fix Needed**: Mock OpenAI responses or increase timeout/skip in CI

### 3. Insight Generator (1 failure)
**File**: `tests/lib/destiny-matrix/interpreter/insight-generator.test.ts`

#### Test: `should infer relationship domain from houses`
- **Error**: `expected 'career' to be 'relationship'`
- **Issue**: Domain inference logic incorrectly categorizing house placements
- **Impact**: Medium - affects report categorization

### 4. Report Generator (2 failures)
**File**: `tests/lib/destiny-matrix/interpreter/report-generator.test.ts`

#### Test: `should include geokguk when available`
- **Error**: `expected undefined to be defined`
- **Issue**: `geokgukDescription` field not being populated
- **Impact**: Low - missing description in reports

#### Test: `should provide grade description in Korean/English`
- **Error**: Expected pattern `/조화|균형|성장|도전/` but got "주의가 필요한 영역이 있습니다"
- **Issue**: Grade description text doesn't match expected patterns
- **Impact**: Low - cosmetic issue with grade descriptions

### 5. Structured Prompt Parser (1 failure)
**File**: `tests/lib/destiny-map/prompt/fortune/base/structuredPrompt.test.ts`

#### Test: `should handle deeply nested brace structures`
- **Error**: `expected null to be truthy`
- **Issue**: Parser fails on deeply nested JSON-like structures
- **Impact**: Low - edge case in prompt parsing

### 6. Astrology Service (1 failure)
**File**: `tests/lib/astrology/foundation/astrologyService.test.ts`

#### Test: `should calculate different charts for different times`
- **Error**: `expected 170.28 to not be close to 170.33, but difference is 0.049`
- **Issue**: Chart positions too similar for different birth times (precision tolerance issue)
- **Impact**: Very Low - test assertion tolerance is too strict

### 7. Asteroids Module (11 failures)
**File**: `tests/lib/astrology/foundation/asteroids.test.ts`

**Root Cause**: Swiss Ephemeris asteroid calculation returning `undefined`
- `calculateAsteroid` tests (4 failures) - Cannot read properties of undefined
- `calculateAllAsteroids` tests (2 failures) - Same root cause
- `findAsteroidAspects` tests (3 failures) - planets is not iterable
- Edge case tests (2 failures)

**Impact**: Medium - Asteroid calculations are completely broken
**Fix Needed**: Check Swiss Ephemeris configuration for asteroid support

### 8. Destiny Map Calendar (31 failures)
**File**: `tests/lib/destiny-map/calendar/daily-fortune-helpers.test.ts`

All 31 failures are related to:
- **Category scoring system** expecting scores 0-100
- **Current implementation** returns smaller ranges (e.g., 60-75)
- Tests check for full 0-100 range coverage

**Root Cause**: Mismatch between test expectations and implementation
**Impact**: Medium - Calendar scoring system needs review
**Fix Options**:
1. Update implementation to use full 0-100 range
2. Update tests to match actual implementation behavior

## Priority Fixes

### High Priority
1. **Asteroids Module** - Completely non-functional (11 failures)
   - Check Swiss Ephemeris asteroid calculation setup
   - Verify asteroid ephemeris files are available

### Medium Priority
2. **Destiny Matrix AI Reports** - Mock OpenAI or mark as integration tests
3. **Calendar Scoring Range** - Align tests with implementation (31 failures)
4. **Domain Inference** - Fix categorization logic

### Low Priority
5. **Precision Engine** - Edge cases in lunar mansion/day-night detection
6. **Structured Prompt Parser** - Deeply nested brace handling
7. **Astrology Precision** - Adjust test tolerance for birth time differences
8. **Report Generator** - Missing geokguk descriptions

## Recommendations

1. **Mock External APIs**: OpenAI calls should be mocked in unit tests
2. **Integration Tests**: Move slow/external API tests to separate integration suite
3. **Asteroid Support**: Verify Swiss Ephemeris is configured correctly for asteroids
4. **Calendar Scoring**: Decide on official scoring range (0-100 vs actual range)
5. **Test Isolation**: Ensure all tests can run independently without external dependencies

## Next Steps

1. Fix asteroid calculations (highest impact)
2. Mock/separate AI report tests
3. Review and standardize calendar scoring
4. Address remaining edge cases

---

**Note**: Despite 59 failures, 99.4% of tests pass. Most failures are edge cases, external API timeouts, or test assumption mismatches rather than critical bugs.
