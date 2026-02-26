-- CreateEnum
CREATE TYPE "video_type" AS ENUM ('ORIGINAL', 'REMAKE', 'OTHER');

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "video_type" "video_type",
ADD COLUMN     "video_type_other" TEXT;
