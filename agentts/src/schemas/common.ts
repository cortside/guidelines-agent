import { Type } from '@sinclair/typebox';

/**
 * Common error response schema used across all endpoints
 */
export const ErrorResponseSchema = Type.Object({
  error: Type.String({ 
    description: 'Error message describing what went wrong' 
  }),
  code: Type.String({ 
    description: 'Error code for programmatic handling',
    examples: ['VALIDATION_ERROR', 'INTERNAL_ERROR', 'NOT_FOUND']
  }),
  timestamp: Type.String({ 
    format: 'date-time', 
    description: 'ISO timestamp of when the error occurred',
    examples: ['2025-09-29T12:00:00.000Z']
  })
});

/**
 * Success response for operations that don't return data
 */
export const SuccessResponseSchema = Type.Object({
  success: Type.Boolean({ 
    description: 'Indicates successful operation',
    examples: [true] 
  }),
  message: Type.Optional(Type.String({ 
    description: 'Optional success message' 
  }))
});

/**
 * Common response headers
 */
export const CommonHeaders = Type.Object({
  'Content-Type': Type.String({ 
    description: 'Content type of the response',
    examples: ['application/json']
  }),
  'X-Request-ID': Type.Optional(Type.String({ 
    description: 'Unique request identifier for tracing' 
  }))
});
