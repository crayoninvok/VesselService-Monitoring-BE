import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { responseError } from "../helpers/responseError";

const prisma = new PrismaClient();

export class VesselController {
  /**
   * Create a new vessel
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

      // Create vessel
      const vessel = await prisma.vessel.create({
        data: {
          name,
          imo,
          type,
          flag,
          buildYear,
          grossTonnage: grossTonnage ? parseFloat(grossTonnage) : null,
          ownerId: req.user.superAdminId,
        },
      });

      res.status(201).json({
        success: true,
        message: "Vessel created successfully",
        data: vessel,
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
        },
        orderBy: {
          name: "asc",
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
        },
        include: {
          equipments: true,
          documents: true,
          shipAdmins: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
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
   * Delete vessel
   * Only accessible to SuperAdmin who owns the vessel
   */
  deleteVessel = async (req: Request, res: Response): Promise<void> => {
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

      // Delete vessel - Cascade delete will handle related records based on your schema
      await prisma.vessel.delete({
        where: { id },
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
   * Get the latest AIS data for a vessel
   */
  getLatestAISData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user) {
        responseError(res, "Access denied", 403);
        return;
      }

      // For SuperAdmin, check if they own the vessel
      if (req.user.role === "SUPER_ADMIN") {
        const hasAccess = await prisma.vessel.findFirst({
          where: {
            id,
            ownerId: req.user.superAdminId!,
          },
        });

        if (!hasAccess) {
          responseError(
            res,
            "Vessel not found or you don't have permission to access it",
            404
          );
          return;
        }
      }

      // For ShipAdmin, check if they're assigned to the vessel
      if (req.user.role === "SHIP_ADMIN") {
        const hasAccess = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: id,
          },
        });

        if (!hasAccess) {
          responseError(
            res,
            "Vessel not found or you don't have permission to access it",
            404
          );
          return;
        }
      }

      const aisData = await prisma.aISData.findFirst({
        where: {
          vesselId: id,
        },
        orderBy: {
          timestamp: "desc",
        },
      });

      if (!aisData) {
        responseError(res, "No AIS data found for this vessel", 404);
        return;
      }

      res.status(200).json({
        success: true,
        data: aisData,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };
}
