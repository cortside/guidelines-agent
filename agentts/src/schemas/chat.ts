import { Type } from '@sinclair/typebox';
import { ErrorResponseSchema } from './common.js';

/**
 * Chat request schema - defines the structure for incoming chat messages
 */
export const ChatRequestSchema = Type.Object({
  threadId: Type.String({ 
    description: 'Unique identifier for the conversation thread',
    examples: ['thread-abc123'],
    minLength: 1,
    maxLength: 100
  }),
  message: Type.String({ 
    description: 'The user\'s message or question',
    examples: ['What are the REST API guidelines?'],
    minLength: 1,
    maxLength: 5000
  })
});

/**
 * Chat response schema - defines the structure for AI-generated responses
 */
export const ChatResponseSchema = Type.Object({
  answer: Type.String({ 
    description: 'AI-generated response to the user\'s query',
    examples: [
      'Based on the retrieved documents, REST API guidelines emphasize proper HTTP status codes, resource naming conventions, and stateless design. The guidelines recommend using nouns for resources and HTTP verbs for actions.'
    ]
  }),
  threadId: Type.String({
    description: 'The thread ID this response belongs to',
    examples: ['thread-abc123']
  }),
  timestamp: Type.Optional(Type.String({
    format: 'date-time',
    description: 'When the response was generated',
    examples: ['2025-09-29T12:00:00.000Z']
  }))
});

/**
 * Thread history item schema
 */
export const ThreadMessageSchema = Type.Object({
  id: Type.String({
    description: 'Unique message identifier',
    examples: ['msg-123']
  }),
  role: Type.Union([
    Type.Literal('user'),
    Type.Literal('assistant')
  ], {
    description: 'Who sent the message',
    examples: ['user', 'assistant']
  }),
  content: Type.String({
    description: 'Message content',
    examples: ['What are the guidelines?', 'Here are the guidelines...']
  }),
  timestamp: Type.String({
    format: 'date-time',
    description: 'When the message was created',
    examples: ['2025-09-29T12:00:00.000Z']
  })
});

/**
 * Thread history response schema
 */
export const ThreadHistoryResponseSchema = Type.Object({
  threadId: Type.String({
    description: 'The thread identifier',
    examples: ['thread-abc123']
  }),
  messages: Type.Array(ThreadMessageSchema, {
    description: 'Array of messages in chronological order'
  }),
  totalMessages: Type.Number({
    description: 'Total number of messages in the thread',
    examples: [5]
  })
});

// Export error schema for chat endpoints
export { ErrorResponseSchema };
