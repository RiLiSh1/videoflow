-- CreateEnum
CREATE TYPE "invoice_verification_status" AS ENUM ('PENDING', 'MATCHED', 'MISMATCHED', 'APPROVED');

-- CreateTable
CREATE TABLE "creator_invoices" (
    "id" TEXT NOT NULL,
    "payment_notification_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "extracted_subtotal" INTEGER,
    "extracted_withholding" INTEGER,
    "extracted_net_amount" INTEGER,
    "verificationStatus" "invoice_verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_invoices_payment_notification_id_key" ON "creator_invoices"("payment_notification_id");

-- AddForeignKey
ALTER TABLE "creator_invoices" ADD CONSTRAINT "creator_invoices_payment_notification_id_fkey" FOREIGN KEY ("payment_notification_id") REFERENCES "payment_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_invoices" ADD CONSTRAINT "creator_invoices_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_invoices" ADD CONSTRAINT "creator_invoices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
