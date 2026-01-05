/*
  Warnings:

  - Made the column `lastName` on table `Invite` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Invite" ALTER COLUMN "lastName" SET NOT NULL;
