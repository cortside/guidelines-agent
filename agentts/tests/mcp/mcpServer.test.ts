import { test, describe } from "node:test";
import assert from "node:assert";
import { MCPHttpServer } from "../../src/mcp/mcpHttpServer.js";
import { createMockChatService } from "../testUtils.js";
import { config } from "../../src/config/index.js";

describe("MCP HTTP Server", () => {
  test("Server should initialize with correct configuration", async () => {
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    const info = server.getServerInfo();

    assert.strictEqual(info.name, "guidelines-agent-mcp");
    assert.strictEqual(info.version, "1.0.0");
    assert.ok(info.description.includes("REST API standards"));
    assert.strictEqual(info.transport, "HTTP");
    assert.strictEqual(info.isRunning, false);
    assert.strictEqual(info.activeSessions, 0);
    assert.strictEqual(info.toolName, config.mcp.toolName);
    assert.strictEqual(info.toolDescription, config.mcp.toolDescription);
    assert.ok(info.endpoints);
    assert.strictEqual(info.endpoints.mcp, "/mcp");
  });

  test("Server should report running state correctly", async () => {
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    // Initially not running
    assert.strictEqual(server.isServerRunning(), false);

    // Note: We can't test actual start/stop in unit tests due to HTTP transport requiring Fastify
    // This would require integration tests with actual HTTP requests
  });

  test("Server should handle tool metadata correctly", async () => {
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    const info = server.getServerInfo();

    // Verify tool configuration matches config
    assert.strictEqual(info.toolName, config.mcp.toolName);
    assert.strictEqual(info.toolDescription, config.mcp.toolDescription);
  });

  test("Server endpoints should be configured correctly", async () => {
    const mockChatService = createMockChatService() as any;
    const server = new MCPHttpServer(mockChatService);

    const info = server.getServerInfo();

    // Verify HTTP transport configuration
    assert.strictEqual(info.transport, "HTTP");
    assert.ok(info.endpoints);
    assert.strictEqual(info.endpoints.mcp, "/mcp");
    assert.strictEqual(info.endpoints.health, "/mcp (GET)");
  });
});
