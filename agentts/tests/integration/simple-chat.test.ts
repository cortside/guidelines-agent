import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createTestFastifyInstance } from '../testSetup.ts';

describe('Simple Chat Test', () => {
  test('Health check endpoint', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });
      
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'healthy');
    } finally {
      await fastify.close();
    }
  });
  
  test('Create and delete thread workflow', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      let testThreadId: string;
      
      // Create thread
      const createResponse = await fastify.inject({
        method: 'POST',
        url: '/threads',
        payload: { name: 'Simple Test Thread' }
      });
      
      assert.strictEqual(createResponse.statusCode, 201);
      const threadData = JSON.parse(createResponse.body);
      testThreadId = threadData.id;
      assert.ok(testThreadId);
      
      // Delete thread
      const deleteResponse = await fastify.inject({
        method: 'DELETE',
        url: `/threads/${testThreadId}`
      });
      assert.strictEqual(deleteResponse.statusCode, 200);
    } finally {
      await fastify.close();
    }
  });
});
