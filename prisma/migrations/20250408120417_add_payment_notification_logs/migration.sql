/*
  Warnings:

  - You are about to drop the column `processed_at` on the `webhook_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "provider" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_logs" DROP COLUMN "processed_at";

-- CreateTable
CREATE TABLE "payment_notification_logs" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_url" TEXT,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_stack" TEXT,
    "payload" TEXT,
    "response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_notification_logs_transaction_id_idx" ON "payment_notification_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_notification_logs_type_idx" ON "payment_notification_logs"("type");

-- CreateIndex
CREATE INDEX "payment_notification_logs_status_idx" ON "payment_notification_logs"("status");

-- CreateIndex
CREATE INDEX "payment_notification_logs_created_at_idx" ON "payment_notification_logs"("created_at");

-- CreateIndex
CREATE INDEX "transactions_provider_idx" ON "transactions"("provider");

-- AddForeignKey
ALTER TABLE "payment_notification_logs" ADD CONSTRAINT "payment_notification_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
