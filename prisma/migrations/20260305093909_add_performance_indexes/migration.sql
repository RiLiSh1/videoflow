-- CreateIndex
CREATE INDEX "delivery_change_logs_schedule_id_created_at_idx" ON "delivery_change_logs"("schedule_id", "created_at");

-- CreateIndex
CREATE INDEX "delivery_schedules_status_scheduled_send_at_idx" ON "delivery_schedules"("status", "scheduled_send_at");

-- CreateIndex
CREATE INDEX "delivery_schedules_client_id_status_idx" ON "delivery_schedules"("client_id", "status");
