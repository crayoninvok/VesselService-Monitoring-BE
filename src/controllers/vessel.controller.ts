// src/controllers/vessel.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { responseError } from "../helpers/responseError";
import cloudinaryService from "../services/cloudinary.service";

const prisma = new PrismaClient();

export class VesselController {
  /**
   * Create a new vessel with multiple image uploads
   * Only SuperAdmin can create vessels
   */
  createVessel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, imo, type, flag, buildYear, grossTonnage } = req.body;

      if (!req.user?.superAdminId) {
        responseError(res, "Only Super Admins can create vessels", 403);
        return;
      }

      // Check if IMO already exists
      const existingVessel = await prisma.vessel.findUnique({
        where: { imo },
      });

      if (existingVessel) {
        responseError(res, "Vessel with this IMO number already exists", 400);
        return;
      }
      // Create vessel first
      const vessel = await prisma.vessel.create({
        data: {
          name,
          imo,
          type,
          flag,
          buildYear: parseInt(buildYear), // Convert string to integer
          grossTonnage: grossTonnage ? parseFloat(grossTonnage) : null,
          ownerId: req.user.superAdminId,
          isActive: true,
        },
      });
      // Process images if available
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          // Upload all images to Cloudinary
          const imageUrls = await cloudinaryService.uploadMultipleVesselImages(
            req.files,
            vessel.id
          );

          // Set the first image as the main vessel image
          if (imageUrls.length > 0) {
            await prisma.vessel.update({
              where: { id: vessel.id },
              data: {
                imageUrl: imageUrls[0],
              },
            });
          }

          // Store all images in the VesselImage table
          await Promise.all(
            imageUrls.map((url, index) =>
              prisma.vesselImage.create({
                data: {
                  vesselId: vessel.id,
                  imageUrl: url,
                  order: index,
                },
              })
            )
          );
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          // Continue even if image upload fails
        }
      }

      // Fetch the updated vessel with images to include in the response
      const updatedVessel = await prisma.vessel.findUnique({
        where: { id: vessel.id },
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Vessel created successfully",
        data: updatedVessel,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Get all vessels for the authenticated SuperAdmin
   */
  getVessels = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      const vessels = await prisma.vessel.findMany({
        where: {
          ownerId: req.user.superAdminId,
          isActive: true, // Only return active vessels
        },
        orderBy: {
          name: "asc",
        },
        include: {
          aisData: {
            orderBy: {
              timestamp: "desc",
            },
            take: 1,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: vessels,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Get vessel by ID
   * Only accessible to SuperAdmin who owns the vessel
   */
  getVesselById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      const vessel = await prisma.vessel.findFirst({
        where: {
          id,
          ownerId: req.user.superAdminId,
          isActive: true, // Only return active vessels
        },
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
          aisData: {
            orderBy: {
              timestamp: "desc",
            },
            take: 1,
          },
        },
      });

      if (!vessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to access it",
          404
        );
        return;
      }

      res.status(200).json({
        success: true,
        data: vessel,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Update vessel
   * Only accessible to SuperAdmin who owns the vessel
   */
  updateVessel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, type, flag, buildYear, grossTonnage } = req.body;

      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Check if vessel exists and belongs to this SuperAdmin
      const existingVessel = await prisma.vessel.findFirst({
        where: {
          id,
          ownerId: req.user.superAdminId,
          isActive: true, // Only update active vessels
        },
      });

      if (!existingVessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to update it",
          404
        );
        return;
      }

      let imageUrl = existingVessel.imageUrl;

      // Process images if available
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          // Upload all images to Cloudinary
          const imageUrls = await cloudinaryService.uploadMultipleVesselImages(
            req.files,
            id
          );

          // Set the first image as the main vessel image
          if (imageUrls.length > 0) {
            imageUrl = imageUrls[0];
          }

          // Get the current highest order value
          const highestOrder = await prisma.vesselImage.findFirst({
            where: { vesselId: id },
            orderBy: { order: "desc" },
            select: { order: true },
          });

          const startOrder = (highestOrder?.order || -1) + 1;

          // Store all new images in the VesselImage table
          await Promise.all(
            imageUrls.map((url, index) =>
              prisma.vesselImage.create({
                data: {
                  vesselId: id,
                  imageUrl: url,
                  order: startOrder + index,
                },
              })
            )
          );
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          // Continue even if image upload fails
        }
      }

      const updatedVessel = await prisma.vessel.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(flag && { flag }),
          ...(buildYear && { buildYear }),
          ...(grossTonnage !== undefined && {
            grossTonnage: grossTonnage
              ? parseFloat(grossTonnage.toString())
              : null,
          }),
          imageUrl,
        },
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Vessel updated successfully",
        data: updatedVessel,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Soft delete vessel
   * Only accessible to SuperAdmin who owns the vessel
   */
  softDeleteVessel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Check if vessel exists and belongs to this SuperAdmin
      const existingVessel = await prisma.vessel.findFirst({
        where: {
          id,
          ownerId: req.user.superAdminId,
          isActive: true, // Only delete active vessels
        },
      });

      if (!existingVessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to delete it",
          404
        );
        return;
      }

      // Soft delete by setting isActive to false
      await prisma.vessel.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      res.status(200).json({
        success: true,
        message: "Vessel deleted successfully",
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Upload multiple vessel images
   * Only accessible to SuperAdmin who owns the vessel
   */
  uploadVesselImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Check if vessel exists and belongs to this SuperAdmin
      const existingVessel = await prisma.vessel.findFirst({
        where: {
          id,
          ownerId: req.user.superAdminId,
          isActive: true,
        },
      });

      if (!existingVessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to update it",
          404
        );
        return;
      }

      // Check if files exist in request
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        responseError(res, "No image files provided", 400);
        return;
      }

      try {
        // Upload all images to Cloudinary
        const imageUrls = await cloudinaryService.uploadMultipleVesselImages(
          req.files,
          id
        );

        // Update vessel with the first image as the main image if none exists
        if (
          existingVessel.imageUrl ===
          "https://vessel-mgmt-public.s3.ap-southeast-1.amazonaws.com/default-vessel.png"
        ) {
          await prisma.vessel.update({
            where: { id },
            data: {
              imageUrl: imageUrls[0],
            },
          });
        }

        // Get the current highest order value
        const highestOrder = await prisma.vesselImage.findFirst({
          where: { vesselId: id },
          orderBy: { order: "desc" },
          select: { order: true },
        });

        const startOrder = (highestOrder?.order || -1) + 1;

        // Store all new images in the VesselImage table
        await Promise.all(
          imageUrls.map((url, index) =>
            prisma.vesselImage.create({
              data: {
                vesselId: id,
                imageUrl: url,
                order: startOrder + index,
              },
            })
          )
        );

        // Get all vessel images
        const allImages = await prisma.vesselImage.findMany({
          where: { vesselId: id },
          orderBy: { order: "asc" },
        });

        res.status(200).json({
          success: true,
          message: "Vessel images uploaded successfully",
          data: {
            mainImageUrl: existingVessel.imageUrl,
            images: allImages,
          },
        });
      } catch (uploadError) {
        responseError(res, "Image upload failed", 500);
      }
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Delete a vessel image
   * Only accessible to SuperAdmin who owns the vessel
   */
  deleteVesselImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vesselId, imageId } = req.params;

      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Check if vessel exists and belongs to this SuperAdmin
      const existingVessel = await prisma.vessel.findFirst({
        where: {
          id: vesselId,
          ownerId: req.user.superAdminId,
          isActive: true,
        },
      });

      if (!existingVessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to update it",
          404
        );
        return;
      }

      // Find the image
      const image = await prisma.vesselImage.findFirst({
        where: {
          id: imageId,
          vesselId: vesselId,
        },
      });

      if (!image) {
        responseError(res, "Image not found", 404);
        return;
      }

      // Check if we're deleting the main vessel image
      if (existingVessel.imageUrl === image.imageUrl) {
        // Find another image to set as main, or revert to default
        const nextImage = await prisma.vesselImage.findFirst({
          where: {
            vesselId: vesselId,
            id: { not: imageId },
          },
          orderBy: { order: "asc" },
        });

        // Update the vessel with new main image or default
        await prisma.vessel.update({
          where: { id: vesselId },
          data: {
            imageUrl:
              nextImage?.imageUrl ||
              "https://vessel-mgmt-public.s3.ap-southeast-1.amazonaws.com/default-vessel.png",
          },
        });
      }

      // Delete the image from database
      await prisma.vesselImage.delete({
        where: { id: imageId },
      });

      // Reorder remaining images
      const remainingImages = await prisma.vesselImage.findMany({
        where: { vesselId: vesselId },
        orderBy: { order: "asc" },
      });

      await Promise.all(
        remainingImages.map((img, index) =>
          prisma.vesselImage.update({
            where: { id: img.id },
            data: { order: index },
          })
        )
      );

      res.status(200).json({
        success: true,
        message: "Vessel image deleted successfully",
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Set a specific image as the main vessel image
   * Only accessible to SuperAdmin who owns the vessel
   */
  setMainVesselImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vesselId, imageId } = req.params;

      if (!req.user?.superAdminId) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Check if vessel exists and belongs to this SuperAdmin
      const existingVessel = await prisma.vessel.findFirst({
        where: {
          id: vesselId,
          ownerId: req.user.superAdminId,
          isActive: true,
        },
      });

      if (!existingVessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to update it",
          404
        );
        return;
      }

      // Find the image
      const image = await prisma.vesselImage.findFirst({
        where: {
          id: imageId,
          vesselId: vesselId,
        },
      });

      if (!image) {
        responseError(res, "Image not found", 404);
        return;
      }

      // Update the vessel with the new main image
      const updatedVessel = await prisma.vessel.update({
        where: { id: vesselId },
        data: {
          imageUrl: image.imageUrl,
        },
      });

      res.status(200).json({
        success: true,
        message: "Main vessel image updated successfully",
        data: {
          imageUrl: updatedVessel.imageUrl,
        },
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Get all vessel images
   * Accessible to SuperAdmin and ShipAdmin
   */
  getVesselImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        const vessel = await prisma.vessel.findFirst({
          where: {
            id,
            ownerId: req.user.superAdminId!,
            isActive: true,
          },
        });
        hasAccess = !!vessel;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: id,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "Vessel not found or you don't have permission to access it",
          404
        );
        return;
      }

      // Get vessel with main image
      const vessel = await prisma.vessel.findUnique({
        where: { id },
      });

      if (!vessel) {
        responseError(res, "Vessel not found", 404);
        return;
      }

      // Get all vessel images
      const images = await prisma.vesselImage.findMany({
        where: { vesselId: id },
        orderBy: { order: "asc" },
      });

      res.status(200).json({
        success: true,
        data: {
          mainImageUrl: vessel.imageUrl,
          images: images,
        },
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Add AIS data manually for a vessel
   * Only accessible to SuperAdmin who owns the vessel or ShipAdmin assigned to the vessel
   */
  addAISData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { latitude, longitude, speed, course, destination, eta } = req.body;

      if (!req.user) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        const vessel = await prisma.vessel.findFirst({
          where: {
            id,
            ownerId: req.user.superAdminId!,
            isActive: true,
          },
        });
        hasAccess = !!vessel;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: id,
          },
        });

        if (shipAdmin) {
          const vessel = await prisma.vessel.findUnique({
            where: {
              id: shipAdmin.vesselId,
              isActive: true,
            },
          });
          hasAccess = !!vessel;
        }
      }

      if (!hasAccess) {
        responseError(
          res,
          "Vessel not found or you don't have permission to add AIS data",
          404
        );
        return;
      }

      // Validate required fields
      if (latitude === undefined || longitude === undefined) {
        responseError(res, "Latitude and longitude are required", 400);
        return;
      }

      // Create AIS data
      const aisData = await prisma.aISData.create({
        data: {
          vesselId: id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          speed: speed ? parseFloat(speed) : null,
          course: course ? parseFloat(course) : null,
          destination: destination || null,
          eta: eta ? new Date(eta) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: "AIS data added successfully",
        data: aisData,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Update AIS data
   * Only accessible to SuperAdmin who owns the vessel or ShipAdmin assigned to the vessel
   */
  updateAISData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { aisId } = req.params;
      const { latitude, longitude, speed, course, destination, eta } = req.body;

      if (!req.user) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Get AIS data
      const aisData = await prisma.aISData.findUnique({
        where: { id: aisId },
      });

      if (!aisData) {
        responseError(res, "AIS data not found", 404);
        return;
      }

      // Check if vessel is active
      const vessel = await prisma.vessel.findUnique({
        where: {
          id: aisData.vesselId,
          isActive: true,
        },
      });

      if (!vessel) {
        responseError(res, "Vessel not found or has been deleted", 404);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        hasAccess = vessel.ownerId === req.user.superAdminId;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: aisData.vesselId,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "You don't have permission to update this AIS data",
          403
        );
        return;
      }

      // Update AIS data
      const updatedAISData = await prisma.aISData.update({
        where: { id: aisId },
        data: {
          latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
          longitude:
            longitude !== undefined ? parseFloat(longitude) : undefined,
          speed: speed !== undefined ? parseFloat(speed) : undefined,
          course: course !== undefined ? parseFloat(course) : undefined,
          destination: destination !== undefined ? destination : undefined,
          eta: eta !== undefined ? new Date(eta) : undefined,
        },
      });

      res.status(200).json({
        success: true,
        message: "AIS data updated successfully",
        data: updatedAISData,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Get vessel's AIS data history
   */
  getAISHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      if (!req.user) {
        responseError(res, "Access denied", 403);
        return;
      }

      // Check if vessel exists and is active
      const vessel = await prisma.vessel.findFirst({
        where: {
          id,
          isActive: true,
        },
      });

      if (!vessel) {
        responseError(res, "Vessel not found or has been deleted", 404);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        hasAccess = vessel.ownerId === req.user.superAdminId;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: id,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "Vessel not found or you don't have permission to access it",
          404
        );
        return;
      }

      // Get AIS data history
      const aisHistory = await prisma.aISData.findMany({
        where: {
          vesselId: id,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: parseInt(limit as string, 10),
      });

      res.status(200).json({
        success: true,
        data: aisHistory,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };
}
