-- CreateTable
CREATE TABLE "SerpIdeas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "q" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- CreateIndex
CREATE UNIQUE INDEX "SerpIdeas_cacheKey_key" ON "SerpIdeas"("cacheKey");