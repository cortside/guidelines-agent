/**
 * MCP Server Implementation
 * 
 * Model Context Protocol 2.0 server that exposes REST API standards tool
 * alongside the existing Fastify API server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { ChatService } from '../services/chatService.ts';
import { RestApiStandardsTool } from './tools/restApiStandards.ts';
import { config } from '../config/index.ts';
import { MCPServerCapabilities } from './schemas/mcpSchemas.ts';

export class MCPServer {
  private readonly chatService: ChatService;
  private readonly restApiTool: RestApiStandardsTool;
  private readonly transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private isRunning: boolean = false;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
    this.restApiTool = new RestApiStandardsTool();
  }

  /**
   * Get server capabilities for MCP protocol
   */
  private getServerCapabilities(): MCPServerCapabilities {
    return {
      tools: {
        listChanged: true
      }
    };
  }

  /**
   * Set up MCP server request handlers
   */
  private setupHandlers(): void {
    // Handle tool listing requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('MCP Server: Handling list tools request');
      
      const toolMetadata = this.restApiTool.getToolMetadata();
      
      return {
        tools: [
          {
            name: toolMetadata.name,
            description: toolMetadata.description,
            inputSchema: toolMetadata.inputSchema || {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          } as Tool
        ]
      };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      console.log(`MCP Server: Handling tool call - ${name}`);
      console.log('Arguments:', args);

      if (name !== this.restApiTool.name) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        // Execute the tool with streaming or complete response
        const result = await this.restApiTool.execute(
          this.chatService,
          args as { format?: 'streaming' | 'complete' }
        );

        // Handle streaming response
        if (this.isAsyncIterable(result)) {
          console.log('MCP Server: Processing streaming response');
          
          let accumulatedContent = '';

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

    // Handle server errors
    this.server.onerror = (error) => {
      console.error('MCP Server error:', error);
    };

    // Handle server close
    this.server.onclose = () => {
      console.log('MCP Server connection closed');
      this.isRunning = false;
    };
  }

  /**
   * Type guard to check if result is AsyncIterable
   */
  private isAsyncIterable(obj: any): obj is AsyncIterable<any> {
    return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      console.log('Starting MCP Server...');
      console.log(`MCP Tool: ${config.mcp.toolName}`);
      console.log(`MCP Description: ${config.mcp.toolDescription}`);
      console.log(`Predefined Query: ${config.mcp.predefinedQuery}`);

      // Connect using stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.isRunning = true;
      console.log('✅ MCP Server started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start MCP Server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    try {
      console.log('Stopping MCP Server...');
      
      if (this.isRunning) {
        await this.server.close();
        this.isRunning = false;
        console.log('✅ MCP Server stopped successfully');
      } else {
        console.log('MCP Server was not running');
      }
      
    } catch (error) {
      console.error('❌ Error stopping MCP Server:', error);
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
      isRunning: this.isRunning,
      toolName: this.restApiTool.name,
      toolDescription: this.restApiTool.description,
      capabilities: this.getServerCapabilities()
    };
  }
}
