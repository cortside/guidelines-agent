/**
 * MCP Stream Handler Utility
 *
 * Handles the conversion of ChatService streaming responses to MCP protocol format.
 * Integrates with the existing SSE streaming infrastructure to provide MCP-compatible responses.
 */

import { MCPStreamingResponse } from "../schemas/mcpSchemas.ts";

export interface StreamEvent {
  event: string;
  data: any;
}

export class MCPStreamHandler {
  private accumulatedContent: string = "";
  private eventBuffer: MCPStreamingResponse[] = [];

  /**
   * Convert SSE event to MCP streaming response format
   * @param event SSE event from ChatService streaming
   * @returns MCP-formatted streaming response
   */
  convertSSEToMCP(event: StreamEvent): MCPStreamingResponse {
    const timestamp = new Date().toISOString();

    switch (event.event) {
      case "start":
        return {
          type: "start",
          data: {
            message: "Started processing REST API standards query",
            ...event.data,
          },
          timestamp,
        };

      case "step":
        return {
          type: "step",
          data: {
            step: event.data.step || "Processing...",
            progress: event.data.progress,
            ...event.data,
          },
          timestamp,
        };

      case "token":
        // Accumulate tokens for final response
        if (event.data.content) {
          this.accumulatedContent += event.data.content;
        }
        return {
          type: "token",
          data: {
            content: event.data.content || "",
            totalLength: this.accumulatedContent.length,
            ...event.data,
          },
          timestamp,
        };

      case "complete":
        return {
          type: "complete",
          data: {
            message: "REST API standards query completed",
            finalContent: this.accumulatedContent || event.data.finalContent,
            totalTokens: this.accumulatedContent.length,
            ...event.data,
          },
          timestamp,
        };

      case "error":
        return {
          type: "error",
          data: {
            error: event.data.error || "Unknown error occurred",
            code: event.data.code || "PROCESSING_ERROR",
            ...event.data,
          },
          timestamp,
        };

      default:
        // Handle unknown event types gracefully
        return {
          type: "step",
          data: {
            step: `Unknown event: ${event.event}`,
            originalData: event.data,
          },
          timestamp,
        };
    }
  }

  /**
   * Process and accumulate streaming events
   * @param event Incoming stream event
   * @returns Processed MCP response
   */
  processStreamEvent(event: StreamEvent): MCPStreamingResponse {
    const mcpResponse = this.convertSSEToMCP(event);
    this.eventBuffer.push(mcpResponse);
    return mcpResponse;
  }

  /**
   * Get accumulated content from all token events
   * @returns Complete response content
   */
  getAccumulatedContent(): string {
    return this.accumulatedContent;
  }

  /**
   * Get all buffered events
   * @returns Array of all processed MCP responses
   */
  getEventBuffer(): MCPStreamingResponse[] {
    return [...this.eventBuffer];
  }

  /**
   * Reset handler state for new request
   */
  reset(): void {
    this.accumulatedContent = "";
    this.eventBuffer = [];
  }

  /**
   * Create a complete response object for non-streaming clients
   * @returns Final response with all accumulated content
   */
  createCompleteResponse(): {
    content: string;
    events: MCPStreamingResponse[];
    metadata: {
      totalEvents: number;
      totalTokens: number;
      duration: number;
    };
  } {
    const firstEvent = this.eventBuffer.find((e) => e.type === "start");
    const lastEvent = this.eventBuffer.find((e) => e.type === "complete");

    const startTime = firstEvent ? new Date(firstEvent.timestamp) : new Date();
    const endTime = lastEvent ? new Date(lastEvent.timestamp) : new Date();

    return {
      content: this.accumulatedContent,
      events: [...this.eventBuffer],
      metadata: {
        totalEvents: this.eventBuffer.length,
        totalTokens: this.accumulatedContent.length,
        duration: endTime.getTime() - startTime.getTime(),
      },
    };
  }
}
