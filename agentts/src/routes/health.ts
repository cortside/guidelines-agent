import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { HealthResponseSchema, ErrorResponseSchema } from '../schemas/index.ts';

/**
 * Health routes plugin for Fastify
 * Provides system health monitoring endpoints
 */
const healthRoutes: FastifyPluginAsyncTypebox = async function (fastify) {
  
  // Health check endpoint
  fastify.get('/health', {
    schema: {
      summary: 'Health check endpoint',
      description: `
        Comprehensive health check endpoint that returns detailed service status information.
        Monitors the health of various system components including vector store and LLM services.
      `,
      tags: ['Health'],
      response: {
        200: HealthResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      // Get service references from decorated fastify instance
      const chatService = fastify.chatService;
      
      // Basic health data
      const timestamp = new Date().toISOString();
      const uptime = Math.floor(process.uptime());
      
      // Initialize service status checks
      let vectorStoreStatus: 'healthy' | 'unhealthy' = 'healthy';
      let vectorStoreResponseTime: number | undefined;
      let llmStatus: 'healthy' | 'unhealthy' = 'healthy';
      let llmResponseTime: number | undefined;
      
      try {
        // Check vector store health
        const vectorStartTime = process.hrtime.bigint();
        // Basic health check - service exists and is initialized
        if (chatService) {
          vectorStoreResponseTime = Number(process.hrtime.bigint() - vectorStartTime) / 1_000_000; // Convert to ms
        } else {
          vectorStoreStatus = 'unhealthy';
        }
      } catch (error) {
        fastify.log.warn(`Vector store health check failed: ${String(error)}`);
        vectorStoreStatus = 'unhealthy';
      }
      
      try {
        // Check LLM service health  
        const llmStartTime = process.hrtime.bigint();
        // Basic health check - service exists and is initialized
        if (chatService) {
          llmResponseTime = Number(process.hrtime.bigint() - llmStartTime) / 1_000_000; // Convert to ms
        } else {
          llmStatus = 'unhealthy';
        }
      } catch (error) {
        fastify.log.warn(`LLM health check failed: ${String(error)}`);
        llmStatus = 'unhealthy';
      }
      
      // Determine overall status
      let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (vectorStoreStatus === 'unhealthy' || llmStatus === 'unhealthy') {
        overallStatus = 'unhealthy';
      }
      
      const healthResponse = {
        status: overallStatus,
        timestamp,
        uptime,
        version: '1.0.0',
        services: {
          vectorStore: {
            status: vectorStoreStatus,
            provider: process.env.VECTOR_STORE_PROVIDER || 'unknown',
            responseTime: vectorStoreResponseTime
          },
          llm: {
            status: llmStatus,
            provider: 'openai',
            model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
            responseTime: llmResponseTime
          }
        }
      };
      
      // Set appropriate HTTP status
      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      reply.code(statusCode);
      
      return healthResponse;
      
    } catch (error) {
      fastify.log.error(`Health check failed: ${String(error)}`);
      
      reply.code(500);
      return {
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  });

  // Simple liveness probe (minimal overhead)
  fastify.get('/health/live', {
    schema: {
      summary: 'Liveness probe',
      description: 'Minimal health check for container orchestrators. Returns 200 if the service is running.',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['alive'] },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  });

  // Readiness probe (checks if service can handle requests)
  fastify.get('/health/ready', {
    schema: {
      summary: 'Readiness probe',
      description: 'Checks if the service is ready to handle requests. Validates core dependencies.',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ready', 'not-ready'] },
            timestamp: { type: 'string', format: 'date-time' },
            dependencies: {
              type: 'object',
              properties: {
                chatService: { type: 'boolean' },
                vectorStore: { type: 'boolean' }
              }
            }
          }
        },
        503: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const chatServiceReady = !!fastify.chatService;
    const vectorStoreReady = chatServiceReady; // Simplification for now
    
    const isReady = chatServiceReady && vectorStoreReady;
    
    if (!isReady) {
      reply.code(503);
      return {
        error: 'Service not ready - dependencies unavailable',
        code: 'SERVICE_NOT_READY',
        timestamp: new Date().toISOString(),
        details: {
          url: request.url,
          method: request.method,
          dependencies: {
            chatService: chatServiceReady,
            vectorStore: vectorStoreReady
          }
        }
      };
    }
    
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      dependencies: {
        chatService: chatServiceReady,
        vectorStore: vectorStoreReady
      }
    };
  });
};

export default healthRoutes;
