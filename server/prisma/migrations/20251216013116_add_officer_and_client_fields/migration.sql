-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "driverLicense" TEXT,
ADD COLUMN     "localId" TEXT,
ADD COLUMN     "middleInitial" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "badgeNumber" TEXT,
ADD COLUMN     "rank" TEXT;
