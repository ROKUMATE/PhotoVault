-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoogleAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "storageTotalBytes" BIGINT NOT NULL DEFAULT 16106127360,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Photo" (
    "id" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "googleMediaId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "baseUrlExpiry" TIMESTAMP(3) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "GoogleAccount_userId_idx" ON "public"."GoogleAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_googleMediaId_key" ON "public"."Photo"("googleMediaId");

-- CreateIndex
CREATE INDEX "Photo_googleAccountId_idx" ON "public"."Photo"("googleAccountId");

-- CreateIndex
CREATE INDEX "Photo_takenAt_idx" ON "public"."Photo"("takenAt");

-- CreateIndex
CREATE INDEX "Notification_userId_seen_createdAt_idx" ON "public"."Notification"("userId", "seen", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."GoogleAccount" ADD CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "public"."GoogleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
