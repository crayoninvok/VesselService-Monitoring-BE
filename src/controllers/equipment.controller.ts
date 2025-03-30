// src/controllers/equipment.controller.ts
import { Request, Response } from "express";
import { PrismaClient, EquipmentStatus } from "@prisma/client";
import { responseError } from "../helpers/responseError";

const prisma = new PrismaClient();

export class EquipmentController {
  /**
   * Get all equipment for a specific vessel
   * Accessible to SuperAdmin who owns the vessel and ShipAdmin assigned to the vessel
   */
  getEquipmentByVessel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vesselId } = req.params;

      if (!req.user) {
        responseError(res, "Authentication required", 401);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        const vessel = await prisma.vessel.findFirst({
          where: {
            id: vesselId,
            ownerId: req.user.superAdminId!,
            isActive: true,
          },
        });
        hasAccess = !!vessel;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: vesselId,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "Vessel not found or you don't have permission to access it",
          403
        );
        return;
      }

      // Get all equipment for this vessel
      const equipment = await prisma.equipment.findMany({
        where: {
          vesselId: vesselId,
        },
        orderBy: {
          name: "asc",
        },
        include: {
          repairJobs: {
            where: {
              OR: [
                { status: "WAITING_VENDOR" },
                { status: "PROCESS" },
                { status: "TECHNICIAN_ON_BOARD" },
                { status: "REPAIRING" },
                { status: "WAITING_SPAREPARTS" },
              ],
            },
            select: {
              id: true,
              title: true,
              status: true,
              vendorId: true,
              vendor: {
                select: {
                  companyName: true,
                  personInCharge: true,
                },
              },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: equipment,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Get equipment by ID
   * Accessible to SuperAdmin who owns the vessel and ShipAdmin assigned to the vessel
   */
  getEquipmentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user) {
        responseError(res, "Authentication required", 401);
        return;
      }

      // Get equipment with its vessel
      const equipment = await prisma.equipment.findUnique({
        where: { id },
        include: {
          vessel: true,
          repairJobs: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              vendor: {
                select: {
                  companyName: true,
                  personInCharge: true,
                  logoUrl: true,
                  id: true,
                },
              },
              statusUpdates: {
                orderBy: {
                  updatedAt: "desc",
                },
              },
            },
          },
        },
      });

      if (!equipment) {
        responseError(res, "Equipment not found", 404);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        hasAccess = equipment.vessel.ownerId === req.user.superAdminId;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: equipment.vesselId,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "You don't have permission to access this equipment",
          403
        );
        return;
      }

      res.status(200).json({
        success: true,
        data: equipment,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Create new equipment for a vessel
   * Only accessible to SuperAdmin who owns the vessel
   */
  createEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        vesselId,
        name,
        category,
        manufacturer,
        model,
        serialNumber,
        installationDate,
        status,
        lastInspectionDate,
        nextInspectionDate,
      } = req.body;

      if (!req.user?.superAdminId) {
        responseError(res, "Only Super Admins can create equipment", 403);
        return;
      }

      // Check if vessel exists and belongs to this SuperAdmin
      const vessel = await prisma.vessel.findFirst({
        where: {
          id: vesselId,
          ownerId: req.user.superAdminId,
          isActive: true,
        },
      });

      if (!vessel) {
        responseError(
          res,
          "Vessel not found or you don't have permission to add equipment to it",
          404
        );
        return;
      }

      // Validate status if provided
      if (status && !Object.values(EquipmentStatus).includes(status)) {
        responseError(res, "Invalid equipment status", 400);
        return;
      }

      // Create equipment
      const equipment = await prisma.equipment.create({
        data: {
          vesselId,
          name,
          category,
          manufacturer: manufacturer || null,
          model: model || null,
          serialNumber: serialNumber || null,
          installationDate: installationDate ? new Date(installationDate) : null,
          status: status || "NORMAL",
          lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null,
          nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: "Equipment created successfully",
        data: equipment,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Update equipment
   * Only accessible to SuperAdmin who owns the vessel or ShipAdmin assigned to the vessel
   */
  updateEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        name,
        category,
        manufacturer,
        model,
        serialNumber,
        installationDate,
        status,
        lastInspectionDate,
        nextInspectionDate,
      } = req.body;

      if (!req.user) {
        responseError(res, "Authentication required", 401);
        return;
      }

      // Get equipment with its vessel
      const equipment = await prisma.equipment.findUnique({
        where: { id },
        include: {
          vessel: true,
        },
      });

      if (!equipment) {
        responseError(res, "Equipment not found", 404);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        hasAccess = equipment.vessel.ownerId === req.user.superAdminId;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: equipment.vesselId,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "You don't have permission to update this equipment",
          403
        );
        return;
      }

      // Validate status if provided
      if (status && !Object.values(EquipmentStatus).includes(status)) {
        responseError(res, "Invalid equipment status", 400);
        return;
      }

      // Update equipment
      const updatedEquipment = await prisma.equipment.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(category && { category }),
          manufacturer: manufacturer === undefined ? equipment.manufacturer : manufacturer,
          model: model === undefined ? equipment.model : model,
          serialNumber: serialNumber === undefined ? equipment.serialNumber : serialNumber,
          installationDate: installationDate === undefined 
            ? equipment.installationDate 
            : installationDate ? new Date(installationDate) : null,
          ...(status && { status }),
          lastInspectionDate: lastInspectionDate === undefined 
            ? equipment.lastInspectionDate 
            : lastInspectionDate ? new Date(lastInspectionDate) : null,
          nextInspectionDate: nextInspectionDate === undefined 
            ? equipment.nextInspectionDate 
            : nextInspectionDate ? new Date(nextInspectionDate) : null,
        },
      });

      res.status(200).json({
        success: true,
        message: "Equipment updated successfully",
        data: updatedEquipment,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Delete equipment
   * Only accessible to SuperAdmin who owns the vessel
   */
  deleteEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user?.superAdminId) {
        responseError(res, "Only Super Admins can delete equipment", 403);
        return;
      }

      // Get equipment with its vessel
      const equipment = await prisma.equipment.findUnique({
        where: { id },
        include: {
          vessel: true,
          repairJobs: true,
        },
      });

      if (!equipment) {
        responseError(res, "Equipment not found", 404);
        return;
      }

      // Verify ownership
      if (equipment.vessel.ownerId !== req.user.superAdminId) {
        responseError(
          res,
          "You don't have permission to delete this equipment",
          403
        );
        return;
      }

      // Check if the equipment has any active repair jobs
      const hasActiveRepairJobs = equipment.repairJobs.some(
        (job) =>
          job.status !== "SUCCESS" &&
          job.status !== "CANCELLED" &&
          job.status !== "STILL_DAMAGED"
      );

      if (hasActiveRepairJobs) {
        responseError(
          res,
          "Cannot delete equipment with active repair jobs",
          400
        );
        return;
      }

      // Delete the equipment
      await prisma.equipment.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: "Equipment deleted successfully",
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };

  /**
   * Update equipment status
   * Accessible to SuperAdmin who owns the vessel and ShipAdmin assigned to the vessel
   */
  updateEquipmentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!req.user) {
        responseError(res, "Authentication required", 401);
        return;
      }

      // Validate status
      if (!Object.values(EquipmentStatus).includes(status)) {
        responseError(res, "Invalid equipment status", 400);
        return;
      }

      // Get equipment with its vessel
      const equipment = await prisma.equipment.findUnique({
        where: { id },
        include: {
          vessel: true,
        },
      });

      if (!equipment) {
        responseError(res, "Equipment not found", 404);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        hasAccess = equipment.vessel.ownerId === req.user.superAdminId;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: equipment.vesselId,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "You don't have permission to update this equipment",
          403
        );
        return;
      }

      // Update equipment status
      const updatedEquipment = await prisma.equipment.update({
        where: { id },
        data: {
          status,
        },
      });

      res.status(200).json({
        success: true,
        message: "Equipment status updated successfully",
        data: updatedEquipment,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };
  
  /**
   * Get equipment that requires maintenance (damaged or must repair)
   * Accessible to SuperAdmin who owns the vessel and ShipAdmin assigned to the vessel
   */
  getEquipmentNeedingMaintenance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vesselId } = req.params;

      if (!req.user) {
        responseError(res, "Authentication required", 401);
        return;
      }

      // Verify access based on user role
      let hasAccess = false;

      if (req.user.role === "SUPER_ADMIN") {
        const vessel = await prisma.vessel.findFirst({
          where: {
            id: vesselId,
            ownerId: req.user.superAdminId!,
            isActive: true,
          },
        });
        hasAccess = !!vessel;
      } else if (req.user.role === "SHIP_ADMIN") {
        const shipAdmin = await prisma.shipAdmin.findFirst({
          where: {
            userId: req.user.id,
            vesselId: vesselId,
          },
        });
        hasAccess = !!shipAdmin;
      }

      if (!hasAccess) {
        responseError(
          res,
          "Vessel not found or you don't have permission to access it",
          403
        );
        return;
      }

      // Get equipment that needs maintenance
      const equipment = await prisma.equipment.findMany({
        where: {
          vesselId: vesselId,
          OR: [
            { status: "DAMAGED" },
            { status: "MUST_REPAIR" }
          ]
        },
        orderBy: {
          name: "asc",
        },
        include: {
          repairJobs: {
            where: {
              OR: [
                { status: "WAITING_VENDOR" },
                { status: "PROCESS" },
                { status: "TECHNICIAN_ON_BOARD" },
                { status: "REPAIRING" },
                { status: "WAITING_SPAREPARTS" },
              ],
            },
            select: {
              id: true,
              title: true,
              status: true,
              vendorId: true,
              vendor: {
                select: {
                  companyName: true,
                  personInCharge: true,
                },
              },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: equipment,
      });
    } catch (error) {
      responseError(res, error, 500);
    }
  };
}