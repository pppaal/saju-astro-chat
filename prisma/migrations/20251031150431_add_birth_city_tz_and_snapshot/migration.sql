-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthCity" TEXT,
ADD COLUMN     "tzId" TEXT;

-- CreateTable
CREATE TABLE "DestinySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetDate" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DestinySnapshot_userId_targetDate_idx" ON "DestinySnapshot"("userId", "targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "DestinySnapshot_userId_targetDate_key" ON "DestinySnapshot"("userId", "targetDate");

-- AddForeignKey
ALTER TABLE "DestinySnapshot" ADD CONSTRAINT "DestinySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
