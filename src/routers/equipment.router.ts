// src/routers/equipment.router.ts
import { Router, Request, Response, NextFunction } from "express";
import { EquipmentController } from "../controllers/equipment.controller";
import { RequestHandler } from "express-serve-static-core";
import { AuthMiddleware } from "../middleware/auth.verify";

export class EquipmentRouter {
  private router: Router;
  private equipmentController: EquipmentController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    this.equipmentController = new EquipmentController();
    this.authMiddleware = new AuthMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Get all equipment for a vessel
    this.router.get(
      "/vessel/:vesselId",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can view vessel equipment
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.equipmentController.getEquipmentByVessel as RequestHandler
    );

    // Get equipment by ID
    this.router.get(
      "/:id",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can view equipment details
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.equipmentController.getEquipmentById as RequestHandler
    );

    // Create new equipment
    this.router.post(
      "/",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.equipmentController.createEquipment as RequestHandler
    );

    // Update equipment
    this.router.put(
      "/:id",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can update equipment
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.equipmentController.updateEquipment as RequestHandler
    );

    // Delete equipment
    this.router.delete(
      "/:id",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.equipmentController.deleteEquipment as RequestHandler
    );

    // Update equipment status
    this.router.patch(
      "/:id/status",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can update equipment status
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.equipmentController.updateEquipmentStatus as RequestHandler
    );
    
    // Get equipment needing maintenance for a vessel
    this.router.get(
      "/maintenance/vessel/:vesselId",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can view equipment needing maintenance
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.equipmentController.getEquipmentNeedingMaintenance as RequestHandler
    );
  }

  getRouter(): Router {
    return this.router;
  }
}