import { Request, Response } from "express";
import { PrismaClient, UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import emailService from "../services/email.service";

const prisma = new PrismaClient();

export class AuthController {
  // Register a new vendor
  async registerVendor(req: Request, res: Response) {
    try {
      const {
        email,
        password,
        name,
        phone,
        companyName,
        personInCharge,
        expertise,
      } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create user and vendor in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            phone,
            role: UserRole.VENDOR,
            isActive: false,
          },
        });

        // Create vendor profile
        const vendor = await tx.vendor.create({
          data: {
            userId: user.id,
            companyName,
            personInCharge,
            expertise: Array.isArray(expertise) ? expertise : [expertise],
            verificationToken,
            isVerified: false,
            isApproved: false,
          },
        });

        return { user, vendor };
      });

      // Send verification email
      await emailService.sendVerificationEmail(email, name, verificationToken);

      return res.status(201).json({
        message:
          "Vendor registered successfully. Please check your email to verify your account.",
        userId: result.user.id,
      });
    } catch (error) {
      console.error("Register vendor error:", error);
      return res
        .status(500)
        .json({ message: "Server error during registration" });
    }
  }

  // Login for vendor
  async loginVendor(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: { vendor: true },
      });

      // Check if user exists and is a vendor
      if (!user || user.role !== UserRole.VENDOR) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({
          message: "Account is not active. Please verify your email.",
        });
      }

      // Check if vendor is approved
      if (!user.vendor?.isApproved) {
        return res.status(400).json({
          message: "Your account is not yet approved by an administrator.",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          vendorId: user.vendor?.id,
        },
        process.env.JWT_SECRET || "your-jwt-secret",
        { expiresIn: "24h" }
      );

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          vendorId: user.vendor?.id,
          companyName: user.vendor?.companyName,
        },
      });
    } catch (error) {
      console.error("Login vendor error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  }

  // Login for super admin
  async loginSuperAdmin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: { superAdmin: true },
      });

      // Check if user exists and is a super admin
      if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({ message: "Account is not active" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          superAdminId: user.superAdmin?.id,
        },
        process.env.JWT_SECRET || "your-jwt-secret",
        { expiresIn: "24h" }
      );

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          superAdminId: user.superAdmin?.id,
          companyName: user.superAdmin?.companyName,
        },
      });
    } catch (error) {
      console.error("Login super admin error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  }

  // Login for ship admin
  async loginShipAdmin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          shipAdmin: {
            include: {
              vessel: true,
            },
          },
        },
      });

      // Check if user exists and is a ship admin
      if (!user || user.role !== UserRole.SHIP_ADMIN) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({ message: "Account is not active" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          shipAdminId: user.shipAdmin?.id,
          vesselId: user.shipAdmin?.vesselId,
        },
        process.env.JWT_SECRET || "your-jwt-secret",
        { expiresIn: "24h" }
      );

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          shipAdminId: user.shipAdmin?.id,
          vesselId: user.shipAdmin?.vesselId,
          vesselName: user.shipAdmin?.vessel.name,
          position: user.shipAdmin?.position,
        },
      });
    } catch (error) {
      console.error("Login ship admin error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  }

  // Verify vendor email
  async verifyVendorEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      // Find vendor with this token
      const vendor = await prisma.vendor.findFirst({
        where: { verificationToken: token },
      });

      if (!vendor) {
        return res
          .status(400)
          .json({ message: "Invalid or expired verification token" });
      }

      // Update vendor as verified and activate user
      await prisma.$transaction([
        prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            isVerified: true,
            verificationToken: null,
          },
        }),
        prisma.user.update({
          where: { id: vendor.userId },
          data: { isActive: true },
        }),
      ]);

      return res
        .status(200)
        .json({ message: "Email verified successfully. You can now login." });
    } catch (error) {
      console.error("Verify vendor email error:", error);
      return res
        .status(500)
        .json({ message: "Server error during email verification" });
    }
  }

  // Create a method for SuperAdmins to create ShipAdmins
  async createShipAdmin(req: Request, res: Response) {
    try {
      const { email, password, name, phone, vesselId, position } = req.body;

      // Get current user from token to verify they're a SuperAdmin
      const authUser = (req as any).user; // Assuming you have middleware that sets this

      if (!authUser || authUser.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({
          message: "Unauthorized. Only Super Admins can create Ship Admins",
        });
      }

      // Check if vessel exists and belongs to the super admin
      const vessel = await prisma.vessel.findFirst({
        where: {
          id: vesselId,
          ownerId: authUser.superAdminId,
        },
      });

      if (!vessel) {
        return res
          .status(404)
          .json({ message: "Vessel not found or you don't have permission" });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user and ship admin in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            phone,
            role: UserRole.SHIP_ADMIN,
            isActive: true, // Ship Admins are active by default since they're created by SuperAdmins
          },
        });

        // Create ship admin profile
        const shipAdmin = await tx.shipAdmin.create({
          data: {
            userId: user.id,
            vesselId,
            position,
          },
        });

        return { user, shipAdmin };
      });

      return res.status(201).json({
        message: "Ship Admin created successfully",
        userId: result.user.id,
        shipAdminId: result.shipAdmin.id,
      });
    } catch (error) {
      console.error("Create ship admin error:", error);
      return res
        .status(500)
        .json({ message: "Server error during Ship Admin creation" });
    }
  }
}
