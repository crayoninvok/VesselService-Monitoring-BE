import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/auth.controller";
import { RequestHandler } from "express-serve-static-core";
import { AuthMiddleware } from "../middleware/auth.verify";

export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.authMiddleware = new AuthMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/create/super-admin",
      this.authController.createSuperAdmin as unknown as RequestHandler
    );
    // Vendor routes
    this.router.post(
      "/register/vendor",
      this.authController.registerVendor as unknown as RequestHandler
    );

    this.router.post(
      "/login/vendor",
      this.authController.loginVendor as unknown as RequestHandler
    );

    this.router.get(
      "/verify-email/:token",
      this.authController.verifyVendorEmail as unknown as RequestHandler
    );
    this.router.put(
      "/approve-vendor/:vendorId",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.authController.approveVendor as unknown as RequestHandler
    );

    // Super Admin routes
    this.router.post(
      "/login/super-admin",
      this.authController.loginSuperAdmin as unknown as RequestHandler
    );

    // Ship Admin routes
    this.router.post(
      "/login/ship-admin",
      this.authController.loginShipAdmin as unknown as RequestHandler
    );

    this.router.post(
      "/create/ship-admin",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.authController.createShipAdmin as unknown as RequestHandler
    );

    // Routes for SuperAdmin to create users
    this.router.post(
      "/create/vendor",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.authController.createVendorByAdmin as unknown as RequestHandler
    );

    this.router.post(
      "/create/officer",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.authController.createOfficerByAdmin as unknown as RequestHandler
    );

    // Generic token verification
    this.router.get(
      "/verify-token",
      this.authMiddleware.verifyExpiredToken as unknown as RequestHandler,
      ((req: Request, res: Response, next: NextFunction) => {
        return res.status(200).json({
          message: "Token is valid",
          user: req.user,
        });
      }) as unknown as RequestHandler
    );

    // Future endpoints (currently commented out)
    /*
    // Password reset functionality
    this.router.post(
      "/reset-password",
      this.authController.requestPasswordReset as unknown as RequestHandler
    );
    
    this.router.post(
      "/verify-reset-password/:token",
      this.authController.verifyPasswordReset as unknown as RequestHandler
    );
    
    // Email change functionality
    this.router.post(
      "/request-change-email",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authController.requestChangeEmail as unknown as RequestHandler
    );
    
    this.router.post(
      "/verify-change-email/:token",
      this.authController.verifyChangeEmail as unknown as RequestHandler
    );
    */
  }

  getRouter(): Router {
    return this.router;
  }
}