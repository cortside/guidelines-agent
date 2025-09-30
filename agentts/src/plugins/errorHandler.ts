import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

// Error classes - keeping the same structure but adapting for Fastify
export class AppError extends Error {
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

// Error schema is defined in ../schemas/common.ts and used in route definitions

// Fastify error handler function
export async function fastifyErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Default error values
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "Internal server error";

  // Handle TypeBox validation errors from Fastify
  if (error.validation) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = `Validation failed: ${error.message}`;
    
    // Log validation errors for debugging
    request.log.warn({
      validation: error.validation,
      url: request.url,
      method: request.method,
      body: request.body
    }, 'Validation error occurred');
  }
  // Handle our custom operational errors
  else if (error instanceof AppError && error.isOperational) {
    statusCode = error.statusCode;
    code = error.code || "OPERATIONAL_ERROR";
    message = error.message;
  }
  // Handle Fastify built-in errors
  else if (error.statusCode) {
    statusCode = error.statusCode;
    code = error.code || "FASTIFY_ERROR";
    message = error.message || "Request processing error";
  }
  // Handle validation errors from other libraries
  else if (error.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = error.message;
  }
  // Handle other known error types
  else if (error.name === "CastError") {
    statusCode = 400;
    code = "INVALID_INPUT";
    message = "Invalid input format";
  }
  // Handle timeout errors
  else if (error.name === "TimeoutError") {
    statusCode = 408;
    code = "TIMEOUT_ERROR";
    message = "Request timeout";
  }
  // Log unexpected errors
  else {
    request.log.error({
      err: error,
      url: request.url,
      method: request.method,
      body: request.body,
      params: request.params,
      query: request.query,
    }, 'Unexpected error occurred');
  }

  // Build error response
  const errorResponse: any = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  };

  // Add development-only details
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query
    };
  }

  // Send error response
  reply.status(statusCode).send(errorResponse);
}

// Pre-handler hook for custom validation logic
export async function validationPreHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // This can be used for custom validation logic that goes beyond TypeBox schemas
  // Currently just a placeholder for future enhancements
}

// Error logging hook
export async function errorLoggingHook(
  request: FastifyRequest,
  reply: FastifyReply,
  error: FastifyError
): Promise<void> {
  // Enhanced error logging with request context
  request.log.error({
    err: error,
    req: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      query: request.query,
      body: request.body
    },
    res: {
      statusCode: reply.statusCode
    }
  }, 'Request error occurred');
}
