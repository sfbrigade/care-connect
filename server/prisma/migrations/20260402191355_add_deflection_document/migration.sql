-- CreateTable
CREATE TABLE "public"."DeflectionDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deflectionId" INTEGER NOT NULL,
    "formId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "DeflectionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeflectionDocument_deflectionId_formId_key" ON "public"."DeflectionDocument"("deflectionId", "formId");

-- AddForeignKey
ALTER TABLE "public"."DeflectionDocument" ADD CONSTRAINT "DeflectionDocument_deflectionId_fkey" FOREIGN KEY ("deflectionId") REFERENCES "public"."Deflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDocument" ADD CONSTRAINT "DeflectionDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDocument" ADD CONSTRAINT "DeflectionDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
