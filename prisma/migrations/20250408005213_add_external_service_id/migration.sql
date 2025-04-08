-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "external_service_id" TEXT;

-- CreateIndex
CREATE INDEX "payment_requests_external_service_id_idx" ON "payment_requests"("external_service_id");
