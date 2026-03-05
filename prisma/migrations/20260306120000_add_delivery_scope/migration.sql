-- CreateEnum
CREATE TYPE "delivery_scope" AS ENUM ('ALL_STORES', 'SELECTED_STORES');

-- AlterTable: Video
ALTER TABLE "videos" ADD COLUMN "delivery_scope" "delivery_scope";
ALTER TABLE "videos" ADD COLUMN "delivery_client_id" TEXT;

-- AlterTable: VideoStock
ALTER TABLE "video_stocks" ADD COLUMN "delivery_scope" "delivery_scope";

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_delivery_client_id_fkey" FOREIGN KEY ("delivery_client_id") REFERENCES "delivery_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
