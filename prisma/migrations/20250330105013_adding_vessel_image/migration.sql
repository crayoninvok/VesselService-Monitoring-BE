-- CreateTable
CREATE TABLE "VesselImage" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VesselImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VesselImage" ADD CONSTRAINT "VesselImage_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
