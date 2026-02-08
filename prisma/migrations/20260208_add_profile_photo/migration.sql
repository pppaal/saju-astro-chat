-- Add profilePhoto field to User table
-- This column stores user-uploaded custom profile photo URL (from Vercel Blob Storage)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePhoto" TEXT;
