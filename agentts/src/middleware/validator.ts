import { Request, Response, NextFunction } from "express";
import { ValidationError } from "./errorHandler.js";

// Middleware to validate chat request
export function validateChatRequest(req: Request, res: Response, next: NextFunction): void {
  const { threadId, message } = req.body;

  if (!threadId || typeof threadId !== "string") {
    throw new ValidationError("threadId is required and must be a string");
  }

  if (!message || typeof message !== "string") {
    throw new ValidationError("message is required and must be a string");
  }

  if (threadId.trim().length === 0) {
    throw new ValidationError("threadId cannot be empty");
  }

  if (message.trim().length === 0) {
    throw new ValidationError("message cannot be empty");
  }

  if (message.length > 10000) {
    throw new ValidationError("message cannot exceed 10000 characters");
  }

  next();
}

// Middleware to validate thread ID parameter
export function validateThreadId(req: Request, res: Response, next: NextFunction): void {
  const { threadId } = req.params;

  if (!threadId || typeof threadId !== "string") {
    throw new ValidationError("threadId parameter is required and must be a string");
  }

  if (threadId.trim().length === 0) {
    throw new ValidationError("threadId parameter cannot be empty");
  }

  next();
}
