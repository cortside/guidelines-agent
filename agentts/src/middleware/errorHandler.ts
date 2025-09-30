import { Request, Response, NextFunction } from "express";
import { ApiError } from '../types/api.ts';

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ServiceError extends AppError {
  constructor(message: string) {
    super(message, 500, "SERVICE_ERROR");
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response was already sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default error values
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "Internal server error";

  // Handle operational errors (our custom errors)
  if (err instanceof AppError && err.isOperational) {
    statusCode = err.statusCode;
    code = err.code || "OPERATIONAL_ERROR";
    message = err.message;
  } 
  // Handle validation errors from other libraries
  else if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = err.message;
  }
  // Handle other known error types
  else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_INPUT";
    message = "Invalid input format";
  }
  // Log unexpected errors
  else {
    console.error("Unexpected error:", {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  }

  res.status(statusCode).json({
    error: message,
    code,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: {
        url: req.url,
        method: req.method,
      },
    }),
  });
}
