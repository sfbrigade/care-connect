-- AlterTable
ALTER TABLE "public"."BedType" ADD COLUMN     "inTransit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."BedTypeUpdate" ADD COLUMN     "inTransit" INTEGER NOT NULL DEFAULT 0;
