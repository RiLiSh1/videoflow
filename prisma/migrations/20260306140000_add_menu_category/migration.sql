-- CreateEnum
CREATE TYPE "menu_category" AS ENUM ('PORE_CLEANSING', 'SKIN_IMPROVEMENT', 'WAX', 'PEELING', 'OTHER');

-- AlterTable: Video
ALTER TABLE "videos" ADD COLUMN "menu_category" "menu_category";
ALTER TABLE "videos" ADD COLUMN "menu_category_note" TEXT;

-- AlterTable: VideoStock
ALTER TABLE "video_stocks" ADD COLUMN "menu_category" "menu_category";
ALTER TABLE "video_stocks" ADD COLUMN "menu_category_note" TEXT;
