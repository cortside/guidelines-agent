import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createTestFastifyInstance } from '../testSetup.ts';

describe('Threads Routes', () => {
  test('GET /threads should return all threads', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      // Override the mock to return specific threads
      (fastify as any).threadService.getAllThreads = () => ([
        {
          threadId: 'thread-1',
          name: 'Thread 1',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          lastActivity: new Date('2023-01-01T00:00:00Z'),
          messageCount: 5
        },
        {
          threadId: 'thread-2', 
          name: 'Thread 2',
          createdAt: new Date('2023-01-02T00:00:00Z'),
          lastActivity: new Date('2023-01-02T00:00:00Z'),
          messageCount: 3
        }
      ]);
      
      const response = await fastify.inject({
        method: 'GET',
        url: '/threads'
      });
      

      
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.threads);
      assert.ok(Array.isArray(body.threads));
      assert.strictEqual(body.threads.length, 2);
      assert.strictEqual(body.total, 2);
      assert.strictEqual(body.threads[0].threadId, 'thread-1');
      assert.strictEqual(body.threads[1].threadId, 'thread-2');
    } finally {
      await fastify.close();
    }
  });

  test('POST /threads should create new thread', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      // Override the mock to return specific create result
      (fastify as any).threadService.createThread = async (data: any) => ({
        threadId: 'new-thread-id',
        name: data.name,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0
      });
      
      const response = await fastify.inject({
        method: 'POST',
        url: '/threads',
        payload: { name: 'New Thread' }
      });
      

      
      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'New Thread');
      assert.ok(body.threadId.startsWith('thread-')); // Route generates its own ID
      assert.ok(body.createdAt);
      assert.strictEqual(body.messageCount, 0);
    } finally {
      await fastify.close();
    }
  });

  test('POST /threads should reject name that is too long', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      const response = await fastify.inject({
        method: 'POST',
        url: '/threads',
        payload: { 
          name: 'x'.repeat(250) // exceeds maxLength: 200
        }
      });
      
      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, 'VALIDATION_ERROR');
    } finally {
      await fastify.close();
    }
  });

  test('PATCH /threads/:threadId should update thread name', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      // Override the mock to return success for update
      (fastify as any).threadService.updateThreadName = (id: string, name: string) => true;
      
      // Also mock getAllThreads to return the updated thread
      (fastify as any).threadService.getAllThreads = () => ([
        {
          threadId: 'thread-123',
          name: 'Updated Thread Name',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          lastActivity: new Date(),
          messageCount: 5
        }
      ]);
      
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/threads/thread-123',
        payload: { name: 'Updated Thread Name' }
      });
      
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.threadId, 'thread-123');
      assert.strictEqual(body.name, 'Updated Thread Name');
      assert.ok(body.updatedAt);
    } finally {
      await fastify.close();
    }
  });

  test('DELETE /threads/:threadId should delete thread', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      // Override the mock to return specific delete result
      (fastify as any).threadService.deleteThread = async (id: string) => ({ success: true });
      
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/threads/thread-123'
      });
      
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
    } finally {
      await fastify.close();
    }
  });

  test('GET /threads/stats should return thread analytics', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      // Override the mock to return stats matching schema
      (fastify as any).threadService.getStorageStats = () => {
        return {
          totalThreads: 10,
          averageMessageCount: 5, // matches schema field name
          mostActiveThread: {
            threadId: 'thread-1', // matches schema field name
            name: 'Active Thread',
            messageCount: 15
          }
        };
      };
      
      const response = await fastify.inject({
        method: 'GET',
        url: '/threads/stats'
      });
      

      
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.totalThreads, 10);
      assert.strictEqual(body.averageMessageCount, 5); // matches schema field name
      assert.ok(body.mostActiveThread);
      assert.strictEqual(body.mostActiveThread.threadId, 'thread-1'); // matches schema field name
      assert.strictEqual(body.mostActiveThread.messageCount, 15);
    } finally {
      await fastify.close();
    }
  });

  test('Should handle thread service errors gracefully', async (t) => {
    const fastify = await createTestFastifyInstance();
    
    try {
      // Override the mock to throw error (synchronous like the original)
      (fastify as any).threadService.getAllThreads = () => {
        throw new Error('Database connection failed');
      };
      
      const response = await fastify.inject({
        method: 'GET',
        url: '/threads'
      });
      
      assert.strictEqual(response.statusCode, 500);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, 'INTERNAL_SERVER_ERROR');
      assert.ok(body.error);
      assert.ok(body.timestamp);
    } finally {
      await fastify.close();
    }
  });
});
