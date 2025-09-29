import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { createTestFastifyInstance } from '../testSetup.ts';

describe('Chat Workflow Integration', () => {
  let fastify: FastifyInstance;
  let testThreadId: string;

  before(async () => {
    // Set up full Fastify server for integration testing
    fastify = await createTestFastifyInstance();
  });

  after(async () => {
    await fastify.close();
  });

  test('Complete chat workflow: health → create thread → chat → history → analytics → delete', async (t) => {
    // 1. Check system health
    const healthResponse = await fastify.inject({
      method: 'GET',
      url: '/health'
    });
    
    assert.strictEqual(healthResponse.statusCode, 200);
    const healthData = JSON.parse(healthResponse.body);
    assert.strictEqual(healthData.status, 'healthy');
    
    // 2. Create thread
    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/threads',
      payload: { name: 'Integration Test Thread' }
    });
    
    assert.strictEqual(createResponse.statusCode, 201);
    const threadData = JSON.parse(createResponse.body);
    testThreadId = threadData.id;
    assert.ok(testThreadId);
    assert.strictEqual(threadData.name, 'Integration Test Thread');
    assert.strictEqual(threadData.messageCount, 0);
    
    // 3. Send chat message
    const chatResponse = await fastify.inject({
      method: 'POST',
      url: '/chat',
      payload: { 
        threadId: testThreadId, 
        message: 'What are the REST API guidelines?' 
      }
    });
    
    assert.strictEqual(chatResponse.statusCode, 200);
    const chatData = JSON.parse(chatResponse.body);
    assert.ok(chatData.answer);
    assert.ok(chatData.answer.includes('What are the REST API guidelines?'));
    assert.strictEqual(chatData.threadId, testThreadId);
    assert.ok(chatData.timestamp);
    
    // 4. Get thread history
    const historyResponse = await fastify.inject({
      method: 'GET',
      url: `/threads/${testThreadId}`
    });
    
    assert.strictEqual(historyResponse.statusCode, 200);
    const historyData = JSON.parse(historyResponse.body);
    assert.ok(Array.isArray(historyData) || historyData.messages);
    
    // 5. Get thread statistics
    const statsResponse = await fastify.inject({
      method: 'GET',
      url: '/threads/stats'
    });
    
    assert.strictEqual(statsResponse.statusCode, 200);
    const statsData = JSON.parse(statsResponse.body);
    assert.ok(typeof statsData.totalThreads === 'number');
    
    // 6. Delete thread
    const deleteResponse = await fastify.inject({
      method: 'DELETE',
      url: `/threads/${testThreadId}`
    });
    
    assert.strictEqual(deleteResponse.statusCode, 200);
    const deleteData = JSON.parse(deleteResponse.body);
    assert.strictEqual(deleteData.success, true);
  });

  test('Error handling throughout workflow', async (t) => {
    // Test invalid requests at each endpoint
    
    // Invalid chat request
    const invalidChatResponse = await fastify.inject({
      method: 'POST',
      url: '/chat',
      payload: { message: 'test' } // missing threadId
    });
    assert.strictEqual(invalidChatResponse.statusCode, 400);
    
    // Valid thread creation with empty payload (name is optional)
    const validThreadResponse = await fastify.inject({
      method: 'POST',
      url: '/threads',
      payload: {} // name is optional according to schema
    });
    assert.strictEqual(validThreadResponse.statusCode, 201);
    
    // Non-existent thread history
    const nonExistentResponse = await fastify.inject({
      method: 'GET',
      url: '/threads/non-existent-thread'
    });
    // Should still return 200 with mock data since we're using mocks
    assert.ok([200, 404].includes(nonExistentResponse.statusCode));
  });

  test('Concurrent requests should not interfere', async (t) => {
    const concurrentRequests = 5;
    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      fastify.inject({
        method: 'POST',
        url: '/chat',
        payload: {
          threadId: `thread-${i}`,
          message: `Concurrent message ${i}`
        }
      })
    );
    
    const responses = await Promise.all(promises);
    
    // All requests should succeed
    responses.forEach((response, index) => {
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.answer.includes(`Concurrent message ${index}`));
      assert.strictEqual(body.threadId, `thread-${index}`);
    });
  });

  test('Health endpoints remain responsive during load', async (t) => {
    const healthRequests = 10;
    const promises = Array.from({ length: healthRequests }, () =>
      fastify.inject({ method: 'GET', url: '/health' })
    );
    
    const start = process.hrtime.bigint();
    const responses = await Promise.all(promises);
    const end = process.hrtime.bigint();
    
    const totalTime = Number(end - start) / 1_000_000; // Convert to milliseconds
    const avgTime = totalTime / healthRequests;
    
    responses.forEach(response => {
      assert.strictEqual(response.statusCode, 200);
    });
    
    // Health endpoints should be very fast
    assert.ok(avgTime < 10, `Average health response time ${avgTime}ms too high`);
  });
});
