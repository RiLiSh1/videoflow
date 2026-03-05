-- AlterTable
ALTER TABLE "video_stocks" ADD COLUMN "source_video_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "video_stocks_source_video_id_key" ON "video_stocks"("source_video_id");

-- AddForeignKey
ALTER TABLE "video_stocks" ADD CONSTRAINT "video_stocks_source_video_id_fkey" FOREIGN KEY ("source_video_id") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
