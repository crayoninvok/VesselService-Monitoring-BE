import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templatesDir: string;

  constructor() {
    // Create the transporter with SMTP config from environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.EMAIL_PASSWORD || "",
      },
    });

    // Set up the templates directory
    this.templatesDir = path.join(process.cwd(), "src/templates/emails");

    // Ensure the email templates directory exists
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * Compile an email template with provided context
   */
  private async compileTemplate(
    templateName: string,
    context: any
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    const templateContent = await fs.promises.readFile(templatePath, "utf-8");
    const template = handlebars.compile(templateContent);
    return template(context);
  }

  /**
   * Send a verification email to a newly registered vendor
   * @param email Recipient email address
   * @param name Recipient name
   * @param token Verification token
   * @returns Promise resolving to info about the sent message
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<any> {
    const baseUrl = process.env.BASE_URL_BE || "http://localhost:8000";
    const verificationLink = `${baseUrl}/api/auth/verify-email/${token}`;

    // Compile the email template
    const context = {
      name,
      verificationLink,
      companyName: "Vessel Monitor System",
      supportEmail: process.env.SUPPORT_EMAIL || "support@vesselmonitor.com",
    };

    const html = await this.compileTemplate("vendor-verification", context);

    // Configure email options
    const mailOptions = {
      from: `"Vessel Monitor System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - Vessel Monitor System",
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Verification email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  }

  /**
   * Send a password reset email to a user
   * @param email Recipient email address
   * @param name Recipient name
   * @param token Reset token
   * @returns Promise resolving to info about the sent message
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string
  ): Promise<any> {
    const baseUrl = process.env.BASE_URL_BE || "http://localhost:8000";
    const resetLink = `${baseUrl}/api/auth/reset-password/${token}`;

    // Compile the email template
    const context = {
      name,
      resetLink,
      companyName: "Vessel Monitor System",
      supportEmail: process.env.SUPPORT_EMAIL || "support@vesselmonitor.com",
    };

    const html = await this.compileTemplate("password-reset", context);

    const mailOptions = {
      from: `"Vessel Monitor System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Vessel Monitor System",
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Password reset email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }
}

export default new EmailService();
