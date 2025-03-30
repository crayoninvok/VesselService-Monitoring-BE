// src/routers/vessel.router.ts
import { Router, Request, Response, NextFunction } from "express";
import { VesselController } from "../controllers/vessel.controller";
import { RequestHandler } from "express-serve-static-core";
import { AuthMiddleware } from "../middleware/auth.verify";
import { uploadVesselImages, handleMulterError } from "../middleware/multer.config";

export class VesselRouter {
  private router: Router;
  private vesselController: VesselController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    this.vesselController = new VesselController();
    this.authMiddleware = new AuthMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Vessel management routes
    this.router.post(
      "/",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      uploadVesselImages as RequestHandler, // Changed to support multiple images
      handleMulterError as RequestHandler,
      this.vesselController.createVessel as RequestHandler
    );

    this.router.get(
      "/",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.vesselController.getVessels as RequestHandler
    );

    this.router.get(
      "/:id",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.vesselController.getVesselById as RequestHandler
    );

    this.router.put(
      "/:id",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      uploadVesselImages as RequestHandler, // Changed to support multiple images
      handleMulterError as RequestHandler,
      this.vesselController.updateVessel as RequestHandler
    );

    this.router.delete(
      "/:id",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.vesselController.softDeleteVessel as RequestHandler
    );

    // Vessel images routes
    this.router.post(
      "/:id/upload-images",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      uploadVesselImages as RequestHandler, // Changed to support multiple images
      handleMulterError as RequestHandler,
      this.vesselController.uploadVesselImages as RequestHandler // New method name
    );

    this.router.get(
      "/:id/images",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can view vessel images
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.vesselController.getVesselImages as RequestHandler
    );

    this.router.delete(
      "/:vesselId/images/:imageId",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.vesselController.deleteVesselImage as RequestHandler
    );

    this.router.patch(
      "/:vesselId/images/:imageId/set-main",
      this.authMiddleware.verifyToken as RequestHandler,
      this.authMiddleware.isSuperAdmin as RequestHandler,
      this.vesselController.setMainVesselImage as RequestHandler
    );

    // AIS data routes
    this.router.post(
      "/:id/ais",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can add AIS data
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.vesselController.addAISData as RequestHandler
    );

    this.router.put(
      "/ais/:aisId",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can update AIS data
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.vesselController.updateAISData as RequestHandler
    );

    this.router.get(
      "/:id/ais/history",
      this.authMiddleware.verifyToken as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        // Both SuperAdmin and ShipAdmin can view AIS history
        if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'SHIP_ADMIN')) {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      }) as RequestHandler,
      this.vesselController.getAISHistory as RequestHandler
    );
  }

  getRouter(): Router {
    return this.router;
  }
}