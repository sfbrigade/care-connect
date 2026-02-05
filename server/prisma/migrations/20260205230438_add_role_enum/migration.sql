-- CreateEnum
CREATE TYPE "public"."RoleEnum" AS ENUM ('FIELD', 'CUSTODY', 'CARE');

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "defaultRole" "public"."RoleEnum";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."RoleEnum";
