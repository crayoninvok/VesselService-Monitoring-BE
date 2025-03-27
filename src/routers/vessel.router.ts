import { Router, Request, Response } from "express";
import { RequestHandler } from "express-serve-static-core";
import { VesselController } from "../controllers/vessel.controller";
import { AuthMiddleware } from "../middleware/auth.verify";
import {
  vesselValidationSchema,
  vesselUpdateValidationSchema,
} from "../helpers/vessel.validation";
import aisService from "../services/ais.service";

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
    // Create a new vessel (SuperAdmin only)
    this.router.post(
      "/",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.authMiddleware.validateRequest(
        vesselValidationSchema
      ) as unknown as RequestHandler,
      this.vesselController.createVessel as unknown as RequestHandler
    );

    // Get all vessels for logged-in SuperAdmin
    this.router.get(
      "/",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.vesselController.getVessels as unknown as RequestHandler
    );

    // Get vessel by ID
    this.router.get(
      "/:id",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.vesselController.getVesselById as unknown as RequestHandler
    );

    // Update vessel
    this.router.put(
      "/:id",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.authMiddleware.validateRequest(
        vesselUpdateValidationSchema
      ) as unknown as RequestHandler,
      this.vesselController.updateVessel as unknown as RequestHandler
    );

    // Delete vessel
    this.router.delete(
      "/:id",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.vesselController.deleteVessel as unknown as RequestHandler
    );

    // Get latest AIS data for a vessel (accessible by both SuperAdmin and ShipAdmin)
    this.router.get(
      "/:id/ais",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isAdminLevel as unknown as RequestHandler,
      this.vesselController.getLatestAISData as unknown as RequestHandler
    );

    // Manually trigger AIS data update (SuperAdmin only)
    this.router.post(
      "/trigger-ais-update",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.handleTriggerAISUpdate as unknown as RequestHandler
    );

    // Test MyShipTracking API endpoint (SuperAdmin only) - for troubleshooting
    this.router.get(
      "/test-api/:imo",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.handleTestAPI as unknown as RequestHandler
    );
  }

  // Handler for manually triggering AIS updates
  private handleTriggerAISUpdate = (req: Request, res: Response) => {
    try {
      aisService
        .updateAllVesselsAISData()
        .then(() => {
          res.status(200).json({
            success: true,
            message: "AIS data update triggered successfully",
          });
        })
        .catch((error: any) => {
          console.error("Error triggering AIS update:", error);
          res.status(500).json({
            success: false,
            message: "Error triggering AIS update",
          });
        });
    } catch (error) {
      console.error("Error in handleTriggerAISUpdate:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Handler for testing MyShipTracking API (for troubleshooting)
  private handleTestAPI = (req: Request, res: Response) => {
    try {
      const { imo } = req.params;
      const myShipTrackingService =
        require("../services/myshiptracking.service").default;

      myShipTrackingService
        .fetchVesselPositionByIMO(imo)
        .then((result: any) => {
          res.status(200).json({
            success: !!result,
            message: result
              ? "Found vessel data"
              : "No data found for this vessel",
            data: result,
          });
        })
        .catch((error: any) => {
          console.error("Error testing API:", error);
          res.status(500).json({
            success: false,
            message: "Error testing API",
            error: error.message,
          });
        });
    } catch (error) {
      console.error("Error in handleTestAPI:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getRouter(): Router {
    return this.router;
  }
}
