import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  ChatRequestSchema,
  ChatResponseSchema,
  ThreadHistoryResponseSchema,
  ErrorResponseSchema,
} from "../schemas/chat.ts";
import { ResponseFormatter } from "../utils/responseFormatter.ts";

/**
 * Fastify Chat Routes Plugin
 * Handles chat message processing and thread history retrieval
 */
const chatRoutes: FastifyPluginAsyncTypebox = async function (fastify) {
  /**
   * POST /chat - Process a chat message within a thread context
   * Validates input using TypeBox schemas and generates AI responses
   */
  fastify.post(
    "/chat",
    {
      schema: {
        description:
          "Process a chat message within a specific thread context using AI",
        summary: "Process a chat message",
        tags: ["Chat"],
        body: ChatRequestSchema,
        response: {
          200: ChatResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { threadId, message } = request.body;

        // Input validation is handled by TypeBox schemas automatically
        // Additional business logic validation if needed
        if (!threadId.trim() || !message.trim()) {
          return ResponseFormatter.createErrorResponse(
            "threadId and message cannot be empty",
            "VALIDATION_ERROR"
          );
        }

        const chatService = fastify.chatService;
        const answer = await chatService.processMessage(threadId, message);

        return {
          answer,
          threadId,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        fastify.log.error(error);
        return ResponseFormatter.internalError(
          "processing chat message",
          error as Error
        );
      }
    }
  );

  /**
   * POST /chat/stream - Process a chat message with streaming response using Server-Sent Events
   * Provides real-time streaming of AI responses with workflow progress updates
   */
  fastify.post(
    "/chat/stream",
    {
      schema: {
        description:
          "Process a chat message with streaming response using Server-Sent Events (SSE). Returns workflow progress and token-level content streaming.",
        summary: "Process a chat message with streaming response",
        tags: ["Chat"],
        body: ChatRequestSchema,
        produces: ["text/event-stream"],
        response: {
          200: {
            description: "Server-Sent Events stream with chat responses",
            type: "string",
            format: "event-stream",
          },
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { threadId, message, systemMessage } = request.body;

        // Input validation
        if (!threadId.trim() || !message.trim()) {
          return reply
            .status(400)
            .send(
              ResponseFormatter.createErrorResponse(
                "threadId and message cannot be empty",
                "VALIDATION_ERROR"
              )
            );
        }

        // Set up AbortController for client disconnect handling
        const abortController = new AbortController();

        // Handle client disconnect
        request.socket.on("close", () => {
          console.log("Client disconnected from stream");
          abortController.abort();
        });

        const chatService = fastify.chatService;

        // Process message with streaming
        await chatService.processMessageStream(
          message,
          threadId,
          reply,
          systemMessage
        );
      } catch (error) {
        fastify.log.error(error, "Streaming error");

        // Send error as SSE event if headers not sent yet
        if (!reply.sent) {
          reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          const errorData = JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : "Unknown streaming error",
            timestamp: new Date().toISOString(),
          });
          reply.raw.write(`event: error\n`);
          reply.raw.write(`data: ${errorData}\n\n`);
          reply.raw.end();
        }
      }
    }
  );

  /**
   * GET /threads/:threadId - Get conversation history for a thread
   * Returns complete message history with proper TypeBox validation
   */
  fastify.get(
    "/threads/:threadId",
    {
      schema: {
        description:
          "Retrieves the complete message history for a specific conversation thread",
        summary: "Get thread conversation history",
        tags: ["Threads"],
        params: {
          type: "object",
          properties: {
            threadId: {
              type: "string",
              description: "Unique identifier for the conversation thread",
              minLength: 1,
              maxLength: 100,
            },
          },
          required: ["threadId"],
        },
        response: {
          200: ThreadHistoryResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { threadId } = request.params as { threadId: string };

        // Additional validation for empty threadId
        if (!threadId.trim()) {
          return ResponseFormatter.validationError(
            "threadId",
            "cannot be empty"
          );
        }

        const chatService = fastify.chatService;
        const rawMessages = await chatService.getThreadHistory(threadId);

        if (!rawMessages || rawMessages.length === 0) {
          return reply
            .status(404)
            .send(ResponseFormatter.notFoundError("Thread", threadId));
        }

        // Transform messages to match our TypeBox schema
        const messages = rawMessages.map((msg) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          role:
            msg.type === "human" ? ("user" as const) : ("assistant" as const),
          content: msg.content || "",
          timestamp: new Date().toISOString(),
        }));

        return {
          threadId,
          messages,
          totalMessages: messages.length,
        };
      } catch (error) {
        fastify.log.error(error);
        return ResponseFormatter.internalError(
          "retrieving thread history",
          error as Error
        );
      }
    }
  );
};

export default chatRoutes;
