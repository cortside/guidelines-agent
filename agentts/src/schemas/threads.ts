import { Type } from '@sinclair/typebox';
import { ErrorResponseSchema, SuccessResponseSchema } from './common.js';

/**
 * Thread creation request schema
 */
export const CreateThreadRequestSchema = Type.Object({
  name: Type.Optional(Type.String({
    description: 'Optional name for the thread',
    examples: ['API Guidelines Discussion'],
    maxLength: 200
  })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), {
    description: 'Optional metadata for the thread'
  }))
});

/**
 * Thread response schema (used by both individual and collection endpoints)
 */
export const ThreadSchema = Type.Object({
  threadId: Type.String({
    description: 'Unique thread identifier',
    examples: ['thread-abc123']
  }),
  name: Type.Optional(Type.String({
    description: 'Thread name if provided',
    examples: ['API Guidelines Discussion']
  })),
  createdAt: Type.String({
    format: 'date-time',
    description: 'When the thread was created',
    examples: ['2025-09-29T12:00:00.000Z']
  }),
  updatedAt: Type.String({
    format: 'date-time',
    description: 'When the thread was last active',
    examples: ['2025-09-29T12:30:00.000Z']
  }),
  messageCount: Type.Number({
    description: 'Number of messages in the thread',
    examples: [3]
  }),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), {
    description: 'Thread metadata'
  }))
});

/**
 * Create thread response schema
 */
export const CreateThreadResponseSchema = ThreadSchema;

/**
 * List threads response schema
 */
export const ListThreadsResponseSchema = Type.Object({
  threads: Type.Array(ThreadSchema, {
    description: 'Array of thread objects'
  }),
  total: Type.Number({
    description: 'Total number of threads',
    examples: [10]
  }),
  page: Type.Optional(Type.Number({
    description: 'Current page number (if paginated)',
    examples: [1]
  })),
  pageSize: Type.Optional(Type.Number({
    description: 'Page size (if paginated)',
    examples: [20]
  }))
});

/**
 * Update thread request schema
 */
export const UpdateThreadRequestSchema = Type.Object({
  name: Type.Optional(Type.String({
    description: 'Updated name for the thread',
    examples: ['Updated Discussion'],
    maxLength: 200
  })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), {
    description: 'Updated metadata for the thread'
  }))
});

/**
 * Update thread response schema
 */
export const UpdateThreadResponseSchema = ThreadSchema;

/**
 * Thread ID parameter schema
 */
export const ThreadIdParamSchema = Type.Object({
  threadId: Type.String({
    description: 'Thread identifier',
    examples: ['thread-abc123'],
    minLength: 1
  })
});

/**
 * Thread stats response schema
 */
export const ThreadStatsResponseSchema = Type.Object({
  totalThreads: Type.Number({
    description: 'Total number of threads',
    examples: [15]
  }),
  oldestThread: Type.Optional(Type.Object({
    threadId: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    name: Type.Optional(Type.String())
  }, {
    description: 'Information about the oldest thread'
  })),
  newestThread: Type.Optional(Type.Object({
    threadId: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    name: Type.Optional(Type.String())
  }, {
    description: 'Information about the newest thread'
  })),
  mostActiveThread: Type.Optional(Type.Object({
    threadId: Type.String(),
    messageCount: Type.Number(),
    name: Type.Optional(Type.String())
  }, {
    description: 'Information about the most active thread'
  })),
  averageMessageCount: Type.Number({
    description: 'Average number of messages per thread',
    examples: [3.5]
  })
});

// Re-export common schemas
export { ErrorResponseSchema, SuccessResponseSchema };
