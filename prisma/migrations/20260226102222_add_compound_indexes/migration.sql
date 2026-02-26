-- CreateIndex
CREATE INDEX "videos_creator_id_status_idx" ON "videos"("creator_id", "status");

-- CreateIndex
CREATE INDEX "videos_project_id_status_idx" ON "videos"("project_id", "status");
