-- CreateEnum
CREATE TYPE "invoice_action_type" AS ENUM ('UPLOAD', 'GENERATE', 'APPROVE');

-- CreateTable
CREATE TABLE "invoice_history" (
    "id" TEXT NOT NULL,
    "payment_notification_id" TEXT NOT NULL,
    "action_type" "invoice_action_type" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "file_path" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "extracted_subtotal" INTEGER,
    "extracted_withholding" INTEGER,
    "extracted_net_amount" INTEGER,
    "verification_status" "invoice_verification_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_history_payment_notification_id_created_at_idx" ON "invoice_history"("payment_notification_id", "created_at");

-- AddForeignKey
ALTER TABLE "invoice_history" ADD CONSTRAINT "invoice_history_payment_notification_id_fkey" FOREIGN KEY ("payment_notification_id") REFERENCES "payment_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_history" ADD CONSTRAINT "invoice_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
