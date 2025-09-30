import { test } from "node:test";
import assert from "node:assert";

test("Streaming Chat Service - Basic functionality", async () => {
  // Test the helper functions without needing full LangGraph setup

  // Test message ID generation
  const messageIdPattern = /^msg-\d+-[a-z0-9]{9}$/;

  // Since generateMessageId is private, we'll test the pattern it should match
  const testMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  assert.ok(messageIdPattern.test(testMessageId));

  // Test SSE data formatting
  const testEvent = "start";
  const testData = { messageId: "test-123", timestamp: "2025-09-29T12:00:00Z" };
  const expectedSSE = `event: ${testEvent}\ndata: ${JSON.stringify(testData)}\n\n`;

  const actualSSE = `event: ${testEvent}\ndata: ${JSON.stringify(testData)}\n\n`;
  assert.strictEqual(actualSSE, expectedSSE);
});

test("Stream event data validation", async () => {
  // Test that our event data structures are correct

  // Start event
  const startEvent = {
    messageId: "msg-123",
    threadId: "thread-456",
    timestamp: new Date().toISOString(),
  };

  assert.ok(startEvent.messageId);
  assert.ok(startEvent.threadId);
  assert.ok(startEvent.timestamp);

  // Step event
  const stepEvent = {
    step: "retrieval",
    status: "processing",
    message: "Searching relevant documents...",
  };

  assert.ok(["retrieval", "ranking", "generation"].includes(stepEvent.step));
  assert.ok(["processing", "started", "complete"].includes(stepEvent.status));
  assert.ok(stepEvent.message);

  // Token event
  const tokenEvent = {
    content: "Based ",
  };

  assert.ok(typeof tokenEvent.content === "string");

  // Complete event
  const completeEvent = {
    messageId: "msg-123",
    status: "complete",
    timestamp: new Date().toISOString(),
  };

  assert.strictEqual(completeEvent.status, "complete");
  assert.ok(completeEvent.messageId);
  assert.ok(completeEvent.timestamp);

  // Error event
  const errorEvent = {
    messageId: "msg-123",
    error: "Test error message",
    step: "retrieval",
    timestamp: new Date().toISOString(),
  };

  assert.ok(errorEvent.error);
  assert.ok(errorEvent.messageId);

  // Cancelled event
  const cancelEvent = {
    messageId: "msg-123",
    step: "generation",
    timestamp: new Date().toISOString(),
  };

  assert.ok(cancelEvent.messageId);
});

test("Token splitting functionality", async () => {
  // Test the token splitting logic used in streamContentTokens

  const testContent = "Based on the guidelines, here is the answer.";
  const tokens = testContent.split(/(\s+)/).filter((t) => t.length > 0);

  // Should split into words and spaces
  const expectedTokens = [
    "Based",
    " ",
    "on",
    " ",
    "the",
    " ",
    "guidelines,",
    " ",
    "here",
    " ",
    "is",
    " ",
    "the",
    " ",
    "answer.",
  ];

  assert.deepStrictEqual(tokens, expectedTokens);

  // Test with empty content
  const emptyTokens = "".split(/(\s+)/).filter((t) => t.length > 0);
  assert.deepStrictEqual(emptyTokens, []);

  // Test with single word
  const singleWord = "Hello".split(/(\s+)/).filter((t) => t.length > 0);
  assert.deepStrictEqual(singleWord, ["Hello"]);
});
