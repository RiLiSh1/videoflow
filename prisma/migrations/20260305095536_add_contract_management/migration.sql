-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_RENEWAL', 'RENEWED', 'CANCELLED');

-- AlterTable
ALTER TABLE "delivery_clients" ADD COLUMN     "contract_end_date" TIMESTAMP(3),
ADD COLUMN     "contract_months" INTEGER,
ADD COLUMN     "contract_start_date" TIMESTAMP(3),
ADD COLUMN     "contract_status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "last_renewed_at" TIMESTAMP(3),
ADD COLUMN     "renewal_note" TEXT;

-- CreateIndex
CREATE INDEX "delivery_clients_contract_status_idx" ON "delivery_clients"("contract_status");

-- CreateIndex
CREATE INDEX "delivery_clients_contract_end_date_idx" ON "delivery_clients"("contract_end_date");
