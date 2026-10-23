-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordHash" VARCHAR(100),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
