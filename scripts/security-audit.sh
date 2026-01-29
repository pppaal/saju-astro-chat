#!/bin/bash
# 전체 보안 체크리스트 검증
# Usage: bash scripts/security-audit.sh

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🔒 Security Audit for DestinyPal"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Running comprehensive security checks..."
echo "Date: $(date)"
echo ""

FAILED=0
WARNINGS=0

# 1. .env 파일이 git에 없는지 확인
echo "═══ 1. Checking .env files in git ==="
if git ls-files | grep -E "^\.env$|^\.env\.local$|^backend_ai/\.env$"; then
  echo "❌ CRITICAL: .env files are tracked by git!"
  echo "   Fix: git rm --cached .env .env.local backend_ai/.env"
  FAILED=$((FAILED + 1))
else
  echo "✅ No .env files in git"
fi
echo ""

# 2. .gitignore가 올바른지 확인
echo "═══ 2. Verifying .gitignore configuration ==="
if ! grep -q "^\.env\*" .gitignore; then
  echo "❌ .gitignore doesn't exclude .env files!"
  echo "   Add: .env*"
  echo "        !.env.example"
  FAILED=$((FAILED + 1))
else
  echo "✅ .gitignore excludes .env* files"
fi

if ! grep -q "final_data\.db\|^\*\.db" .gitignore; then
  echo "⚠️  .gitignore doesn't exclude database files"
  echo "   Add: *.db"
  echo "        final_data.db"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ .gitignore excludes database files"
fi

if ! grep -q "\.security-cleanup" .gitignore; then
  echo "⚠️  .gitignore doesn't exclude .security-cleanup/"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ .gitignore excludes .security-cleanup/"
fi
echo ""

# 3. 환경 변수 검증
echo "═══ 3. Environment variables validation ==="
if npm run check:env > /tmp/env-check.log 2>&1; then
  echo "✅ Environment variables validated"
else
  echo "❌ Environment variable validation failed"
  cat /tmp/env-check.log
  FAILED=$((FAILED + 1))
fi
echo ""

# 4. 토큰 암호화 키 검증
echo "═══ 4. Token encryption key validation ==="
if [ -f scripts/verify-token-encryption.js ]; then
  if node scripts/verify-token-encryption.js > /tmp/token-check.log 2>&1; then
    echo "✅ TOKEN_ENCRYPTION_KEY validated"
  else
    echo "❌ TOKEN_ENCRYPTION_KEY validation failed"
    cat /tmp/token-check.log
    FAILED=$((FAILED + 1))
  fi
else
  echo "⚠️  Token encryption verification script not found"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 5. Console.log 체크
echo "═══ 5. Checking for console statements ==="
CONSOLE_COUNT=$(grep -r "console\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "logger" | \
  grep -v "//" | \
  grep -v "src/lib/logger/" | \
  grep -v "src/lib/env-validation.ts" | \
  wc -l || echo "0")

if [ "$CONSOLE_COUNT" -gt 5 ]; then
  echo "⚠️  Found $CONSOLE_COUNT console statements (threshold: ≤5)"
  echo "   Run: npm run migrate:logger"
  echo "   Or add: // @ts-expect-error console (if intentional)"
  WARNINGS=$((WARNINGS + 1))
  echo ""
  echo "   Sample findings:"
  grep -r "console\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "logger" | \
    grep -v "//" | \
    grep -v "src/lib/logger/" | \
    grep -v "src/lib/env-validation.ts" | \
    head -5
else
  echo "✅ Console statements: $CONSOLE_COUNT (acceptable)"
fi
echo ""

# 6. 하드코딩된 시크릿 체크
echo "═══ 6. Checking for hardcoded secrets ==="
SECRETS_FOUND=0

# OpenAI keys
if grep -r "sk-[a-zA-Z0-9]\{20,\}" src/ 2>/dev/null | grep -v "\.example\|\.md\|test\|mock"; then
  echo "❌ Found potential OpenAI API keys!"
  SECRETS_FOUND=1
fi

# AWS keys
if grep -r "AKIA[A-Z0-9]\{16\}" src/ 2>/dev/null | grep -v "\.example\|\.md\|test"; then
  echo "❌ Found potential AWS access keys!"
  SECRETS_FOUND=1
fi

# Private keys
if grep -r "-----BEGIN.*PRIVATE KEY-----" src/ 2>/dev/null | grep -v "\.example\|\.md"; then
  echo "❌ Found private keys!"
  SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 1 ]; then
  echo "❌ Hardcoded secrets detected"
  FAILED=$((FAILED + 1))
else
  echo "✅ No hardcoded secrets found"
fi
echo ""

# 7. Git 히스토리 체크
echo "═══ 7. Git history check ==="
if git log --all --full-history --name-only -- ".env" 2>/dev/null | grep -q ".env"; then
  echo "⚠️  .env files found in git history"
  echo "   Consider running: bash .security-cleanup/analyze-git-history.sh"
  echo "   Then: bash .security-cleanup/rewrite-history.sh (if needed)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ No .env files in git history"
fi
echo ""

# 8. Gitleaks 실행 (if installed)
echo "═══ 8. Gitleaks secret scan ==="
if command -v gitleaks &> /dev/null; then
  if gitleaks detect --verbose --no-banner > /tmp/gitleaks.log 2>&1; then
    echo "✅ Gitleaks scan passed (no secrets detected)"
  else
    echo "❌ Gitleaks detected potential secrets"
    cat /tmp/gitleaks.log | head -20
    FAILED=$((FAILED + 1))
  fi
else
  echo "⚠️  Gitleaks not installed"
  echo "   Install: brew install gitleaks (Mac)"
  echo "   Or: https://github.com/gitleaks/gitleaks"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 9. npm audit
echo "═══ 9. Dependency vulnerability scan ==="
if npm audit --audit-level=high > /tmp/npm-audit.log 2>&1; then
  echo "✅ No high/critical vulnerabilities found"
else
  echo "⚠️  npm audit found vulnerabilities"
  echo "   Run: npm audit fix"
  cat /tmp/npm-audit.log | head -20
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 10. TypeScript 컴파일 체크
echo "═══ 10. TypeScript type safety ==="
if npm run typecheck > /tmp/typecheck.log 2>&1; then
  echo "✅ TypeScript typecheck passed"
else
  echo "⚠️  TypeScript errors found"
  cat /tmp/typecheck.log | head -10
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 11. ESLint 보안 관련 규칙 체크
echo "═══ 11. ESLint security rules ==="
if npm run lint > /tmp/lint.log 2>&1; then
  echo "✅ ESLint passed"
else
  echo "⚠️  ESLint errors found"
  cat /tmp/lint.log | head -10
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 12. 보안 헤더 체크 (dev 서버 필요)
echo "═══ 12. Security headers check ==="
echo "Checking if dev server is running..."

if curl -s -I http://localhost:3000 > /dev/null 2>&1; then
  echo "Dev server detected, checking headers..."

  HEADERS=$(curl -s -I http://localhost:3000)

  if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    echo "✅ X-Frame-Options header present"
  else
    echo "⚠️  X-Frame-Options header missing"
    WARNINGS=$((WARNINGS + 1))
  fi

  if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
    echo "✅ Content-Security-Policy header present"
  else
    echo "⚠️  Content-Security-Policy header missing"
    WARNINGS=$((WARNINGS + 1))
  fi

  if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo "✅ X-Content-Type-Options header present"
  else
    echo "⚠️  X-Content-Type-Options header missing"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "ℹ️  Dev server not running, skipping header check"
  echo "   Start server: npm run dev"
  echo "   Then run: bash scripts/security-audit.sh"
fi
echo ""

# 13. File permissions check (Unix-like systems)
if [ "$(uname)" != "MINGW64_NT-10.0" ] && [ "$(uname)" != "MSYS_NT-10.0" ]; then
  echo "═══ 13. File permissions check ==="

  # Check for world-writable files
  WORLD_WRITABLE=$(find . -type f -perm -002 2>/dev/null | grep -v "node_modules\|\.git" | wc -l || echo "0")

  if [ "$WORLD_WRITABLE" -gt 0 ]; then
    echo "⚠️  Found $WORLD_WRITABLE world-writable files"
    find . -type f -perm -002 2>/dev/null | grep -v "node_modules\|\.git" | head -5
    WARNINGS=$((WARNINGS + 1))
  else
    echo "✅ No world-writable files found"
  fi
  echo ""
fi

# 14. Dependency license check (optional)
echo "═══ 14. Dependency license check ==="
if command -v license-checker &> /dev/null; then
  RESTRICTED=$(license-checker --summary 2>/dev/null | grep -E "GPL|AGPL" || echo "")
  if [ -n "$RESTRICTED" ]; then
    echo "⚠️  Found potentially restricted licenses (GPL/AGPL)"
    echo "$RESTRICTED"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "✅ No restricted licenses found"
  fi
else
  echo "ℹ️  license-checker not installed (optional)"
  echo "   Install: npm install -g license-checker"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "📊 Security Audit Summary"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ ✅ ✅ ALL CHECKS PASSED ✅ ✅ ✅"
  echo ""
  echo "No security issues found!"
  echo "Your project follows security best practices."
  exit 0
elif [ $FAILED -eq 0 ]; then
  echo "⚠️  PASSED WITH WARNINGS"
  echo ""
  echo "Warnings: $WARNINGS"
  echo "Critical Issues: 0"
  echo ""
  echo "No critical issues, but some warnings need attention."
  echo "Review warnings above and address them when possible."
  exit 0
else
  echo "❌ FAILED"
  echo ""
  echo "Critical Issues: $FAILED"
  echo "Warnings: $WARNINGS"
  echo ""
  echo "Critical security issues found! Please address them immediately."
  echo ""
  echo "Next steps:"
  echo "1. Review all ❌ CRITICAL issues above"
  echo "2. Fix each issue"
  echo "3. Re-run: bash scripts/security-audit.sh"
  echo "4. Commit fixes: git commit -m \"security: fix audit issues\""
  exit 1
fi
