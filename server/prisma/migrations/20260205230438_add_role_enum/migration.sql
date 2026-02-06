-- CreateEnum
CREATE TYPE "public"."RoleEnum" AS ENUM ('FIELD', 'CUSTODY', 'CARE');

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "defaultRoles" "public"."RoleEnum"[] DEFAULT ARRAY[]::"public"."RoleEnum"[];

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "roles" "public"."RoleEnum"[] DEFAULT ARRAY[]::"public"."RoleEnum"[];
