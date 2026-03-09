-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('LOCAL', 'AUTH0');

-- AlterTable: add auth0Sub and authMethod to users
ALTER TABLE "users" ADD COLUMN "auth0Sub" TEXT;
ALTER TABLE "users" ADD COLUMN "authMethod" "AuthMethod" NOT NULL DEFAULT 'LOCAL';

-- CreateIndex: unique constraint on auth0Sub
CREATE UNIQUE INDEX "users_auth0Sub_key" ON "users"("auth0Sub");
