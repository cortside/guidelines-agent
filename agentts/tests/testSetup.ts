import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { createMockChatService } from './testUtils.ts';
import { fastifyErrorHandler } from '../src/fastify-plugins/errorHandler.ts';
import validationPlugin from '../src/fastify-plugins/validation.ts';

/**
 * Create a properly configured Fastify instance for testing
 * This ensures all plugins and routes are registered in the correct order
 */
export async function createTestFastifyInstance(): Promise<FastifyInstance> {
  const fastify = Fastify({ 
    logger: false  // Disable logging during tests
  }).withTypeProvider<TypeBoxTypeProvider>();

  try {
    // Mock services first (before any plugin registration)
    const mockChatService = createMockChatService();
    const mockThreadService = {
      getAllThreads: () => ([]), // Synchronous like the real service
      createThread: async (data: any) => ({ 
        threadId: 'test-thread-123', // Use threadId to match route transformation
        name: data.name || 'Test Thread',
        createdAt: new Date(), // Use Date objects not strings
        lastActivity: new Date(), // Use lastActivity not updatedAt
        messageCount: 0
      }),
      createThreadMetadata: (threadId: string, name: string) => {
        // This method doesn't return anything, just saves metadata
      },
      getThread: async (id: string) => null,
      updateThread: async (id: string, data: any) => ({ 
        id, 
        ...data,
        updatedAt: new Date().toISOString()
      }),
      updateThreadName: (threadId: string, name: string) => {
        return true; // Return success
      },
      deleteThread: async (id: string) => ({ success: true, deletedThreadId: id }),
      getStorageStats: () => ({ // Use getStorageStats not getThreadAnalytics
        totalThreads: 0,
        averageMessageCount: 0, // matches schema
        mostActiveThread: null
      })
    };

    // Decorate fastify instance with mock services BEFORE registering plugins
    fastify.decorate('chatService', mockChatService as any);
    fastify.decorate('threadService', mockThreadService as any);

    // Register error handler
    fastify.setErrorHandler(fastifyErrorHandler);
    
    // Register validation plugin
    await fastify.register(validationPlugin);

    // Register CORS plugin
    await fastify.register(import('@fastify/cors'), {
      origin: true,
      credentials: true
    });

    // Register route plugins  
    await fastify.register(import('../src/fastify-routes/health.ts'));
    await fastify.register(import('../src/fastify-routes/chat.ts'));
    await fastify.register(import('../src/fastify-routes/threads.ts'));

    // Ensure the instance is ready
    await fastify.ready();

    return fastify;

  } catch (error) {
    console.error('Failed to create test Fastify instance:', error);
    throw error;
  }
}

/**
 * Create a minimal Fastify instance for simple tests
 */
export async function createMinimalTestFastifyInstance(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
  
  // Mock services
  fastify.decorate('chatService', createMockChatService() as any);
  
  // Register only health routes for minimal testing
  await fastify.register(import('../src/fastify-routes/health.ts'));
  await fastify.ready();
  
  return fastify;
}

// Export for use in tests
export { FastifyInstance };
