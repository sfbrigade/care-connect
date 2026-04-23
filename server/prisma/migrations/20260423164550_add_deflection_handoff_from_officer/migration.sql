-- AlterTable
ALTER TABLE "Deflection" ADD COLUMN     "handoffFromOfficerId" UUID;

-- AddForeignKey
ALTER TABLE "Deflection" ADD CONSTRAINT "Deflection_handoffFromOfficerId_fkey" FOREIGN KEY ("handoffFromOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
