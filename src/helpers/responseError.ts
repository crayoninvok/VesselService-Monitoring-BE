import { Response } from "express";

/**
 * Standardized error response handler for API endpoints
 * @param res Express Response object
 * @param error Error to process
 * @param status Optional HTTP status code (defaults to 400)
 * @returns Response with appropriate error message and status code
 */
export const responseError = (
  res: Response,
  error: unknown,
  status = 400
): Response => {
  // Log the error for server-side debugging
  console.error("[Error]", error);

  // Handle different error types
  if (error instanceof Error) {
    return res.status(status).json({
      success: false,
      message: error.message || "An unexpected error occurred",
    });
  }

  // Handle string errors
  if (typeof error === "string") {
    return res.status(status).json({
      success: false,
      message: error,
    });
  }

  // Handle other error types
  return res.status(status).json({
    success: false,
    message: "An unexpected error occurred",
    error: JSON.stringify(error),
  });
};
