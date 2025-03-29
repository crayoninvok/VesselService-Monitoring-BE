import { Request, Response } from "express";
import { PrismaClient, UserRole } from "@prisma/client";
import { responseError } from "../helpers/responseError";

const prisma = new PrismaClient();

export class UserController {
  /**
   * Get all users (accessible only to SuperAdmin)
   */
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify that the request is coming from a SuperAdmin
      if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
        responseError(res, "Access denied. Only Super Admins can view all users", 403);
        return;
      }

      // Get users with their role-specific details
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          superAdmin: {
            select: {
              id: true,
              companyName: true,
              position: true
            }
          },
          shipAdmin: {
            select: {
              id: true,
              position: true,
              vessel: {
                select: {
                  id: true,
                  name: true,
                  imo: true
                }
              }
            }
          },
          vendor: {
            select: {
              id: true,
              companyName: true,
              personInCharge: true,
              expertise: true,
              isVerified: true,
              isApproved: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error("Get all users error:", error);
      responseError(res, "Server error while retrieving users", 500);
    }
  };

  /**
   * Get users by role (accessible only to SuperAdmin)
   */
  getUsersByRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = req.params;
      
      // Verify that the request is coming from a SuperAdmin
      if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
        responseError(res, "Access denied. Only Super Admins can view users by role", 403);
        return;
      }

      // Validate role parameter
      if (!Object.values(UserRole).includes(role as UserRole)) {
        responseError(res, "Invalid role specified", 400);
        return;
      }

      // Get users with their role-specific details
      const users = await prisma.user.findMany({
        where: {
          role: role as UserRole
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          superAdmin: role === UserRole.SUPER_ADMIN ? {
            select: {
              id: true,
              companyName: true,
              position: true
            }
          } : undefined,
          shipAdmin: role === UserRole.SHIP_ADMIN ? {
            select: {
              id: true,
              position: true,
              vessel: {
                select: {
                  id: true,
                  name: true,
                  imo: true
                }
              }
            }
          } : undefined,
          vendor: role === UserRole.VENDOR ? {
            select: {
              id: true,
              companyName: true,
              personInCharge: true,
              expertise: true,
              isVerified: true,
              isApproved: true
            }
          } : undefined
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error("Get users by role error:", error);
      responseError(res, "Server error while retrieving users", 500);
    }
  };

  /**
   * Get ship officers for a specific vessel (accessible to SuperAdmin)
   */
  getShipOfficersByVessel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vesselId } = req.params;

      // Verify that the request is coming from a SuperAdmin
      if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
        responseError(res, "Access denied. Only Super Admins can view vessel officers", 403);
        return;
      }

      // Verify the vessel belongs to this SuperAdmin
      const vessel = await prisma.vessel.findFirst({
        where: {
          id: vesselId,
          ownerId: req.user.superAdminId!
        }
      });

      if (!vessel) {
        responseError(res, "Vessel not found or you don't have permission to access it", 404);
        return;
      }

      // Get ship officers for this vessel
      const shipOfficers = await prisma.shipAdmin.findMany({
        where: {
          vesselId
        },
        select: {
          id: true,
          position: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
              lastLogin: true
            }
          }
        },
        orderBy: {
          user: {
            name: 'asc'
          }
        }
      });

      res.status(200).json({
        success: true,
        data: shipOfficers
      });
    } catch (error) {
      console.error("Get ship officers error:", error);
      responseError(res, "Server error while retrieving ship officers", 500);
    }
  };
}