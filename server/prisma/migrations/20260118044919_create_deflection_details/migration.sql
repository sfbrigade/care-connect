-- CreateTable
CREATE TABLE "public"."DeflectionDetailCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeflectionDetailCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeflectionDetail" (
    "id" TEXT NOT NULL,
    "deflectionDetailCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeflectionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DeflectionToDeflectionDetail" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DeflectionToDeflectionDetail_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DeflectionToDeflectionDetail_B_index" ON "public"."_DeflectionToDeflectionDetail"("B");

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetailCategory" ADD CONSTRAINT "DeflectionDetailCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetailCategory" ADD CONSTRAINT "DeflectionDetailCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetail" ADD CONSTRAINT "DeflectionDetail_deflectionDetailCategoryId_fkey" FOREIGN KEY ("deflectionDetailCategoryId") REFERENCES "public"."DeflectionDetailCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetail" ADD CONSTRAINT "DeflectionDetail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeflectionDetail" ADD CONSTRAINT "DeflectionDetail_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DeflectionToDeflectionDetail" ADD CONSTRAINT "_DeflectionToDeflectionDetail_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Deflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DeflectionToDeflectionDetail" ADD CONSTRAINT "_DeflectionToDeflectionDetail_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."DeflectionDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
