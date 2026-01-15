# Setup Test Database Schema (PowerShell)
# This script migrates your Prisma schema to the test database

Write-Host "🔧 Setting up test database schema..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.local
if (Test-Path ".env.local") {
    Write-Host "📂 Loading .env.local..." -ForegroundColor Gray
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^TEST_DATABASE_URL=(.+)$') {
            $env:TEST_DATABASE_URL = $matches[1]
        }
    }
}

# Check if TEST_DATABASE_URL is set
$testDbUrl = $env:TEST_DATABASE_URL
if (-not $testDbUrl) {
    Write-Host "❌ Error: TEST_DATABASE_URL is not set" -ForegroundColor Red
    Write-Host "Please add it to .env.local:" -ForegroundColor Yellow
    Write-Host "  TEST_DATABASE_URL=postgresql://..." -ForegroundColor Yellow
    exit 1
}

Write-Host "📍 Database: $($testDbUrl.Substring(0, 40))..." -ForegroundColor Gray
Write-Host ""

# Temporarily use TEST_DATABASE_URL as DATABASE_URL for migration
$env:DATABASE_URL = $testDbUrl

Write-Host "📦 Running Prisma migrations..." -ForegroundColor Cyan
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Test database schema is ready!" -ForegroundColor Green
    Write-Host "You can now run integration tests with:" -ForegroundColor Green
    Write-Host "  npm run test:integration" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
