import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { config } from './config/index.ts';
import { ChatService } from './services/chatService.ts';
import { fastifyErrorHandler } from './plugins/errorHandler.ts';
import validationPlugin from './plugins/validation.ts';

const fastify = Fastify({ 
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug'
  }
}).withTypeProvider<TypeBoxTypeProvider>();

/**
 * Initialize and start the Fastify server
 */
async function startServer() {
  try {
    console.log("Starting Guidelines Agent API (Fastify)...");
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Vector Store Provider: ${config.vectorStore.provider}`);
    
    // Initialize services
    const chatService = new ChatService();
    await chatService.initialize();
    
    // Decorate fastify instance with services for easy access in routes
    fastify.decorate('chatService', chatService);
    fastify.decorate('threadService', chatService.getThreadManagementService());
    
    // Register error handler
    fastify.setErrorHandler(fastifyErrorHandler);
    
    // Register validation plugin
    await fastify.register(validationPlugin);
    
    // Register plugins
    await fastify.register(import('@fastify/cors'), {
      origin: true,
      credentials: true
    });

    // Register Swagger/OpenAPI documentation
    await fastify.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.3',
        info: {
          title: 'Guidelines Agent API',
          description: `
            A TypeScript-based API that wraps a LangGraph agent for processing documents and 
            providing intelligent responses based on the Cortside Guidelines repository.
            
            ## Features
            - Document ingestion and processing from GitHub repositories
            - Intelligent tag-based document retrieval 
            - Conversational AI with thread management
            - Vector similarity search with document ranking
            
            Built with Fastify and TypeBox for type-safe, high-performance API operations.
          `,
          version: '1.0.0',
          contact: {
            name: 'Cortside',
            url: 'https://github.com/cortside/guidelines-agent'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: 'Development server',
          },
          {
            url: 'https://api.guidelines.cortside.com',
            description: 'Production server (example)'
          }
        ],
        tags: [
          {
            name: 'Health',
            description: 'System health and status endpoints'
          },
          {
            name: 'Chat',
            description: 'Conversational AI endpoints'
          },
          {
            name: 'Threads',
            description: 'Thread management endpoints'
          }
        ]
      }
    });

    // Register Swagger UI
    await fastify.register(import('@fastify/swagger-ui'), {
      routePrefix: '/api-docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
        displayOperationId: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        defaultModelRendering: 'example',
        displayRequestDuration: true,
        tryItOutEnabled: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject, request, reply) => {
        return swaggerObject;
      },
      transformSpecificationClone: true
    });

    // Add alternative documentation routes for backward compatibility
    await fastify.register(async function (fastify) {
      fastify.get('/docs', async (request, reply) => {
        reply.redirect('/api-docs');
      });
      
      fastify.get('/api-docs.json', async (request, reply) => {
        reply.type('application/json');
        return fastify.swagger();
      });
      
      fastify.get('/api-docs.yaml', async (request, reply) => {
        reply.type('text/yaml');
        return fastify.swagger({ yaml: true });
      });
    });

    // Register route plugins
    await fastify.register(import('./routes/health.ts'));
    await fastify.register(import('./routes/chat.ts'));
    await fastify.register(import('./routes/threads.ts'));

    // Register MCP HTTP Server routes if enabled (BEFORE server starts)
    let mcpServer: any = null;
    if (config.mcp.enabled) {
      try {
        console.log('\n🔗 Setting up MCP HTTP Server...');
        const { MCPHttpServer } = await import('./mcp/mcpHttpServer.ts');
        mcpServer = new MCPHttpServer(chatService);
        await mcpServer.start(fastify);
        console.log('✅ MCP HTTP routes registered successfully!');
        console.log(`   • Tool: ${config.mcp.toolName}`);
        console.log(`   • Description: ${config.mcp.toolDescription}`);
        console.log(`   • Transport: HTTP with streaming`);
      } catch (mcpError) {
        console.error('❌ Failed to setup MCP HTTP Server:', mcpError);
        console.log('Continuing with Fastify server only...');
      }
    } else {
      console.log('📋 MCP HTTP Server disabled in configuration');
    }

    // Temporary root route for testing
    fastify.get('/', async (request, reply) => {
      return {
        message: 'Guidelines Agent API (Fastify)',
        version: '1.0.0',
        status: 'running',
        docs: `http://localhost:${config.port}/api-docs`
      };
    });

    // Start the server
    const address = await fastify.listen({ 
      port: config.port, 
      host: '0.0.0.0' 
    });

    console.log('✅ Fastify server started successfully!');
    console.log(`   • Server URL: ${address}`);
    console.log(`   • Interactive API Docs: http://localhost:${config.port}/api-docs`);
    console.log(`   • Alternative Docs: http://localhost:${config.port}/docs`);
    console.log(`   • JSON Spec: http://localhost:${config.port}/api-docs.json`);
    console.log(`   • YAML Spec: http://localhost:${config.port}/api-docs.yaml`);
    
    if (mcpServer?.isServerRunning()) {
      console.log(`   • MCP Endpoints: http://localhost:${config.port}/mcp`);
    }

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully...`);
      try {
        // Stop MCP server first if it's running
        if (mcpServer?.isServerRunning()) {
          console.log('Stopping MCP Server...');
          await mcpServer.stop();
        }
        
        // Stop Fastify server
        await fastify.close();
        console.log('All servers closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

  } catch (error) {
    console.error('❌ Failed to start Fastify server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});

// Type augmentation for Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    chatService: ChatService;
    threadService: any; // Will be properly typed in Phase 4
  }
}

export { fastify };
