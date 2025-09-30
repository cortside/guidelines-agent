import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RestApiStandardsTool } from '../../../src/mcp/tools/restApiStandards.js';
import { createMockChatService } from '../../testUtils.js';
import { config } from '../../../src/config/index.js';

describe('REST API Standards Tool', () => {
  test('Tool should have correct metadata', async () => {
    const tool = new RestApiStandardsTool();
    const metadata = tool.getToolMetadata();
    
    assert.strictEqual(metadata.name, config.mcp.toolName);
    assert.strictEqual(metadata.description, config.mcp.toolDescription);
    assert.ok(metadata.inputSchema);
    assert.strictEqual(typeof metadata.inputSchema, 'object');
  });

  test('Tool should execute complete response correctly', async () => {
    const tool = new RestApiStandardsTool();
    const mockChatService = createMockChatService({
      processMessage: async () => 'REST APIs should follow these standards...'
    }) as any;

    const result = await tool.execute(mockChatService, { format: 'complete' });
    
    assert.ok(!Array.isArray(result)); // Should not be iterable
    assert.ok('content' in result); // Should be MCPToolResponse
    
    const response = result as any;
    assert.strictEqual(response.isError, false);
    assert.ok(Array.isArray(response.content));
    assert.strictEqual(response.content.length, 1);
    assert.strictEqual(response.content[0].type, 'text');
    assert.ok(response.content[0].text.includes('REST APIs'));
  });

  test('Tool should handle errors gracefully', async () => {
    const tool = new RestApiStandardsTool();
    const mockChatService = createMockChatService({
      processMessage: async () => {
        throw new Error('Test error');
      }
    }) as any;

    const result = await tool.execute(mockChatService, { format: 'complete' });
    
    const response = result as any;
    assert.strictEqual(response.isError, true);
    assert.ok(response.content[0].text.includes('Error processing'));
    assert.ok(response.content[0].text.includes('Test error'));
  });

  test('Tool should use predefined query', async () => {
    const tool = new RestApiStandardsTool();
    let capturedQuery = '';
    
    const mockChatService = createMockChatService({
      processMessage: async (threadId: string, content: string) => {
        capturedQuery = content;
        return 'Mock response';
      }
    }) as any;

    await tool.execute(mockChatService, { format: 'complete' });
    
    assert.strictEqual(capturedQuery, config.mcp.predefinedQuery);
  });

  test('Tool should generate unique thread IDs', async () => {
    const tool = new RestApiStandardsTool();
    const threadIds = new Set<string>();
    
    const mockChatService = createMockChatService({
      processMessage: async (threadId: string) => {
        threadIds.add(threadId);
        return 'Mock response';
      }
    }) as any;

    // Execute tool multiple times
    await tool.execute(mockChatService, { format: 'complete' });
    await tool.execute(mockChatService, { format: 'complete' });
    await tool.execute(mockChatService, { format: 'complete' });
    
    // All thread IDs should be unique
    assert.strictEqual(threadIds.size, 3);
    
    // All thread IDs should start with 'mcp-'
    for (const threadId of threadIds) {
      assert.ok(threadId.startsWith('mcp-'));
    }
  });
});
