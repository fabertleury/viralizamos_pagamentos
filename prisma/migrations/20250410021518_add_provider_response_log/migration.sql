-- CreateTable
CREATE TABLE "provider_response_logs" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "payment_request_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "post_id" TEXT,
    "post_code" TEXT,
    "response_data" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_response_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_response_logs_transaction_id_idx" ON "provider_response_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "provider_response_logs_payment_request_id_idx" ON "provider_response_logs"("payment_request_id");

-- CreateIndex
CREATE INDEX "provider_response_logs_provider_id_idx" ON "provider_response_logs"("provider_id");

-- CreateIndex
CREATE INDEX "provider_response_logs_service_id_idx" ON "provider_response_logs"("service_id");

-- CreateIndex
CREATE INDEX "provider_response_logs_order_id_idx" ON "provider_response_logs"("order_id");

-- CreateIndex
CREATE INDEX "provider_response_logs_status_idx" ON "provider_response_logs"("status");

-- CreateIndex
CREATE INDEX "provider_response_logs_created_at_idx" ON "provider_response_logs"("created_at");

-- AddForeignKey
ALTER TABLE "provider_response_logs" ADD CONSTRAINT "provider_response_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_response_logs" ADD CONSTRAINT "provider_response_logs_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
