import { test, describe } from 'node:test';
import assert from 'node:assert';
import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

describe('Fastify TypeScript Integration', () => {
  test('Fastify with TypeBox should work', async (t) => {
    const fastify: FastifyInstance = Fastify({ logger: false })
      .withTypeProvider<TypeBoxTypeProvider>();
    
    // Add a simple route with TypeBox schema
    fastify.get('/test', {
      schema: {
        response: {
          200: Type.Object({
            message: Type.String(),
            status: Type.String()
          })
        }
      }
    }, async (request, reply) => {
      return { message: 'TypeScript integration working', status: 'success' };
    });
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/test'
    });
    
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.message, 'TypeScript integration working');
    assert.strictEqual(body.status, 'success');
    
    await fastify.close();
  });

  test('Mock service decoration should work', async (t) => {
    const fastify: FastifyInstance = Fastify({ logger: false })
      .withTypeProvider<TypeBoxTypeProvider>();
    
    // Mock service with proper typing
    const mockChatService = {
      processMessage: async (threadId: string, message: string) => ({
        answer: `Mock response for: ${message}`,
        threadId,
        messageId: 'test-msg-id',
        timestamp: new Date().toISOString()
      })
    };
    
    // Use any to bypass type checking for decoration in tests
    (fastify as any).decorate('mockChatService', mockChatService);
    
    // Add route that uses the decorated service
    fastify.post('/chat', {
      schema: {
        body: Type.Object({
          threadId: Type.String(),
          message: Type.String()
        }),
        response: {
          200: Type.Object({
            answer: Type.String(),
            threadId: Type.String(),
            messageId: Type.String(),
            timestamp: Type.String()
          })
        }
      }
    }, async (request, reply) => {
      const body = request.body as { threadId: string; message: string };
      const { threadId, message } = body;
      const chatService = (fastify as any).mockChatService;
      return await chatService.processMessage(threadId, message);
    });
    
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        threadId: 'test-thread-123',
        message: 'Hello TypeScript!'
      }
    });
    
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.threadId, 'test-thread-123');
    assert.ok(body.answer.includes('Hello TypeScript!'));
    assert.strictEqual(body.messageId, 'test-msg-id');
    assert.ok(body.timestamp);
    
    await fastify.close();
  });

  test('Validation errors should work', async (t) => {
    const fastify: FastifyInstance = Fastify({ logger: false })
      .withTypeProvider<TypeBoxTypeProvider>();
    
    fastify.post('/validate', {
      schema: {
        body: Type.Object({
          required: Type.String(),
          optional: Type.Optional(Type.String())
        })
      }
    }, async (request, reply) => {
      return { success: true };
    });
    
    // Test missing required field
    const response = await fastify.inject({
      method: 'POST',
      url: '/validate',
      payload: { optional: 'present' } // missing required field
    });
    
    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.code, 'FST_ERR_VALIDATION');
    
    await fastify.close();
  });
});
