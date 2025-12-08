-- AlterTable
ALTER TABLE "BedHold" ADD COLUMN "clientId" UUID;

-- AddForeignKey
ALTER TABLE "BedHold" ADD CONSTRAINT "BedHold_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

