import { test } from 'node:test';
import assert from 'node:assert';
import { streamMonitor } from '../../src/infrastructure/streamMonitor.ts';

test('StreamMonitor - Basic functionality', async () => {
  // Reset metrics for clean test
  streamMonitor.resetMetrics();
  
  const testMessageId = 'test-msg-123';
  const testThreadId = 'test-thread-456';
  
  // Test starting a stream
  streamMonitor.startStream(testMessageId, testThreadId);
  
  let metrics = streamMonitor.getMetrics();
  assert.strictEqual(metrics.activeConnections, 1);
  assert.strictEqual(metrics.totalStreamsStarted, 1);
  
  // Test updating stream step
  streamMonitor.updateStreamStep(testMessageId, 'retrieval');
  
  const connection = streamMonitor.getConnection(testMessageId);
  assert.strictEqual(connection?.currentStep, 'retrieval');
  
  // Test incrementing token count
  streamMonitor.incrementTokenCount(testMessageId, 5);
  assert.strictEqual(connection?.tokenCount, 5);
  
  // Test completing a stream
  streamMonitor.completeStream(testMessageId);
  
  metrics = streamMonitor.getMetrics();
  assert.strictEqual(metrics.activeConnections, 0);
  assert.strictEqual(metrics.completedStreams, 1);
  assert.ok(metrics.averageStreamDuration > 0);
  assert.strictEqual(metrics.averageTokensPerStream, 5);
});

test('StreamMonitor - Cancellation handling', async () => {
  streamMonitor.resetMetrics();
  
  const testMessageId = 'test-cancel-123';
  const testThreadId = 'test-thread-789';
  
  streamMonitor.startStream(testMessageId, testThreadId);
  streamMonitor.incrementTokenCount(testMessageId, 3);
  streamMonitor.cancelStream(testMessageId);
  
  const metrics = streamMonitor.getMetrics();
  assert.strictEqual(metrics.activeConnections, 0);
  assert.strictEqual(metrics.cancelledStreams, 1);
  assert.strictEqual(metrics.completedStreams, 0);
});

test('StreamMonitor - Error handling', async () => {
  streamMonitor.resetMetrics();
  
  const testMessageId = 'test-error-123';
  const testThreadId = 'test-thread-error';
  
  streamMonitor.startStream(testMessageId, testThreadId);
  streamMonitor.errorStream(testMessageId, 'Test error occurred');
  
  const metrics = streamMonitor.getMetrics();
  assert.strictEqual(metrics.activeConnections, 0);
  assert.strictEqual(metrics.erroredStreams, 1);
  assert.strictEqual(metrics.completedStreams, 0);
});

test('StreamMonitor - Cleanup stale connections', async () => {
  streamMonitor.resetMetrics();
  
  // Create a connection and manually set its start time to 10 minutes ago
  const testMessageId = 'test-stale-123';
  const testThreadId = 'test-thread-stale';
  
  streamMonitor.startStream(testMessageId, testThreadId);
  
  // Access the private connection and modify its start time
  const connection = streamMonitor.getConnection(testMessageId);
  if (connection) {
    connection.startTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  }
  
  const cleanedCount = streamMonitor.cleanupStaleConnections();
  assert.strictEqual(cleanedCount, 1);
  
  const metrics = streamMonitor.getMetrics();
  assert.strictEqual(metrics.activeConnections, 0);
});
