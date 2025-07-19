-- CreateTable
CREATE TABLE "blocked_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_until" TIMESTAMP(3),

    CONSTRAINT "blocked_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_emails_email_key" ON "blocked_emails"("email");

-- CreateIndex
CREATE INDEX "blocked_emails_email_idx" ON "blocked_emails"("email"); 