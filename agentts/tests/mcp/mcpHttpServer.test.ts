import { test, describe } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import { MCPHttpServer } from "../../src/mcp/mcpHttpServer.js";
import { createMockChatService } from "../testUtils.js";

describe("MCP HTTP Server Integration", () => {
  test("Server should register HTTP routes correctly", async () => {
    const fastify = Fastify({ logger: false });
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    try {
      // Start the MCP HTTP server (registers routes)
      await server.start(fastify);

      // Verify server is running
      assert.strictEqual(server.isServerRunning(), true);

      // Test health check endpoint (GET /mcp)
      const healthResponse = await fastify.inject({
        method: "GET",
        url: "/mcp",
      });

      assert.strictEqual(healthResponse.statusCode, 200);
      const healthData = JSON.parse(healthResponse.payload);
      assert.strictEqual(healthData.name, "guidelines-agent-mcp");
      assert.strictEqual(healthData.version, "1.0.0");
      assert.strictEqual(healthData.isRunning, true);
      assert.strictEqual(healthData.activeSessions, 0);

      // Stop server
      await server.stop();
      assert.strictEqual(server.isServerRunning(), false);
    } finally {
      await fastify.close();
    }
  });

  test("Server should handle invalid MCP requests correctly", async () => {
    const fastify = Fastify({ logger: false });
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    try {
      await server.start(fastify);

      // Test POST /mcp without proper headers
      const response = await fastify.inject({
        method: "POST",
        url: "/mcp",
        payload: {
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const errorData = JSON.parse(response.payload);
      assert.strictEqual(errorData.jsonrpc, "2.0");
      assert.ok(errorData.error);
      assert.strictEqual(errorData.error.code, -32000);
    } finally {
      await server.stop();
      await fastify.close();
    }
  });

  test("Server should handle session termination requests", async () => {
    const fastify = Fastify({ logger: false });
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    try {
      await server.start(fastify);

      // Test DELETE /mcp without session ID
      const response = await fastify.inject({
        method: "DELETE",
        url: "/mcp",
      });

      assert.strictEqual(response.statusCode, 400);
      assert.ok(response.payload.includes("Invalid or missing session ID"));
    } finally {
      await server.stop();
      await fastify.close();
    }
  });
});
