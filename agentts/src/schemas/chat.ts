import { Type } from "@sinclair/typebox";
import { ErrorResponseSchema } from "./common.ts";

/**
 * Chat request schema - defines the structure for incoming chat messages
 */
export const ChatRequestSchema = Type.Object({
  threadId: Type.String({
    description: "Unique identifier for the conversation thread",
    examples: ["thread-abc123"],
    minLength: 1,
    maxLength: 100,
  }),
  message: Type.String({
    description: "The user's message or question",
    examples: ["What are the REST API guidelines?"],
    minLength: 1,
    maxLength: 5000,
  }),
  systemMessage: Type.Optional(
    Type.String({
      description: "Optional system message to provide context or instructions",
      examples: ["You are a helpful assistant focused on REST API guidelines"],
      maxLength: 2000,
    }),
  ),
});

/**
 * Chat response schema - defines the structure for AI-generated responses
 */
export const ChatResponseSchema = Type.Object({
  answer: Type.String({
    description: "AI-generated response to the user's query",
    examples: [
      "Based on the retrieved documents, REST API guidelines emphasize proper HTTP status codes, resource naming conventions, and stateless design. The guidelines recommend using nouns for resources and HTTP verbs for actions.",
    ],
  }),
  threadId: Type.String({
    description: "The thread ID this response belongs to",
    examples: ["thread-abc123"],
  }),
  timestamp: Type.Optional(
    Type.String({
      format: "date-time",
      description: "When the response was generated",
      examples: ["2025-09-29T12:00:00.000Z"],
    }),
  ),
});

/**
 * Thread history item schema
 */
export const ThreadMessageSchema = Type.Object({
  id: Type.String({
    description: "Unique message identifier",
    examples: ["msg-123"],
  }),
  role: Type.Union([Type.Literal("user"), Type.Literal("assistant")], {
    description: "Who sent the message",
    examples: ["user", "assistant"],
  }),
  content: Type.String({
    description: "Message content",
    examples: ["What are the guidelines?", "Here are the guidelines..."],
  }),
  timestamp: Type.String({
    format: "date-time",
    description: "When the message was created",
    examples: ["2025-09-29T12:00:00.000Z"],
  }),
});

/**
 * Thread history response schema
 */
export const ThreadHistoryResponseSchema = Type.Object({
  threadId: Type.String({
    description: "The thread identifier",
    examples: ["thread-abc123"],
  }),
  messages: Type.Array(ThreadMessageSchema, {
    description: "Array of messages in chronological order",
  }),
  totalMessages: Type.Number({
    description: "Total number of messages in the thread",
    examples: [5],
  }),
});

/**
 * Streaming event schemas for Server-Sent Events
 */

// Base event data that all streaming events share
const BaseStreamEventSchema = Type.Object({
  messageId: Type.String({
    description: "Unique identifier for this streaming session",
    examples: ["msg-1727632800123-abc123def"],
  }),
  timestamp: Type.String({
    format: "date-time",
    description: "When this event was generated",
    examples: ["2025-09-29T12:00:00.000Z"],
  }),
});

// Start event - initializes streaming session
export const StreamStartEventSchema = Type.Intersect([
  BaseStreamEventSchema,
  Type.Object({
    threadId: Type.String({
      description: "Thread ID for this conversation",
      examples: ["thread-abc123"],
    }),
  }),
]);

// Step event - workflow progress updates
export const StreamStepEventSchema = Type.Object({
  step: Type.Union(
    [
      Type.Literal("retrieval"),
      Type.Literal("ranking"),
      Type.Literal("generation"),
    ],
    {
      description: "Current workflow step being processed",
      examples: ["retrieval", "ranking", "generation"],
    },
  ),
  status: Type.Union(
    [
      Type.Literal("processing"),
      Type.Literal("started"),
      Type.Literal("complete"),
    ],
    {
      description: "Status of the current step",
      examples: ["processing", "started"],
    },
  ),
  message: Type.String({
    description: "Human-readable progress message",
    examples: ["Searching relevant documents...", "Generating response..."],
  }),
});

// Token event - content chunks during generation
export const StreamTokenEventSchema = Type.Object({
  content: Type.String({
    description: "Text content chunk",
    examples: ["Based ", "on the ", "guidelines, "],
  }),
});

// Complete event - successful completion
export const StreamCompleteEventSchema = Type.Intersect([
  BaseStreamEventSchema,
  Type.Object({
    status: Type.Literal("complete", {
      description: "Indicates successful completion",
    }),
  }),
]);

// Error event - error occurred
export const StreamErrorEventSchema = Type.Intersect([
  BaseStreamEventSchema,
  Type.Object({
    error: Type.String({
      description: "Error message",
      examples: ["Connection timeout", "Invalid thread ID"],
    }),
    step: Type.Optional(
      Type.String({
        description: "Workflow step where error occurred",
        examples: ["retrieval", "generation"],
      }),
    ),
  }),
]);

// Cancelled event - user cancellation
export const StreamCancelledEventSchema = Type.Intersect([
  BaseStreamEventSchema,
  Type.Object({
    step: Type.Optional(
      Type.String({
        description: "Workflow step when cancelled",
        examples: ["generation", "ranking"],
      }),
    ),
  }),
]);

/**
 * Union type for all possible streaming events
 * Used for TypeScript type inference
 */
export const StreamEventSchema = Type.Union([
  StreamStartEventSchema,
  StreamStepEventSchema,
  StreamTokenEventSchema,
  StreamCompleteEventSchema,
  StreamErrorEventSchema,
  StreamCancelledEventSchema,
]);

/**
 * Streaming response documentation for OpenAPI
 * Note: SSE responses can't be fully represented in OpenAPI 3.0,
 * but we document the event types and format
 */
export const StreamResponseSchema = Type.Object({
  description: Type.Literal("Server-Sent Events stream", {
    description: "Real-time streaming response using text/event-stream",
  }),
  events: Type.Object(
    {
      start: StreamStartEventSchema,
      step: StreamStepEventSchema,
      token: StreamTokenEventSchema,
      complete: StreamCompleteEventSchema,
      error: StreamErrorEventSchema,
      cancelled: StreamCancelledEventSchema,
    },
    {
      description: "Possible event types in the SSE stream",
    },
  ),
  example: Type.String({
    description: "Example SSE stream format",
    examples: [
      'event: start\ndata: {"messageId":"msg-123","threadId":"thread-abc","timestamp":"2025-09-29T12:00:00Z"}\n\nevent: step\ndata: {"step":"retrieval","status":"processing","message":"Searching documents..."}\n\nevent: token\ndata: {"content":"Based "}\n\nevent: complete\ndata: {"messageId":"msg-123","status":"complete","timestamp":"2025-09-29T12:00:05Z"}\n\n',
    ],
  }),
});

// Export error schema for chat endpoints
export { ErrorResponseSchema };
