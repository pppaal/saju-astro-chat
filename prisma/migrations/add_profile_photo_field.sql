-- Add profilePhoto field to User table
-- Migration: add_profile_photo_field

-- AlterTable
ALTER TABLE "User" ADD COLUMN "profilePhoto" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "User"."profilePhoto" IS 'User uploaded custom profile photo URL (from Vercel Blob Storage)';
