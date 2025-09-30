/**
 * REST API Standards Tool for MCP Server
 *
 * Implements the single predefined query tool that provides comprehensive information
 * about REST API features and expected standards using the existing ChatService.
 */

import {
  MCPTool,
  MCPToolResponse,
  MCPStreamingResponse,
} from "../schemas/mcpSchemas.ts";
import { MCPStreamHandler, StreamEvent } from "../utils/mcpStreamHandler.ts";
import { ChatService } from "../../services/chatService.ts";
import { config } from "../../config/index.ts";

export class RestApiStandardsTool implements MCPTool {
  public readonly name: string;
  public readonly description: string;
  public readonly inputSchema?: object;

  private readonly streamHandler: MCPStreamHandler;

  constructor() {
    this.name = config.mcp.toolName;
    this.description = config.mcp.toolDescription;
    this.inputSchema = {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["streaming", "complete"],
          default: "streaming",
          description:
            "Response format - streaming for real-time updates, complete for final result only",
        },
      },
      additionalProperties: false,
    };
    this.streamHandler = new MCPStreamHandler();
  }

  /**
   * Execute the REST API standards query using ChatService
   * @param params Tool execution parameters
   * @param chatService Shared ChatService instance
   * @returns AsyncIterable for streaming responses or Promise for complete response
   */
  async execute(
    chatService: ChatService,
    params: { format?: "streaming" | "complete" } = {},
  ): Promise<MCPToolResponse | AsyncIterable<MCPStreamingResponse>> {
    const { format = "streaming" } = params;

    // Reset handler for new request
    this.streamHandler.reset();

    // Generate unique thread ID for this MCP request
    const threadId = `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const predefinedQuery = config.mcp.predefinedQuery;

    console.log(`MCP Tool executing: ${this.name}`);
    console.log(`Query: ${predefinedQuery}`);
    console.log(`Thread ID: ${threadId}`);
    console.log(`Format: ${format}`);

    if (format === "streaming") {
      return this.executeStreaming(predefinedQuery, threadId, chatService);
    } else {
      return this.executeComplete(predefinedQuery, threadId, chatService);
    }
  }

  /**
   * Execute with streaming responses
   * @param query The predefined query
   * @param threadId Unique thread identifier
   * @param chatService ChatService instance
   * @returns AsyncIterable of streaming responses
   */
  private async *executeStreaming(
    query: string,
    threadId: string,
    chatService: ChatService,
  ): AsyncIterable<MCPStreamingResponse> {
    try {
      // Create a mock FastifyReply-like object to capture SSE events
      const mockReply = this.createMockReply();
      let streamCompleted = false;
      let streamError: Error | null = null;

      // Set up promise to handle completion/error
      const streamPromise = new Promise<void>((resolve, reject) => {
        mockReply.onEnd = () => {
          streamCompleted = true;
          resolve();
        };
        mockReply.onError = (error: Error) => {
          streamError = error;
          reject(error);
        };
      });

      // Start the streaming process
      chatService
        .processMessageStream(query, threadId, mockReply as any)
        .catch((error) => {
          streamError = error;
          console.error("MCP Tool streaming error:", error);
        });

      // Yield events as they come in
      while (!streamCompleted && !streamError) {
        const events = mockReply.getBufferedEvents();
        for (const event of events) {
          const mcpResponse = this.streamHandler.processStreamEvent(event);
          yield mcpResponse;
        }

        // Small delay to prevent tight loop
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Ensure streaming completes
      await streamPromise;

      // Yield final events if any
      const finalEvents = mockReply.getBufferedEvents();
      for (const event of finalEvents) {
        const mcpResponse = this.streamHandler.processStreamEvent(event);
        yield mcpResponse;
      }
    } catch (error) {
      console.error("MCP Tool execution error:", error);

      // Yield error response
      yield {
        type: "error",
        data: {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during tool execution",
          code: "TOOL_EXECUTION_ERROR",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute with complete response (non-streaming)
   * @param query The predefined query
   * @param threadId Unique thread identifier
   * @param chatService ChatService instance
   * @returns Complete tool response
   */
  private async executeComplete(
    query: string,
    threadId: string,
    chatService: ChatService,
  ): Promise<MCPToolResponse> {
    try {
      console.log("Executing complete (non-streaming) request...");

      // Use the regular processMessage method for non-streaming response
      const response = await chatService.processMessage(threadId, query);

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error("MCP Tool execution error (complete):", error);

      return {
        content: [
          {
            type: "text",
            text: `Error processing REST API standards query: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Create a mock FastifyReply object to capture SSE events
   * @returns Mock reply object with event capture capabilities
   */
  private createMockReply() {
    const eventBuffer: StreamEvent[] = [];
    let currentEvent = "";
    let accumulatedData = "";

    const mockReply = {
      raw: {
        writeHead: () => {},
        write: (data: string) => {
          // Parse SSE data format line by line, handling multi-call scenarios
          const lines = data.split("\n");

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              // New event started, process any pending event first
              if (currentEvent && accumulatedData) {
                try {
                  const parsedData = JSON.parse(accumulatedData);
                  eventBuffer.push({ event: currentEvent, data: parsedData });
                } catch (parseError) {
                  console.warn(
                    "MCP Mock Reply: Failed to parse SSE data:",
                    accumulatedData,
                    parseError,
                  );
                }
              }

              // Start new event
              currentEvent = line.substring(7);
              accumulatedData = "";
            } else if (line.startsWith("data: ")) {
              accumulatedData = line.substring(6);
            } else if (line === "" && currentEvent && accumulatedData) {
              // End of SSE event (blank line), process it
              try {
                const parsedData = JSON.parse(accumulatedData);
                eventBuffer.push({ event: currentEvent, data: parsedData });
              } catch (parseError) {
                console.warn(
                  "MCP Mock Reply: Failed to parse SSE data:",
                  accumulatedData,
                  parseError,
                );
              }

              // Reset for next event
              currentEvent = "";
              accumulatedData = "";
            }
          }
        },
        end: () => {
          if (mockReply.onEnd) mockReply.onEnd();
        },
      },
      getBufferedEvents: () => {
        const events = [...eventBuffer];
        eventBuffer.length = 0; // Clear buffer after reading
        return events;
      },
      onEnd: null as (() => void) | null,
      onError: null as ((error: Error) => void) | null,
    };

    return mockReply;
  }

  /**
   * Get tool metadata for MCP server registration
   * @returns Tool metadata object
   */
  getToolMetadata(): MCPTool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }
}
