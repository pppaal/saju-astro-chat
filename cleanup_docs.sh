#!/bin/bash
# Archive old/duplicate documentation files

mkdir -p docs/archive

# Move coverage reports (많은 중복)
mv COVERAGE_*.md docs/archive/ 2>/dev/null
mv c:devsaju-astro-chatCOVERAGE*.md docs/archive/ 2>/dev/null

# Move old phase reports
mv PHASE_*.md docs/archive/ 2>/dev/null
mv LAYER*.md docs/archive/ 2>/dev/null
mv WEEK*.md docs/archive/ 2>/dev/null

# Move old summaries
mv *_SUMMARY.md docs/archive/ 2>/dev/null
mv *_COMPLETE.md docs/archive/ 2>/dev/null
mv *_PROGRESS.md docs/archive/ 2>/dev/null

# Move old specific features
mv TAROT_*.md docs/archive/ 2>/dev/null
mv DESTINY_*.md docs/archive/ 2>/dev/null
mv CALENDAR_*.md docs/archive/ 2>/dev/null
mv ASTROLOGY_*.md docs/archive/ 2>/dev/null

# Move old refactoring docs
mv REFACTORING_*.md docs/archive/ 2>/dev/null
mv *_REFACTORING_*.md docs/archive/ 2>/dev/null

# Move old deployment/testing docs
mv DEPLOYMENT_*.md docs/archive/ 2>/dev/null
mv E2E_*.md docs/archive/ 2>/dev/null
mv TEST_*.md docs/archive/ 2>/dev/null
mv TESTING_*.md docs/archive/ 2>/dev/null

# Move old implementation docs
mv IMPLEMENTATION_*.md docs/archive/ 2>/dev/null
mv EXTRACTION_*.md docs/archive/ 2>/dev/null
mv MODULE_*.md docs/archive/ 2>/dev/null

# Move old CI/CD docs (중복, .github에 있음)
mv CICD_*.md docs/archive/ 2>/dev/null
mv CI_CD_*.md docs/archive/ 2>/dev/null

# Move old performance docs
mv PERFORMANCE_OPTIMIZATION.md docs/archive/ 2>/dev/null
mv REDIS_*.md docs/archive/ 2>/dev/null
mv OPENAI_*.md docs/archive/ 2>/dev/null
mv RAG_*.md docs/archive/ 2>/dev/null

# Move other old docs
mv ADDITIONAL_*.md docs/archive/ 2>/dev/null
mv API_MIGRATION_*.md docs/archive/ 2>/dev/null
mv BEGINNER_*.md docs/archive/ 2>/dev/null
mv FINAL_*.md docs/archive/ 2>/dev/null
mv LOADING_*.md docs/archive/ 2>/dev/null
mv MID_*.md docs/archive/ 2>/dev/null
mv MOBILE_*.md docs/archive/ 2>/dev/null
mv PITCH_*.md docs/archive/ 2>/dev/null
mv PRODUCTION_*.md docs/archive/ 2>/dev/null
mv VERIFICATION_*.md docs/archive/ 2>/dev/null
mv UX_UI_IMPROVEMENTS.md docs/archive/ 2>/dev/null

echo "Cleanup complete! Check docs/archive/"
