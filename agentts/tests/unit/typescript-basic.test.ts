import { test } from "node:test";
import assert from "node:assert";

// Simple test to verify TypeScript setup works
test("TypeScript compilation test", () => {
  const result: number = 2 + 2;
  assert.strictEqual(result, 4);
});

// Test async functionality
test("Async TypeScript test", async () => {
  const promise: Promise<string> = Promise.resolve("test");
  const result = await promise;
  assert.strictEqual(result, "test");
});
