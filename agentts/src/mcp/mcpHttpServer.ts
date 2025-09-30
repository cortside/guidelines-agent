/**
 * HTTP-based MCP Server Implementation
 * 
 * Model Context Protocol 2.0 server that exposes REST API standards tool
 * using HTTP transport with streaming support alongside the existing Fastify API server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { ChatService } from '../services/chatService.js';
import { RestApiStandardsTool } from './tools/restApiStandards.js';
import { config } from '../config/index.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface MCPHttpRequest extends FastifyRequest {
  body: any;
}

interface MCPHttpReply extends FastifyReply {}

export class MCPHttpServer {
  private readonly chatService: ChatService;
  private readonly restApiTool: RestApiStandardsTool;
  private readonly transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private isRunning: boolean = false;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
    this.restApiTool = new RestApiStandardsTool();
  }

  /**
   * Create a new MCP server instance for a session
   */
  private createServerInstance(): Server {
    const server = new Server(
      {
        name: 'guidelines-agent-mcp',
        version: '1.0.0',
        description: 'MCP server providing REST API standards information from Cortside Guidelines'
      },
      {
        capabilities: {
          tools: {
            listChanged: true
          }
        }
      }
    );

    // Handle tools/list requests
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('MCP Server: Received tools/list request');
      
      return {
        tools: [
          {
            name: this.restApiTool.name,
            description: this.restApiTool.description,
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['streaming', 'complete'],
                  default: 'complete',
                  description: 'Response format preference'
                }
              },
              additionalProperties: false
            }
          }
        ]
      };
    });

    // Handle tools/call requests
    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      console.log(`MCP Server: Received tools/call request for ${name}`);

      if (name !== this.restApiTool.name) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await this.restApiTool.execute(this.chatService, args as { format?: 'streaming' | 'complete' });

        // Check if result is streaming (AsyncIterable)
        if (this.isAsyncIterable(result)) {
          console.log('MCP Server: Processing streaming response');
          
          let accumulatedContent = '';
          
          // Process the streaming result
          for await (const chunk of result) {
            if (chunk.type === 'token' && chunk.data?.content) {
              accumulatedContent += chunk.data.content;
            }
          }

          // Return the accumulated content as the final result
          return {
            content: [
              {
                type: 'text',
                text: accumulatedContent || 'No content generated'
              }
            ],
            isError: false
          };
        } else {
          // Handle complete response
          console.log('MCP Server: Processing complete response');
          return result;
        }

      } catch (error) {
        console.error('MCP Server: Error executing tool:', error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    return server;
  }

  /**
   * Type guard to check if result is AsyncIterable
   */
  private isAsyncIterable(obj: any): obj is AsyncIterable<any> {
    return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
  }

  /**
   * Handle MCP HTTP requests (POST /mcp)
   */
  async handleHttpRequest(request: MCPHttpRequest, reply: MCPHttpReply): Promise<void> {
    try {
      console.log('MCP Server: Received HTTP request');
      
      const sessionId = request.headers['mcp-session-id'] as string;
      const requestBody = request.body;

      // Handle initialization request
      if (!sessionId && isInitializeRequest(requestBody)) {
        console.log('MCP Server: Processing initialization request');
        
        // Generate new session ID
        const newSessionId = this.generateSessionId();
        
        // Create new transport and server
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          enableJsonResponse: false // Use SSE streaming by default
        });
        const server = this.createServerInstance();
        
        // Set up transport cleanup
        transport.onclose = () => {
          console.log(`MCP Server: Transport closed for session ${newSessionId}`);
          this.transports.delete(newSessionId);
        };

        // Store transport
        this.transports.set(newSessionId, transport);
        
        // Connect server to transport
        await server.connect(transport);
        
        // Handle the initialization request
        await transport.handleRequest(request.raw, reply.raw, requestBody);
        return;
      }

      // Handle existing session requests
      if (sessionId && this.transports.has(sessionId)) {
        const transport = this.transports.get(sessionId)!;
        await transport.handleRequest(request.raw, reply.raw, requestBody);
        return;
      }

      // Invalid request
      reply.code(400).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Invalid or missing session ID'
        },
        id: null
      });

    } catch (error) {
      console.error('MCP Server: Error handling HTTP request:', error);
      
      if (!reply.sent) {
        reply.code(500).send({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  }

  /**
   * Handle MCP session termination (DELETE /mcp)
   */
  async handleSessionTermination(request: MCPHttpRequest, reply: MCPHttpReply): Promise<void> {
    const sessionId = request.headers['mcp-session-id'] as string;
    
    if (!sessionId || !this.transports.has(sessionId)) {
      reply.code(400).send('Invalid or missing session ID');
      return;
    }

    console.log(`MCP Server: Received session termination for ${sessionId}`);
    
    try {
      const transport = this.transports.get(sessionId)!;
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      console.error('MCP Server: Error handling session termination:', error);
      if (!reply.sent) {
        reply.code(500).send('Error processing session termination');
      }
    }
  }

  /**
   * Register HTTP routes with Fastify
   */
  registerRoutes(fastify: FastifyInstance): void {
    console.log('MCP Server: Registering HTTP routes');

    // POST /mcp - Handle MCP requests
    fastify.post('/mcp', {
      schema: {
        body: {
          type: 'object',
          additionalProperties: true
        }
      }
    }, async (request: MCPHttpRequest, reply: MCPHttpReply) => {
      await this.handleHttpRequest(request, reply);
    });

    // DELETE /mcp - Handle session termination
    fastify.delete('/mcp', async (request: MCPHttpRequest, reply: MCPHttpReply) => {
      await this.handleSessionTermination(request, reply);
    });

    // GET /mcp - Optional health check for MCP endpoint
    fastify.get('/mcp', async (request: MCPHttpRequest, reply: MCPHttpReply) => {
      reply.send({
        name: 'guidelines-agent-mcp',
        version: '1.0.0',
        description: 'MCP server providing REST API standards information',
        isRunning: this.isRunning,
        activeSessions: this.transports.size,
        toolName: this.restApiTool.name,
        toolDescription: this.restApiTool.description
      });
    });

    console.log('✅ MCP HTTP routes registered successfully');
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `mcp-session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Start the MCP HTTP server (register routes)
   */
  async start(fastify: FastifyInstance): Promise<void> {
    try {
      console.log('Starting MCP HTTP Server...');
      console.log(`MCP Tool: ${config.mcp.toolName}`);
      console.log(`MCP Description: ${config.mcp.toolDescription}`);
      console.log(`Predefined Query: ${config.mcp.predefinedQuery}`);

      // Register routes with Fastify
      this.registerRoutes(fastify);
      
      this.isRunning = true;
      console.log('✅ MCP HTTP Server started successfully');
      console.log(`   MCP endpoints available at http://${config.mcp.host}:${config.port}/mcp`);
      
    } catch (error) {
      console.error('❌ Failed to start MCP HTTP Server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP HTTP server
   */
  async stop(): Promise<void> {
    try {
      console.log('Stopping MCP HTTP Server...');
      
      // Close all active transports
      for (const [sessionId, transport] of this.transports.entries()) {
        console.log(`Closing transport for session ${sessionId}`);
        try {
          await transport.close();
        } catch (error) {
          console.error(`Error closing transport ${sessionId}:`, error);
        }
      }
      
      this.transports.clear();
      this.isRunning = false;
      console.log('✅ MCP HTTP Server stopped successfully');
      
    } catch (error) {
      console.error('❌ Error stopping MCP HTTP Server:', error);
      throw error;
    }
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      name: 'guidelines-agent-mcp',
      version: '1.0.0',
      description: 'MCP server providing REST API standards information',
      transport: 'HTTP',
      isRunning: this.isRunning,
      activeSessions: this.transports.size,
      toolName: this.restApiTool.name,
      toolDescription: this.restApiTool.description,
      endpoints: {
        mcp: '/mcp',
        health: '/mcp (GET)'
      }
    };
  }
}
