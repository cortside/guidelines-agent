import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { 
  ChatRequestSchema, 
  ChatResponseSchema, 
  ThreadHistoryResponseSchema,
  ErrorResponseSchema 
} from '../schemas/chat.js';

/**
 * Fastify Chat Routes Plugin
 * Handles chat message processing and thread history retrieval
 */
const chatRoutes: FastifyPluginAsyncTypebox = async function (fastify) {
  
  /**
   * POST /chat - Process a chat message within a thread context
   * Validates input using TypeBox schemas and generates AI responses
   */
  fastify.post('/chat', {
    schema: {
      description: 'Process a chat message within a specific thread context using AI',
      summary: 'Process a chat message',
      tags: ['Chat'],
      body: ChatRequestSchema,
      response: {
        200: ChatResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { threadId, message } = request.body;
      
      // Input validation is handled by TypeBox schemas automatically
      // Additional business logic validation if needed
      if (!threadId.trim() || !message.trim()) {
        return reply.status(400).send({
          error: 'threadId and message cannot be empty',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      const chatService = fastify.chatService;
      const answer = await chatService.processMessage(threadId, message);
      
      return {
        answer,
        threadId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error processing chat message',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /threads/:threadId - Get conversation history for a thread
   * Returns complete message history with proper TypeBox validation
   */
  fastify.get('/threads/:threadId', {
    schema: {
      description: 'Retrieves the complete message history for a specific conversation thread',
      summary: 'Get thread conversation history', 
      tags: ['Threads'],
      params: {
        type: 'object',
        properties: {
          threadId: {
            type: 'string',
            description: 'Unique identifier for the conversation thread',
            minLength: 1,
            maxLength: 100
          }
        },
        required: ['threadId']
      },
      response: {
        200: ThreadHistoryResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { threadId } = request.params as { threadId: string };

      // Additional validation for empty threadId
      if (!threadId.trim()) {
        return reply.status(400).send({
          error: 'threadId cannot be empty',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      const chatService = fastify.chatService;
      const rawMessages = await chatService.getThreadHistory(threadId);
      
      if (!rawMessages || rawMessages.length === 0) {
        return reply.status(404).send({
          error: 'Thread not found',
          code: 'THREAD_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      // Transform messages to match our TypeBox schema
      const messages = rawMessages.map(msg => ({
        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
        role: msg.type === 'human' ? 'user' as const : 'assistant' as const,
        content: msg.content || '',
        timestamp: new Date().toISOString()
      }));

      return {
        threadId,
        messages,
        totalMessages: messages.length
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error retrieving thread history',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });
};

export default chatRoutes;
