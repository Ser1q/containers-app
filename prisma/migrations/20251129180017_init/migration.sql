-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('WAREHOUSE', 'TRANSIT', 'STORAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('STANDARD', 'REFRIGERATED', 'HAZARDOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('EMPTY', 'LOADED', 'IN_TRANSIT', 'MAINTENANCE', 'OTHER');

-- CreateTable
CREATE TABLE "zones" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "current_load" INTEGER NOT NULL DEFAULT 0,
    "type" "ZoneType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "type" "ContainerType" NOT NULL,
    "status" "ContainerStatus" NOT NULL,
    "zone_id" INTEGER,
    "arrival_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE UNIQUE INDEX "containers_number_key" ON "containers"("number");

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
