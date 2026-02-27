-- CreateEnum
CREATE TYPE "compensation_type" AS ENUM ('PER_VIDEO', 'CUSTOM');

-- CreateTable
CREATE TABLE "creator_compensations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "compensation_type" NOT NULL DEFAULT 'PER_VIDEO',
    "per_video_rate" INTEGER,
    "custom_amount" INTEGER,
    "custom_note" TEXT,
    "is_fixed_monthly" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_compensations_user_id_key" ON "creator_compensations"("user_id");

-- AddForeignKey
ALTER TABLE "creator_compensations" ADD CONSTRAINT "creator_compensations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
