#!/bin/bash
# Setup Test Database Schema
# This script migrates your Prisma schema to the test database

set -e

# Check if TEST_DATABASE_URL is set
if [ -z "$TEST_DATABASE_URL" ]; then
  echo "❌ Error: TEST_DATABASE_URL is not set"
  echo "Please set it in .env or .env.local:"
  echo "  TEST_DATABASE_URL=postgresql://..."
  exit 1
fi

echo "🔧 Setting up test database schema..."
echo "📍 Database: $TEST_DATABASE_URL"
echo ""

# Temporarily use TEST_DATABASE_URL as DATABASE_URL for migration
export DATABASE_URL=$TEST_DATABASE_URL

echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Test database schema is ready!"
echo "You can now run integration tests with:"
echo "  npm run test:integration"
