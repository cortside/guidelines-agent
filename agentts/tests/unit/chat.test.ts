import { test, describe } from "node:test";
import assert from "node:assert";
import { createTestFastifyInstance } from "../testSetup.ts";

describe("Chat Routes", () => {
  test("POST /chat should process chat message successfully", async (t) => {
    const fastify = await createTestFastifyInstance();

    try {
      const response = await fastify.inject({
        method: "POST",
        url: "/chat",
        payload: {
          threadId: "thread-123",
          message: "What are the REST API guidelines?",
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(
        body.answer,
        "Mock response to: What are the REST API guidelines?"
      );
      assert.strictEqual(body.threadId, "thread-123");
      assert.ok(body.timestamp); // timestamp is what the schema provides
    } finally {
      await fastify.close();
    }
  });

  test("POST /chat should reject missing threadId", async (t) => {
    const fastify = await createTestFastifyInstance();

    try {
      const response = await fastify.inject({
        method: "POST",
        url: "/chat",
        payload: { message: "test message" }, // missing threadId
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, "VALIDATION_ERROR");
    } finally {
      await fastify.close();
    }
  });

  test("POST /chat should reject empty message", async (t) => {
    const fastify = await createTestFastifyInstance();

    try {
      const response = await fastify.inject({
        method: "POST",
        url: "/chat",
        payload: { threadId: "test-thread", message: "" },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, "VALIDATION_ERROR");
    } finally {
      await fastify.close();
    }
  });

  test("POST /chat should handle service errors gracefully", async (t) => {
    const fastify = await createTestFastifyInstance();

    try {
      // Override the mock to throw an error
      (fastify as any).chatService.processMessage = async () => {
        throw new Error("Service temporarily unavailable");
      };

      const response = await fastify.inject({
        method: "POST",
        url: "/chat",
        payload: {
          threadId: "thread-123",
          message: "test message",
        },
      });

      assert.strictEqual(response.statusCode, 500);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, "INTERNAL_SERVER_ERROR");
      assert.ok(body.error);
      assert.ok(body.timestamp);
    } finally {
      await fastify.close();
    }
  });

  test("GET /threads/:threadId should return thread history", async (t) => {
    const fastify = await createTestFastifyInstance();

    try {
      // Override the mock to return thread history (should return array of messages)
      (fastify as any).chatService.getThreadHistory = async (
        threadId: string
      ) => [
        {
          id: "msg-1",
          type: "human", // route expects 'type' field, maps 'human' -> 'user'
          content: "Hello",
          timestamp: "2023-01-01T00:00:00Z",
        },
        {
          id: "msg-2",
          type: "assistant", // route maps non-'human' -> 'assistant'
          content: "Hi there!",
          timestamp: "2023-01-01T00:00:01Z",
        },
      ];

      const response = await fastify.inject({
        method: "GET",
        url: "/threads/thread-123",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.threadId, "thread-123");
      assert.ok(Array.isArray(body.messages));
      assert.strictEqual(body.messages.length, 2);
      assert.strictEqual(body.messages[0].role, "user");
      assert.strictEqual(body.messages[1].role, "assistant");
    } finally {
      await fastify.close();
    }
  });

  test("GET /threads/:threadId should return 404 for non-existent thread", async (t) => {
    const fastify = await createTestFastifyInstance();

    try {
      // Override the mock to return empty array for non-existent thread
      (fastify as any).chatService.getThreadHistory = async () => [];

      const response = await fastify.inject({
        method: "GET",
        url: "/threads/non-existent-thread",
      });

      assert.strictEqual(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, "THREAD_NOT_FOUND"); // Match what ResponseFormatter actually generates
    } finally {
      await fastify.close();
    }
  });
});
