-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT NOT NULL DEFAULT 'https://vessel-mgmt-public.s3.ap-southeast-1.amazonaws.com/default-profile.png';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "logoUrl" TEXT NOT NULL DEFAULT 'https://vessel-mgmt-public.s3.ap-southeast-1.amazonaws.com/default-company-logo.png';

-- AlterTable
ALTER TABLE "Vessel" ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT 'https://vessel-mgmt-public.s3.ap-southeast-1.amazonaws.com/default-vessel.png';
