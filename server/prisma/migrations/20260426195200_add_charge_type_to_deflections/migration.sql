-- CreateEnum
CREATE TYPE "ChargeTypeEnum" AS ENUM ('RWS_647F', 'HS_11550');

-- AlterTable
ALTER TABLE "Deflection" ADD COLUMN     "chargeType" "ChargeTypeEnum";
