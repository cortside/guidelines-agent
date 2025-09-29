import { test, describe } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import healthRoutes from '../../src/fastify-routes/health.ts';
import { createMockChatService } from '../testUtils.ts';

describe('Health Routes', () => {
  test('GET /health should return system status', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // Mock services for testing
    fastify.decorate('chatService', createMockChatService() as any);
    
    await fastify.register(healthRoutes);
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/health'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, 'healthy');
    assert.ok(body.timestamp);
    assert.ok(body.uptime !== undefined);
    assert.ok(body.services);
    assert.ok(body.services.vectorStore);
    assert.ok(body.services.llm);
  });

  test('GET /health/live should return liveness probe', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    await fastify.register(healthRoutes);
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/health/live'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, 'alive');
    assert.ok(body.timestamp);
  });

  test('GET /health/ready should return readiness probe when service is ready', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // Mock healthy services
    fastify.decorate('chatService', createMockChatService() as any);
    
    await fastify.register(healthRoutes);
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/health/ready'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, 'ready');
    assert.ok(body.timestamp);
    assert.ok(body.dependencies);
    assert.strictEqual(body.dependencies.chatService, true);
    assert.strictEqual(body.dependencies.vectorStore, true);
  });

  test('GET /health/ready should return 503 when chatService is not available', async (t) => {
    const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();
    
    // No chatService decorated = unhealthy
    await fastify.register(healthRoutes);
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/health/ready'
    });
    
    assert.strictEqual(response.statusCode, 503);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, 'Service not ready - dependencies unavailable');
    assert.strictEqual(body.code, 'SERVICE_NOT_READY');
    assert.ok(body.timestamp);
    assert.ok(body.details);
    assert.strictEqual(body.details.dependencies.chatService, false);
    assert.strictEqual(body.details.dependencies.vectorStore, false);
  });
});
