-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickId" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "channel" TEXT,
    "query" TEXT,
    "locale" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "geoCountry" TEXT,
    "geoRegion" TEXT,
    "geoCity" TEXT,
    "referrerAdCreative" TEXT,
    "params" TEXT
);

-- CreateTable
CREATE TABLE "Content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "q" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "cacheKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Content_cacheKey_key" ON "Content"("cacheKey");
