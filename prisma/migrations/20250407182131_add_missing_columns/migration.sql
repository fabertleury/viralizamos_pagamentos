-- CreateTable
CREATE TABLE "payment_requests" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "service_id" TEXT,
    "profile_username" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "service_name" TEXT,
    "return_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_payment_id" TEXT,
    "additional_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "payment_request_id" TEXT NOT NULL,
    "external_id" TEXT,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mercadopago',
    "pix_code" TEXT,
    "pix_qrcode" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_idempotency_log" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_idempotency_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_processing_failures" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "error_code" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_processing_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_queue" (
    "id" TEXT NOT NULL,
    "payment_request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),

    CONSTRAINT "processing_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_token_key" ON "payment_requests"("token");

-- CreateIndex
CREATE INDEX "payment_requests_token_idx" ON "payment_requests"("token");

-- CreateIndex
CREATE INDEX "payment_requests_status_idx" ON "payment_requests"("status");

-- CreateIndex
CREATE INDEX "payment_requests_service_id_idx" ON "payment_requests"("service_id");

-- CreateIndex
CREATE INDEX "payment_requests_created_at_idx" ON "payment_requests"("created_at");

-- CreateIndex
CREATE INDEX "transactions_payment_request_id_idx" ON "transactions"("payment_request_id");

-- CreateIndex
CREATE INDEX "transactions_external_id_idx" ON "transactions"("external_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_idempotency_log_key_key" ON "payment_idempotency_log"("key");

-- CreateIndex
CREATE INDEX "payment_idempotency_log_key_idx" ON "payment_idempotency_log"("key");

-- CreateIndex
CREATE INDEX "payment_idempotency_log_created_at_idx" ON "payment_idempotency_log"("created_at");

-- CreateIndex
CREATE INDEX "payment_processing_failures_transaction_id_idx" ON "payment_processing_failures"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_processing_failures_error_code_idx" ON "payment_processing_failures"("error_code");

-- CreateIndex
CREATE INDEX "payment_processing_failures_created_at_idx" ON "payment_processing_failures"("created_at");

-- CreateIndex
CREATE INDEX "processing_queue_payment_request_id_idx" ON "processing_queue"("payment_request_id");

-- CreateIndex
CREATE INDEX "processing_queue_status_idx" ON "processing_queue"("status");

-- CreateIndex
CREATE INDEX "processing_queue_type_idx" ON "processing_queue"("type");

-- CreateIndex
CREATE INDEX "processing_queue_priority_idx" ON "processing_queue"("priority");

-- CreateIndex
CREATE INDEX "processing_queue_next_attempt_at_idx" ON "processing_queue"("next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "webhook_logs_transaction_id_idx" ON "webhook_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "webhook_logs_type_idx" ON "webhook_logs"("type");

-- CreateIndex
CREATE INDEX "webhook_logs_event_idx" ON "webhook_logs"("event");

-- CreateIndex
CREATE INDEX "webhook_logs_processed_idx" ON "webhook_logs"("processed");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_processing_failures" ADD CONSTRAINT "payment_processing_failures_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_queue" ADD CONSTRAINT "processing_queue_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
