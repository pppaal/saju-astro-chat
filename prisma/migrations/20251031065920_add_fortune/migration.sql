-- CreateTable
CREATE TABLE "Fortune" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fortune_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fortune_userId_date_idx" ON "Fortune"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Fortune_userId_date_kind_key" ON "Fortune"("userId", "date", "kind");

-- AddForeignKey
ALTER TABLE "Fortune" ADD CONSTRAINT "Fortune_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
