#!/bin/bash
# Vercel 프로덕션 데이터베이스 마이그레이션 스크립트
echo "🔄 Deploying Prisma migrations to production..."
npx prisma migrate deploy
