import { FastifyReply } from "fastify";

/**
 * Utility functions for standardized response formatting in Fastify routes
 */

/**
 * Standard error response format matching our TypeBox schemas
 */
export interface ErrorResponse {
  error: string;
  code: string;
  timestamp: string;
  stack?: string;
  details?: {
    url: string;
    method: string;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
}

/**
 * Standard success response format for operations without data
 */
export interface SuccessResponse {
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Legacy API response interface for backward compatibility
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

export class ResponseFormatter {
  /**
   * Send a standardized success response with data (Fastify)
   */
  static success<T>(
    reply: FastifyReply,
    data: T,
    statusCode: number = 200
  ): void {
    reply.status(statusCode).send(data);
  }

  /**
   * Send a standardized error response (Fastify)
   */
  static error(
    reply: FastifyReply,
    message: string,
    code: string,
    statusCode: number = 500,
    additionalInfo?: { stack?: string; details?: ErrorResponse["details"] }
  ): void {
    const errorResponse: ErrorResponse = {
      error: message,
      code,
      timestamp: new Date().toISOString(),
      ...additionalInfo,
    };

    reply.status(statusCode).send(errorResponse);
  }

  /**
   * Create error response object without sending (for return-style responses)
   */
  static createErrorResponse(
    message: string,
    code: string,
    additionalInfo?: { stack?: string; details?: ErrorResponse["details"] }
  ): ErrorResponse {
    return {
      error: message,
      code,
      timestamp: new Date().toISOString(),
      ...additionalInfo,
    };
  }

  /**
   * Create success response object without sending (for return-style responses)
   */
  static createSuccessResponse(message?: string): SuccessResponse {
    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validation error for missing or empty required fields
   */
  static validationError(
    fieldName: string,
    requirement: string
  ): ErrorResponse {
    return ResponseFormatter.createErrorResponse(
      `${fieldName} ${requirement}`,
      "VALIDATION_ERROR"
    );
  }

  /**
   * Not found error for resources
   */
  static notFoundError(
    resourceType: string,
    identifier?: string
  ): ErrorResponse {
    const message = identifier
      ? `${resourceType} with identifier '${identifier}' not found`
      : `${resourceType} not found`;

    return ResponseFormatter.createErrorResponse(
      message,
      `${resourceType.toUpperCase()}_NOT_FOUND`
    );
  }

  /**
   * Internal server error with optional error details
   */
  static internalError(operation: string, error?: Error): ErrorResponse {
    return ResponseFormatter.createErrorResponse(
      `Internal server error ${operation}`,
      "INTERNAL_ERROR",
      process.env.NODE_ENV === "development" && error
        ? { stack: error.stack }
        : undefined
    );
  }

  /**
   * Service unavailable error
   */
  static serviceError(serviceName: string): ErrorResponse {
    return ResponseFormatter.createErrorResponse(
      `${serviceName} service is currently unavailable`,
      "SERVICE_UNAVAILABLE"
    );
  }
}
