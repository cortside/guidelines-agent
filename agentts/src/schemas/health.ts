import { Type } from '@sinclair/typebox';
import { ErrorResponseSchema } from './common.js';

/**
 * Health check response schema
 */
export const HealthResponseSchema = Type.Object({
  status: Type.Union([
    Type.Literal('healthy'),
    Type.Literal('unhealthy'),
    Type.Literal('degraded')
  ], {
    description: 'Overall health status',
    examples: ['healthy', 'unhealthy', 'degraded']
  }),
  timestamp: Type.String({
    format: 'date-time',
    description: 'When the health check was performed',
    examples: ['2025-09-29T12:00:00.000Z']
  }),
  uptime: Type.Number({
    description: 'Server uptime in seconds',
    examples: [3600]
  }),
  version: Type.String({
    description: 'Application version',
    examples: ['1.0.0']
  }),
  services: Type.Object({
    vectorStore: Type.Object({
      status: Type.Union([
        Type.Literal('healthy'),
        Type.Literal('unhealthy')
      ], {
        description: 'Vector store connection status',
        examples: ['healthy', 'unhealthy']
      }),
      provider: Type.String({
        description: 'Vector store provider',
        examples: ['chromadb', 'pinecone']
      }),
      responseTime: Type.Optional(Type.Number({
        description: 'Response time in milliseconds',
        examples: [25]
      }))
    }),
    llm: Type.Object({
      status: Type.Union([
        Type.Literal('healthy'),
        Type.Literal('unhealthy')
      ], {
        description: 'Language model service status',
        examples: ['healthy', 'unhealthy']
      }),
      provider: Type.String({
        description: 'LLM provider',
        examples: ['openai']
      }),
      model: Type.Optional(Type.String({
        description: 'Model being used',
        examples: ['gpt-4']
      })),
      responseTime: Type.Optional(Type.Number({
        description: 'Response time in milliseconds',
        examples: [150]
      }))
    })
  }, {
    description: 'Status of individual services'
  })
});

// Re-export error schema for health endpoints
export { ErrorResponseSchema };
