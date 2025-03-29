import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { AuthMiddleware } from "../middleware/auth.verify";
import { RequestHandler } from "express-serve-static-core";

export class UserRouter {
  private router: Router;
  private userController: UserController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    this.userController = new UserController();
    this.authMiddleware = new AuthMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Get all users - SuperAdmin only
    this.router.get(
      "/",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.userController.getAllUsers as unknown as RequestHandler
    );

    // Get users by role - SuperAdmin only
    this.router.get(
      "/by-role/:role",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.userController.getUsersByRole as unknown as RequestHandler
    );

    // Get ship officers by vessel - SuperAdmin only
    this.router.get(
      "/officers/vessel/:vesselId",
      this.authMiddleware.verifyToken as unknown as RequestHandler,
      this.authMiddleware.isSuperAdmin as unknown as RequestHandler,
      this.userController.getShipOfficersByVessel as unknown as RequestHandler
    );
  }

  getRouter(): Router {
    return this.router;
  }
}