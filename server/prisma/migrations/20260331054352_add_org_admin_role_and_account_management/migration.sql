-- AlterEnum
ALTER TYPE "public"."RoleEnum" ADD VALUE 'ORG_ADMIN';

-- AlterTable
ALTER TABLE "public"."Invite" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deletedAt" TIMESTAMP(3);
