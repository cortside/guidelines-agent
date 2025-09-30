import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { ValidationError } from "./errorHandler.ts";

/**
 * Fastify plugin for custom validation logic beyond TypeBox schema validation.
 * This provides validation patterns similar to the Express validator middleware.
 */
const validationPlugin: FastifyPluginAsyncTypebox = async function (fastify) {
  // Custom validation utilities
  const validators = {
    /**
     * Validate thread ID format and constraints
     */
    validateThreadId: (threadId: string): void => {
      if (!threadId || typeof threadId !== "string") {
        throw new ValidationError("threadId is required and must be a string");
      }

      if (threadId.trim().length === 0) {
        throw new ValidationError("threadId cannot be empty");
      }

      // Additional thread ID format validation
      if (threadId.length > 100) {
        throw new ValidationError("threadId cannot exceed 100 characters");
      }

      // Check for valid characters (alphanumeric, hyphens, underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(threadId)) {
        throw new ValidationError(
          "threadId must contain only alphanumeric characters, hyphens, and underscores",
        );
      }
    },

    /**
     * Validate chat message format and constraints
     */
    validateChatMessage: (message: string): void => {
      if (!message || typeof message !== "string") {
        throw new ValidationError("message is required and must be a string");
      }

      if (message.trim().length === 0) {
        throw new ValidationError("message cannot be empty");
      }

      if (message.length > 10000) {
        throw new ValidationError("message cannot exceed 10000 characters");
      }

      // Check for potentially harmful content patterns
      if (message.includes("<script") || message.includes("javascript:")) {
        throw new ValidationError(
          "message contains potentially harmful content",
        );
      }
    },

    /**
     * Validate thread name format and constraints
     */
    validateThreadName: (name: string): void => {
      if (name && typeof name !== "string") {
        throw new ValidationError("thread name must be a string");
      }

      if (name && name.length > 200) {
        throw new ValidationError("thread name cannot exceed 200 characters");
      }

      // Allow empty names (optional parameter)
      if (name && name.trim().length === 0) {
        throw new ValidationError("thread name cannot be only whitespace");
      }
    },

    /**
     * Validate pagination parameters
     */
    validatePagination: (limit?: number, offset?: number): void => {
      if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new ValidationError(
            "limit must be an integer between 1 and 100",
          );
        }
      }

      if (offset !== undefined) {
        if (!Number.isInteger(offset) || offset < 0) {
          throw new ValidationError("offset must be a non-negative integer");
        }
      }
    },
  };

  // Register validators on fastify instance for use in routes
  fastify.decorate("validators", validators);

  // Pre-validation hook for enhanced validation
  fastify.addHook("preValidation", async (request, reply) => {
    // This hook runs before TypeBox validation
    // Can be used for custom pre-validation logic

    // Example: Log validation attempts for monitoring
    if (process.env.NODE_ENV === "development") {
      request.log.debug(
        {
          url: request.url,
          method: request.method,
          body: request.body,
          params: request.params,
          query: request.query,
        },
        "Validation starting",
      );
    }
  });

  // Validation functions for different endpoint types
  const validateChatEndpoint = (request: {
    method: string;
    url: string;
    body: unknown;
  }) => {
    if (request.method === "POST" && request.url === "/chat") {
      const body = request.body as { threadId?: string; message?: string };
      if (body.threadId) validators.validateThreadId(body.threadId);
      if (body.message) validators.validateChatMessage(body.message);
    }
  };

  const validateThreadEndpoints = (request: {
    method: string;
    url: string;
    body: unknown;
    params: unknown;
  }) => {
    const { method, url } = request;

    if (method === "POST" && url === "/threads") {
      const body = request.body as { name?: string };
      if (body.name) validators.validateThreadName(body.name);
    }

    if (method === "PATCH" && url.startsWith("/threads/")) {
      const params = request.params as { threadId?: string };
      if (params.threadId) validators.validateThreadId(params.threadId);

      const body = request.body as { name?: string };
      if (body.name !== undefined) validators.validateThreadName(body.name);
    }

    if (
      (method === "GET" || method === "DELETE") &&
      url.startsWith("/threads/") &&
      !url.endsWith("/stats")
    ) {
      const params = request.params as { threadId?: string };
      if (params.threadId) validators.validateThreadId(params.threadId);
    }
  };

  const validatePaginationEndpoints = (request: {
    method: string;
    url: string;
    query: unknown;
  }) => {
    const { method, url } = request;
    if (
      method === "GET" &&
      (url === "/threads" || url.startsWith("/threads?"))
    ) {
      const query = request.query as { limit?: number; offset?: number };
      validators.validatePagination(query.limit, query.offset);
    }
  };

  // Post-validation hook for custom validation
  fastify.addHook("preHandler", async (request, reply) => {
    // This hook runs after TypeBox validation but before route handler
    // Perfect place for custom business logic validation

    validateChatEndpoint(request);
    validateThreadEndpoints(request);
    validatePaginationEndpoints(request);
  });
};

// TypeBox schemas for validation responses
export const ValidationErrorSchema = Type.Object({
  error: Type.String({ description: "Validation error message" }),
  code: Type.Literal("VALIDATION_ERROR"),
  timestamp: Type.String({ format: "date-time" }),
  field: Type.Optional(
    Type.String({ description: "Field that failed validation" }),
  ),
  value: Type.Optional(
    Type.Any({ description: "Invalid value that was provided" }),
  ),
});

export default validationPlugin;

// Type augmentation for validators
declare module "fastify" {
  interface FastifyInstance {
    validators: {
      validateThreadId: (threadId: string) => void;
      validateChatMessage: (message: string) => void;
      validateThreadName: (name: string) => void;
      validatePagination: (limit?: number, offset?: number) => void;
    };
  }
}
