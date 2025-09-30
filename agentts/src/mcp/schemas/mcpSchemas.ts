/**
 * MCP (Model Context Protocol) Schema definitions
 *
 * This file contains TypeScript type definitions for the MCP 2.0 protocol
 * used by the REST API Standards tool.
 */

import { Type, Static } from "@sinclair/typebox";

// MCP Tool Schema
export const MCPToolSchema = Type.Object({
  name: Type.String({
    description: "Unique identifier for the tool",
    examples: ["rest-api-standards"],
  }),
  description: Type.String({
    description: "Human-readable description of what the tool does",
    examples: [
      "Get comprehensive information about REST API features and expected standards",
    ],
  }),
  inputSchema: Type.Optional(
    Type.Object(
      {},
      {
        description: "JSON Schema defining the expected input parameters",
        additionalProperties: true,
      },
    ),
  ),
});

// MCP Tool Call Schema
export const MCPToolCallSchema = Type.Object({
  method: Type.Literal("tools/call"),
  params: Type.Object({
    name: Type.String({
      description: "Name of the tool to call",
    }),
    arguments: Type.Optional(
      Type.Record(Type.String(), Type.Any(), {
        description: "Arguments to pass to the tool",
      }),
    ),
  }),
});

// MCP Streaming Response Schema
export const MCPStreamingResponseSchema = Type.Object({
  type: Type.Union(
    [
      Type.Literal("start"),
      Type.Literal("step"),
      Type.Literal("token"),
      Type.Literal("complete"),
      Type.Literal("error"),
    ],
    {
      description: "Type of streaming event",
    },
  ),
  data: Type.Any({
    description: "Event-specific data payload",
  }),
  timestamp: Type.String({
    format: "date-time",
    description: "ISO timestamp when the event occurred",
  }),
});

// MCP Tool Response Schema
export const MCPToolResponseSchema = Type.Object({
  content: Type.Array(
    Type.Object({
      type: Type.Literal("text"),
      text: Type.String({
        description: "The response text content",
      }),
    }),
  ),
  isError: Type.Optional(
    Type.Boolean({
      description: "Whether this response represents an error",
    }),
  ),
});

// MCP Error Schema
export const MCPErrorSchema = Type.Object({
  code: Type.Number({
    description: "Error code following JSON-RPC conventions",
  }),
  message: Type.String({
    description: "Human-readable error message",
  }),
  data: Type.Optional(
    Type.Any({
      description: "Additional error details",
    }),
  ),
});

// MCP Server Capabilities Schema
export const MCPServerCapabilitiesSchema = Type.Object({
  tools: Type.Optional(
    Type.Object(
      {},
      {
        description: "Tool capabilities",
        additionalProperties: true,
      },
    ),
  ),
  resources: Type.Optional(
    Type.Object(
      {},
      {
        description: "Resource capabilities",
        additionalProperties: true,
      },
    ),
  ),
  prompts: Type.Optional(
    Type.Object(
      {},
      {
        description: "Prompt capabilities",
        additionalProperties: true,
      },
    ),
  ),
});

// Export TypeScript types
export type MCPTool = Static<typeof MCPToolSchema>;
export type MCPToolCall = Static<typeof MCPToolCallSchema>;
export type MCPStreamingResponse = Static<typeof MCPStreamingResponseSchema>;
export type MCPToolResponse = Static<typeof MCPToolResponseSchema>;
export type MCPError = Static<typeof MCPErrorSchema>;
export type MCPServerCapabilities = Static<typeof MCPServerCapabilitiesSchema>;
