-- AlterTable
ALTER TABLE "users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "last_login" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_active_idx" ON "users"("active"); 