import { NextFunction, Request, Response } from "express";
import { decode, JwtPayload, TokenExpiredError, verify } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { responseError } from "../helpers/responseError";

// Define User type with vessel-specific roles
type User = {
  id: string;
  email: string;
  role: UserRole;
  superAdminId?: string;
  shipAdminId?: string;
  vendorId?: string;
  vesselId?: string;
};

// Extend Express Request to include user
declare module "express" {
  interface Request {
    user?: User;
  }
}

export class AuthMiddleware {
  /**
   * Verifies JWT token and attaches user to request
   */
  verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) throw "Authentication required";

      const user = verify(
        token,
        process.env.JWT_SECRET || "your-jwt-secret"
      ) as User;
      req.user = user;
      next();
    } catch (error) {
      return responseError(res, error);
    }
  }

  /**
   * Verifies token and checks expiration
   */
  verifyExpiredToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) throw "Authentication required";

      const user = verify(
        token,
        process.env.JWT_SECRET || "your-jwt-secret"
      ) as JwtPayload;

      // Manual token expiration check
      if (user.exp && Date.now() >= user.exp * 1000) {
        throw new TokenExpiredError("Token expired", new Date(user.exp * 1000));
      }

      req.user = {
        id: user.id as string,
        email: user.email as string,
        role: user.role as UserRole,
        superAdminId: user.superAdminId as string | undefined,
        shipAdminId: user.shipAdminId as string | undefined,
        vendorId: user.vendorId as string | undefined,
        vesselId: user.vesselId as string | undefined,
      };

      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return res.status(401).json({ message: "Token expired" });
      } else {
        return responseError(res, error);
      }
    }
  }

  /**
   * Generic role checker
   */
  checkRole(role: UserRole) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) throw "Authentication required";

        const decoded = decode(token, { json: true });
        if (decoded && decoded.role === role) {
          next();
        } else {
          throw `Access denied. Required role: ${role}`;
        }
      } catch (error) {
        return responseError(res, error);
      }
    };
  }

  // Role-specific middlewares
  isSuperAdmin = this.checkRole(UserRole.SUPER_ADMIN);
  isShipAdmin = this.checkRole(UserRole.SHIP_ADMIN);
  isVendor = this.checkRole(UserRole.VENDOR);

  /**
   * Checks if user is SuperAdmin or ShipAdmin
   */
  isAdminLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) throw "Authentication required";

      const decoded = decode(token, { json: true }) as JwtPayload;
      if (
        decoded &&
        (decoded.role === UserRole.SUPER_ADMIN ||
          decoded.role === UserRole.SHIP_ADMIN)
      ) {
        next();
      } else {
        throw "Access denied. Admin level required";
      }
    } catch (error) {
      return responseError(res, error);
    }
  }

  /**
   * Checks if user is SuperAdmin or owns the vessel
   */
  isSuperAdminOrVesselOwner(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw "Authentication required";

      const { vesselId } = req.params;

      // SuperAdmin can access any vessel
      if (req.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      // ShipAdmin can only access their assigned vessel
      if (
        req.user.role === UserRole.SHIP_ADMIN &&
        req.user.vesselId === vesselId
      ) {
        return next();
      }

      throw "You do not have permission to access this vessel";
    } catch (error) {
      return responseError(res, error);
    }
  }

  /**
   * Checks if user can access specific equipment
   */
  canAccessEquipment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw "Authentication required";

      const { equipmentId } = req.params;

      // If SuperAdmin, allow access
      if (req.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      // For ShipAdmin, we need to verify the equipment belongs to their vessel
      // This would require a database check
      // This is a placeholder for the actual implementation
      // You would use prisma to check if the equipment belongs to the user's vessel

      next();
    } catch (error) {
      return responseError(res, error);
    }
  }

  /**
   * Checks if vendor can access repair job
   */
  canAccessRepairJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw "Authentication required";

      const { repairJobId } = req.params;

      // If SuperAdmin or ShipAdmin, allow access
      if (
        req.user.role === UserRole.SUPER_ADMIN ||
        req.user.role === UserRole.SHIP_ADMIN
      ) {
        return next();
      }

      // For Vendor, we need to verify the repair job is assigned to them
      // This would require a database check
      // This is a placeholder for the actual implementation
      // You would use prisma to check if the repair job is assigned to the vendor

      next();
    } catch (error) {
      return responseError(res, error);
    }
  }

  /**
   * Checks if user is verified vendor
   */
  isVerifiedVendor(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw "Authentication required";

      if (req.user.role !== UserRole.VENDOR) {
        throw "Access denied. Vendor role required";
      }

      // This would require a database check to verify if the vendor is verified
      // This is a placeholder for the actual implementation
      // You would use prisma to check vendor status

      next();
    } catch (error) {
      return responseError(res, error);
    }
  }

  /**
   * Validates request body against schema
   */
  validateRequest(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const { error } = schema.validate(req.body);
        if (error) {
          throw `Validation error: ${error.details
            .map((x: any) => x.message)
            .join(", ")}`;
        }
        next();
      } catch (error) {
        return responseError(res, error);
      }
    };
  }
}
