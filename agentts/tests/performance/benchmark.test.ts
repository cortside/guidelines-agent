import { test, describe } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

describe('Performance Benchmarks', () => {
  test('Health endpoint should respond within 50ms', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // Mock minimal service for performance testing
    fastify.decorate('chatService', {
      initialize: async () => {}
    } as any);
    
    await fastify.register(import('../../src/fastify-routes/health.js'));
    
    const start = process.hrtime.bigint();
    const response = await fastify.inject({
      method: 'GET',
      url: '/health'
    });
    const end = process.hrtime.bigint();
    
    const responseTime = Number(end - start) / 1_000_000; // Convert to milliseconds
    
    assert.strictEqual(response.statusCode, 200);
    assert.ok(responseTime < 50, `Response time ${responseTime}ms exceeded 50ms threshold`);
    
    await fastify.close();
  });

  test('Liveness probe should respond within 10ms', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    await fastify.register(import('../../src/fastify-routes/health.js'));
    
    const start = process.hrtime.bigint();
    const response = await fastify.inject({
      method: 'GET',
      url: '/health/live'
    });
    const end = process.hrtime.bigint();
    
    const responseTime = Number(end - start) / 1_000_000;
    
    assert.strictEqual(response.statusCode, 200);
    assert.ok(responseTime < 10, `Liveness probe response time ${responseTime}ms exceeded 10ms threshold`);
    
    await fastify.close();
  });

  test('Concurrent health requests should maintain performance', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    fastify.decorate('chatService', {
      initialize: async () => {}
    } as any);
    
    await fastify.register(import('../../src/fastify-routes/health.js'));
    
    const concurrentRequests = 50;
    const promises = Array.from({ length: concurrentRequests }, () =>
      fastify.inject({ method: 'GET', url: '/health' })
    );
    
    const start = process.hrtime.bigint();
    const responses = await Promise.all(promises);
    const end = process.hrtime.bigint();
    
    const totalTime = Number(end - start) / 1_000_000;
    const avgTime = totalTime / concurrentRequests;
    
    responses.forEach(response => {
      assert.strictEqual(response.statusCode, 200);
    });
    
    assert.ok(avgTime < 100, `Average response time ${avgTime}ms too high for concurrent requests`);
    
    await fastify.close();
  });

  test('Chat endpoint performance with mock service', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // Fast mock chat service
    const mockChatService = {
      initialize: async () => {},
      processMessage: async (threadId: string, message: string) => ({
        answer: 'Fast mock response',
        threadId,
        messageId: `msg-${Date.now()}`,
        timestamp: new Date().toISOString()
      })
    };
    
    fastify.decorate('chatService', mockChatService as any);
    await fastify.register(import('../../src/fastify-routes/chat.js'));
    
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      const response = await fastify.inject({
        method: 'POST',
        url: '/chat',
        payload: {
          threadId: `thread-${i}`,
          message: 'Performance test message'
        }
      });
      const end = process.hrtime.bigint();
      
      const responseTime = Number(end - start) / 1_000_000;
      times.push(responseTime);
      
      assert.strictEqual(response.statusCode, 200);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);
    
    assert.ok(avgTime < 100, `Average chat response time ${avgTime}ms too high`);
    assert.ok(maxTime < 200, `Maximum chat response time ${maxTime}ms too high`);
    
    await fastify.close();
  });

  test('Thread operations should be performant', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // Fast mock thread service
    const mockThreadService = {
      getAllThreads: () => Array.from({ length: 100 }, (_, i) => ({ // Synchronous like the real service
        threadId: `thread-${i}`, // Use threadId not id
        name: `Thread ${i}`,
        createdAt: new Date(), // Use Date objects not strings
        lastActivity: new Date(), // Use lastActivity not updatedAt
        messageCount: Math.floor(Math.random() * 20)
      })),
      createThread: async (name: string) => ({
        threadId: `thread-${Date.now()}`, // Use threadId
        name,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0
      })
    };
    
    fastify.decorate('threadService', mockThreadService as any);
    await fastify.register(import('../../src/fastify-routes/threads.js'));
    
    // Test GET /threads performance with large dataset
    const start = process.hrtime.bigint();
    const response = await fastify.inject({
      method: 'GET',
      url: '/threads'
    });
    const end = process.hrtime.bigint();
    
    const responseTime = Number(end - start) / 1_000_000;
    
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.threads.length, 100); // Route returns { threads: [...], total: number }
    assert.strictEqual(body.total, 100);
    assert.ok(responseTime < 200, `Thread list response time ${responseTime}ms too high for 100 threads`);
    
    await fastify.close();
  });

  test('Memory usage should remain stable under load', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    fastify.decorate('chatService', {
      initialize: async () => {}
    } as any);
    
    await fastify.register(import('../../src/fastify-routes/health.js'));
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Make many requests
    const requestCount = 100;
    const promises = Array.from({ length: requestCount }, () =>
      fastify.inject({ method: 'GET', url: '/health/live' })
    );
    
    await Promise.all(promises);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 10MB for 100 requests)
    const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);
    assert.ok(memoryIncreaseInMB < 10, `Memory increased by ${memoryIncreaseInMB}MB, which is too high`);
    
    await fastify.close();
  });

  test('Response payload size validation', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // Mock service that returns large responses
    const mockChatService = {
      initialize: async () => {},
      processMessage: async () => 'A'.repeat(1000) // Just return the answer string like the real service
    };
    
    fastify.decorate('chatService', mockChatService as any);
    await fastify.register(import('../../src/fastify-routes/chat.js'));
    
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        threadId: 'test-thread',
        message: 'Test message'
      }
    });
    
    assert.strictEqual(response.statusCode, 200);
    
    const responseSize = Buffer.byteLength(response.body, 'utf8');
    assert.ok(responseSize > 1000, 'Response should contain the large mock answer');
    assert.ok(responseSize < 10000, 'Response should not be excessively large');
    
    await fastify.close();
  });
});
