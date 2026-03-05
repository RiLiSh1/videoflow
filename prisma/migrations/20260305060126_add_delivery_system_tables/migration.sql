-- CreateEnum
CREATE TYPE "delivery_schedule_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "delivery_change_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'SEND');

-- CreateTable
CREATE TABLE "delivery_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line_group_id" TEXT,
    "google_drive_folder_id" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_stocks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "google_drive_file_id" TEXT,
    "google_drive_url" TEXT,
    "blob_url" TEXT,
    "client_id" TEXT,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_schedules" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "video_stock_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "scheduled_send_at" TIMESTAMP(3),
    "actual_sent_at" TIMESTAMP(3),
    "status" "delivery_schedule_status" NOT NULL DEFAULT 'DRAFT',
    "send_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_approvals" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_change_logs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "action" "delivery_change_action" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_stocks_client_id_idx" ON "video_stocks"("client_id");

-- CreateIndex
CREATE INDEX "video_stocks_is_used_idx" ON "video_stocks"("is_used");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_schedules_video_stock_id_key" ON "delivery_schedules"("video_stock_id");

-- CreateIndex
CREATE INDEX "delivery_schedules_client_id_idx" ON "delivery_schedules"("client_id");

-- CreateIndex
CREATE INDEX "delivery_schedules_week_start_idx" ON "delivery_schedules"("week_start");

-- CreateIndex
CREATE INDEX "delivery_schedules_status_idx" ON "delivery_schedules"("status");

-- CreateIndex
CREATE INDEX "delivery_schedules_week_start_status_idx" ON "delivery_schedules"("week_start", "status");

-- CreateIndex
CREATE INDEX "delivery_approvals_schedule_id_idx" ON "delivery_approvals"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_approvals_schedule_id_approved_by_key" ON "delivery_approvals"("schedule_id", "approved_by");

-- CreateIndex
CREATE INDEX "delivery_change_logs_schedule_id_idx" ON "delivery_change_logs"("schedule_id");

-- CreateIndex
CREATE INDEX "delivery_change_logs_actor_id_idx" ON "delivery_change_logs"("actor_id");

-- CreateIndex
CREATE INDEX "delivery_change_logs_created_at_idx" ON "delivery_change_logs"("created_at");

-- AddForeignKey
ALTER TABLE "video_stocks" ADD CONSTRAINT "video_stocks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "delivery_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_schedules" ADD CONSTRAINT "delivery_schedules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "delivery_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_schedules" ADD CONSTRAINT "delivery_schedules_video_stock_id_fkey" FOREIGN KEY ("video_stock_id") REFERENCES "video_stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_approvals" ADD CONSTRAINT "delivery_approvals_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "delivery_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_approvals" ADD CONSTRAINT "delivery_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_change_logs" ADD CONSTRAINT "delivery_change_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "delivery_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_change_logs" ADD CONSTRAINT "delivery_change_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
