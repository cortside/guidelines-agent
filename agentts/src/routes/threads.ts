import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { 
  CreateThreadRequestSchema,
  CreateThreadResponseSchema,
  ListThreadsResponseSchema,
  UpdateThreadRequestSchema,
  UpdateThreadResponseSchema,
  ThreadIdParamSchema,
  ThreadStatsResponseSchema,
  ErrorResponseSchema,
  SuccessResponseSchema
} from '../schemas/threads.ts';
import { ResponseFormatter } from '../utils/responseFormatter.ts';

/**
 * Fastify Thread Management Routes Plugin
 * Handles thread CRUD operations and statistics
 */
const threadRoutes: FastifyPluginAsyncTypebox = async function (fastify) {

  /**
   * GET /threads/stats - Get thread storage statistics (must be before /:threadId)
   * Returns debugging and analytical information about thread storage
   */
  fastify.get('/threads/stats', {
    schema: {
      description: 'Retrieves debugging information about thread storage and analytics',
      summary: 'Get thread storage statistics',
      tags: ['Threads'],
      response: {
        200: ThreadStatsResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const threadManagementService = fastify.threadService;
      const stats = threadManagementService.getStorageStats();
      
      return stats;
    } catch (error) {
      fastify.log.error(error);
      return ResponseFormatter.internalError(
        'retrieving thread statistics',
        error as Error
      );
    }
  });

  /**
   * GET /threads - Get all conversation threads
   * Returns a list of all threads with metadata, sorted by last activity
   */
  fastify.get('/threads', {
    schema: {
      description: 'Retrieves a list of all conversation threads with metadata',
      summary: 'Get all conversation threads',
      tags: ['Threads'],
      response: {
        200: ListThreadsResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const threadManagementService = fastify.threadService;
      const threadsData = threadManagementService.getAllThreads();
      
      // Transform the data to match the schema
      const threads = threadsData.map((thread: any) => ({
        threadId: thread.threadId,
        name: thread.name,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.lastActivity.toISOString(),  // Schema expects updatedAt
        messageCount: thread.messageCount,
        metadata: thread.metadata
      }));

      return {
        threads,
        total: threads.length
      };
    } catch (error) {
      fastify.log.error(error);
      return ResponseFormatter.internalError(
        'retrieving threads',
        error as Error
      );
    }
  });

  /**
   * POST /threads - Create a new conversation thread
   * Creates a new thread with optional name and metadata
   */
  fastify.post('/threads', {
    schema: {
      description: 'Creates a new conversation thread with optional name and metadata',
      summary: 'Create a new conversation thread',
      tags: ['Threads'],
      body: CreateThreadRequestSchema,
      response: {
        201: CreateThreadResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { name, metadata } = request.body;
      const threadManagementService = fastify.threadService;
      
      // Generate new thread ID
      const threadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Create thread metadata
      threadManagementService.createThreadMetadata(threadId, name);
      
      const now = new Date().toISOString();
      
      const response: any = {
        threadId: threadId,
        name,
        createdAt: now,
        updatedAt: now,
        messageCount: 0
      };
      
      if (metadata !== undefined) {
        response.metadata = metadata;
      }
      
      return reply.status(201).send(response);
    } catch (error) {
      fastify.log.error(error);
      return ResponseFormatter.internalError(
        'creating thread',
        error as Error
      );
    }
  });

  /**
   * PATCH /threads/:threadId - Update thread properties
   * Updates thread properties like name and metadata
   */
  fastify.patch('/threads/:threadId', {
    schema: {
      description: 'Updates thread properties like name and metadata',
      summary: 'Update thread properties',
      tags: ['Threads'],
      params: ThreadIdParamSchema,
      body: UpdateThreadRequestSchema,
      response: {
        200: UpdateThreadResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { threadId } = request.params as { threadId: string };
      const { name, metadata } = request.body;
      const threadManagementService = fastify.threadService;

      if (!threadId.trim()) {
        return reply.status(400).send({
          error: 'Thread ID cannot be empty',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      if (!name || typeof name !== 'string') {
        return reply.status(400).send({
          error: 'Name is required and must be a string',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      const success = threadManagementService.updateThreadName(threadId, name);
      
      if (!success) {
        return ResponseFormatter.notFoundError('Thread', threadId);
      }

      // Get updated thread data
      const threads = threadManagementService.getAllThreads();
      const updatedThread = threads.find((t: any) => t.threadId === threadId);
      
      if (!updatedThread) {
        return ResponseFormatter.notFoundError('Thread', threadId);
      }

      return {
        threadId: updatedThread.threadId,
        name: updatedThread.name,
        createdAt: updatedThread.createdAt.toISOString(),
        updatedAt: updatedThread.lastActivity.toISOString(),
        messageCount: updatedThread.messageCount,
        metadata
      };
    } catch (error) {
      fastify.log.error(error);
      return ResponseFormatter.internalError(
        'updating thread',
        error as Error
      );
    }
  });

  /**
   * DELETE /threads/:threadId - Delete a conversation thread
   * Deletes a conversation thread and its metadata
   */
  fastify.delete('/threads/:threadId', {
    schema: {
      description: 'Deletes a conversation thread and its metadata',
      summary: 'Delete a conversation thread',
      tags: ['Threads'],
      params: ThreadIdParamSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { threadId } = request.params as { threadId: string };
      const threadManagementService = fastify.threadService;

      if (!threadId.trim()) {
        return reply.status(400).send({
          error: 'Thread ID cannot be empty',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      const success = threadManagementService.deleteThread(threadId);
      
      if (!success) {
        return ResponseFormatter.notFoundError('Thread', threadId);
      }

      return {
        success: true,
        message: `Thread ${threadId} deleted successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(error);
      return ResponseFormatter.internalError(
        'deleting thread',
        error as Error
      );
    }
  });
};

export default threadRoutes;
