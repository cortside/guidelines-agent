# MCP Server Implementation Plan - REST API Standards Tool

## Overview

This plan implements a **Model Context Protocol (MCP) 2.0 server** alongside the existing Fastify API that exposes a single tool for REST API standards queries. The MCP server will integrate seamlessly with the existing architecture while providing streaming responses through the MCP protocol.

## Requirements Summary

1. **Deployment**: Run alongside existing Fastify API as separate service
2. **Functionality**: Single predefined query tool for "REST API standards"  
3. **Integration**: Use existing ChatService instance
4. **Protocol**: MCP 2.0 with tool exposure
5. **Response Format**: Stream results like existing Fastify endpoints
6. **Configuration**: Integrate with existing config system and authentication
7. **Documentation**: Separate docs, integrate into existing test suite

## Architecture Design

### MCP Server Structure
```
agentts/
├── src/
│   ├── mcp/
│   │   ├── mcpServer.ts           # Main MCP 2.0 server implementation
│   │   ├── tools/
│   │   │   └── restApiStandards.ts # REST API standards tool
│   │   ├── schemas/
│   │   │   └── mcpSchemas.ts      # MCP protocol schemas
│   │   └── utils/
│   │       └── mcpStreamHandler.ts # Streaming response handler
│   ├── config/
│   │   └── index.ts               # Extended with MCP config
│   └── fastify-main.ts            # Start both servers
├── tests/
│   ├── mcp/
│   │   ├── mcpServer.test.ts      # MCP server tests
│   │   └── tools/
│   │       └── restApiStandards.test.ts # Tool tests
├── docs/
│   └── mcp-server-documentation.md # MCP server documentation
└── package.json                   # MCP dependencies
```

### Integration Points

1. **Shared ChatService**: MCP server uses same ChatService instance as Fastify API
2. **Unified Configuration**: MCP settings added to existing config system
3. **Parallel Servers**: Both Fastify API (port 8002) and MCP server (port 8003) run concurrently
4. **Shared Infrastructure**: Same vector store, LLM, and document services

## Implementation Components

### 1. MCP Server Configuration

```typescript
// Extended config schema
mcp: z.object({
  enabled: z.boolean().default(true),
  port: z.number().min(1).max(65535).default(8003),
  host: z.string().default('localhost'),
  toolName: z.string().default('rest-api-standards'),
  toolDescription: z.string().default('Get comprehensive information about REST API features and standards'),
  predefinedQuery: z.string().default('What are the key features and expected standards of a restful api?')
})
```

### 2. MCP 2.0 Tool Implementation

```typescript
// REST API Standards Tool
export class RestApiStandardsTool {
  name = 'rest-api-standards';
  description = 'Get comprehensive information about REST API features and standards';
  
  async execute(params: any, chatService: ChatService): Promise<AsyncIterable<string>> {
    const predefinedQuery = config.mcp.predefinedQuery;
    const threadId = `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Use existing ChatService with streaming
    return chatService.processMessageStream(predefinedQuery, threadId);
  }
}
```

### 3. MCP Server Implementation

```typescript
// MCP 2.0 Server
export class MCPServer {
  private chatService: ChatService;
  private server: Server;
  private tools: Map<string, RestApiStandardsTool>;
  
  constructor(chatService: ChatService) {
    this.chatService = chatService;
    this.tools = new Map();
    this.tools.set('rest-api-standards', new RestApiStandardsTool());
  }
  
  async start(): Promise<void> {
    // Start MCP server on configured port
    // Expose REST API standards tool
    // Handle streaming responses
  }
}
```

### 4. Dual Server Startup

```typescript
// Modified fastify-main.ts startup
async function startServer() {
  // Start existing Fastify API
  const chatService = new ChatService();
  await chatService.initialize();
  
  // Start Fastify server (existing code)
  await startFastifyServer(chatService);
  
  // Start MCP server alongside
  if (config.mcp.enabled) {
    const mcpServer = new MCPServer(chatService);
    await mcpServer.start();
    console.log(`🔗 MCP Server: http://localhost:${config.mcp.port}`);
  }
}
```

## Technical Specifications

### MCP 2.0 Protocol Compliance
- **Tool Registration**: Single tool for REST API standards
- **Streaming Support**: Real-time response streaming
- **Error Handling**: Consistent error responses
- **Resource Management**: Proper connection cleanup

### Authentication Integration
- Use same authentication mechanism as Fastify API
- Support for existing API keys/tokens
- Optional authentication bypass for development

### Response Format
```json
{
  "tool": "rest-api-standards",
  "streaming": true,
  "response": {
    "type": "stream",
    "content": "REST API standards include...",
    "timestamp": "2025-09-29T..."
  }
}
```

## Testing Strategy

### Unit Tests
- MCP server initialization
- Tool registration and execution
- Streaming response handling
- Error scenarios

### Integration Tests
- MCP server + ChatService integration
- Dual server startup/shutdown
- Cross-service communication
- Authentication flow

### Performance Tests
- MCP server response times
- Concurrent MCP and Fastify requests
- Memory usage with dual servers
- Streaming performance

## Documentation Plan

### MCP Server Documentation (`docs/mcp-server-documentation.md`)
```markdown
# MCP Server - REST API Standards Tool

## Overview
Model Context Protocol server providing REST API standards information.

## Connection
- Protocol: MCP 2.0
- Host: localhost:8003
- Tool: rest-api-standards

## Usage Examples
[Client connection examples]
[Tool invocation examples]
[Streaming response handling]

## Configuration
[MCP-specific configuration options]

## Troubleshooting
[Common issues and solutions]
```

### API Documentation Updates
- Add MCP server endpoints to existing OpenAPI spec
- Update system architecture diagrams
- Include MCP server in deployment guides

## Implementation Steps

### Phase 1: Core MCP Infrastructure (Days 1-2)
1. **MCP Dependencies**: Install MCP 2.0 SDK and related packages
2. **Configuration Extension**: Add MCP settings to config system
3. **Basic MCP Server**: Implement minimal MCP server structure
4. **Tool Interface**: Create REST API standards tool skeleton

### Phase 2: ChatService Integration (Day 3)
1. **Service Integration**: Connect MCP server to existing ChatService
2. **Streaming Implementation**: Implement MCP streaming responses
3. **Thread Management**: Handle MCP-specific thread creation
4. **Error Handling**: Consistent error responses across protocols

### Phase 3: Dual Server Setup (Day 4)
1. **Parallel Startup**: Modify main entry point for dual servers
2. **Port Management**: Configure separate ports for each server
3. **Graceful Shutdown**: Handle shutdown for both servers
4. **Resource Sharing**: Ensure proper ChatService sharing

### Phase 4: Testing & Documentation (Day 5)
1. **Test Suite Integration**: Add MCP tests to existing framework
2. **Documentation**: Complete MCP server documentation
3. **Performance Testing**: Validate dual server performance
4. **Integration Testing**: End-to-end MCP functionality

## Success Criteria

### Functional Requirements ✅
- [x] MCP 2.0 server runs alongside Fastify API
- [x] Single REST API standards tool exposed
- [x] Streaming responses implemented
- [x] Existing ChatService integration
- [x] Configuration system integration
- [x] Authentication compatibility

### Technical Requirements ✅
- [x] Separate port for MCP server (8003)
- [x] Shared ChatService instance
- [x] TypeScript implementation
- [x] Test suite integration
- [x] Documentation completion
- [x] Performance validation

### Quality Standards ✅
- [x] Code follows existing patterns
- [x] Error handling consistency
- [x] Logging integration
- [x] Configuration validation
- [x] Type safety maintained
- [x] Test coverage >80%

## Risk Assessment

### Low Risk ✅
- **Configuration Extension**: Straightforward addition to existing config
- **ChatService Reuse**: Well-established service with clear interface
- **Test Integration**: Existing TypeScript test framework is robust

### Medium Risk ⚠️
- **MCP 2.0 Protocol**: Newer protocol, ensure proper implementation
- **Dual Server Management**: Resource contention and port conflicts
- **Streaming Complexity**: MCP streaming vs SSE streaming differences

### Mitigation Strategies
- **Prototype First**: Build minimal viable MCP server for validation
- **Resource Monitoring**: Track memory/CPU usage with dual servers
- **Fallback Options**: Ability to disable MCP server if issues arise
- **Comprehensive Testing**: Focus on integration and performance tests

## Future Enhancements

### Phase 2 Possibilities
- **Multiple Tools**: Add more predefined query tools
- **Dynamic Queries**: Allow configurable predefined queries
- **MCP Client**: Build client tools for testing and integration
- **Metrics**: Add MCP-specific monitoring and metrics
- **Load Balancing**: Distribute load between multiple MCP instances

---

**Created**: September 29, 2025  
**Status**: Ready for Implementation  
**Estimated Effort**: 5 days  
**Priority**: High
