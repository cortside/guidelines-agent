# MCP HTTP Server - REST API Standards Tool

## Overview

The **MCP (Model Context Protocol) HTTP Server** provides a single predefined tool that delivers comprehensive information about REST API features and expected standards. This server runs as HTTP endpoints within the existing Fastify API, using the same ChatService to provide consistent responses with streaming support.

## Features

- **Single Tool**: `rest-api-standards` - Provides REST API guidelines and standards
- **HTTP Transport**: Streamable HTTP with Server-Sent Events (SSE) support
- **Session Management**: Stateful sessions with automatic cleanup
- **Shared Infrastructure**: Uses existing ChatService, vector store, and document processing
- **Configurable**: All settings managed through existing configuration system
- **Production Ready**: Integrated error handling, logging, and graceful shutdown

## Configuration

### Environment Variables

Add these optional environment variables to configure the MCP server:

```env
# MCP Server Configuration
MCP_ENABLED=true                           # Enable/disable MCP server (default: true)
MCP_PORT=8003                             # Not used - HTTP endpoints use Fastify port
MCP_HOST=localhost                        # MCP server host (default: localhost)
MCP_TOOL_NAME=rest-api-standards          # Tool name (default: rest-api-standards)
MCP_TOOL_DESCRIPTION=Get comprehensive information about REST API features and expected standards
MCP_PREDEFINED_QUERY=What are the key features and expected standards of a restful api?
```

### Configuration Schema

The MCP server uses the existing configuration system with these additional settings:

```typescript
mcp: {
  enabled: boolean;              // Enable MCP server
  port: number;                 // Server port (for future HTTP transport)
  host: string;                 // Server host
  toolName: string;            // Name of the REST API tool
  toolDescription: string;     // Tool description
  predefinedQuery: string;     // The predefined query to execute
}
```

## Usage

### Starting the Server

The MCP server starts automatically when you run the main application:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Server Output

When the MCP server starts, you'll see output like:

```text
🔗 Starting MCP Server...
✅ MCP Server started successfully!
   • Tool: rest-api-standards
   • Description: Get comprehensive information about REST API features and expected standards
   • Transport: stdio
```

### Connecting MCP Clients

The MCP server uses **HTTP transport** with streaming support. Connect your MCP client using:

- **Protocol**: MCP 2.0
- **Transport**: HTTP with Server-Sent Events (SSE)
- **Base URL**: `http://localhost:8002/mcp`
- **Authentication**: None (same as Fastify API)

#### Example Client Configuration

```json
{
  "mcpServers": {
    "guidelines-agent": {
      "command": "npx",
      "args": ["tsx", "src/fastify-main.ts"],
      "cwd": "/path/to/guidelines-agent/agentts"
    }
  }
}
```

## Available Tools

### `rest-api-standards`

**Description**: Get comprehensive information about REST API features and expected standards

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "format": {
      "type": "string",
      "enum": ["streaming", "complete"],
      "default": "streaming",
      "description": "Response format - streaming for real-time updates, complete for final result only"
    }
  },
  "additionalProperties": false
}
```

**Usage Examples**:

**Streaming Response** (default):

```json
{
  "method": "tools/call",
  "params": {
    "name": "rest-api-standards"
  }
}
```

**Complete Response**:

```json
{
  "method": "tools/call",
  "params": {
    "name": "rest-api-standards",
    "arguments": {
      "format": "complete"
    }
  }
}
```

## Response Format

### Streaming Response Events

When using streaming format, the tool returns events in this sequence:

**Start Event**:

```json
{
  "type": "start",
  "data": {
    "message": "Started processing REST API standards query",
    "threadId": "mcp-1696089200000-abc123"
  },
  "timestamp": "2025-09-29T12:00:00.000Z"
}
```

**Step Events**:

```json
{
  "type": "step", 
  "data": {
    "step": "Searching for REST API documentation...",
    "progress": "Retrieving documents"
  },
  "timestamp": "2025-09-29T12:00:01.000Z"
}
```

**Token Events**:

```json
{
  "type": "token",
  "data": {
    "content": "REST APIs should follow these key principles: ",
    "totalLength": 45
  },
  "timestamp": "2025-09-29T12:00:02.000Z"
}
```

**Complete Event**:

```json
{
  "type": "complete",
  "data": {
    "message": "REST API standards query completed",
    "finalContent": "Full response content...",
    "totalTokens": 1250
  },
  "timestamp": "2025-09-29T12:00:05.000Z"
}
```

### Complete Response

When using complete format, the tool returns:

```json
{
  "content": [
    {
      "type": "text", 
      "text": "REST APIs should follow these key principles and standards:\n\n1. Use HTTP methods correctly...\n\n[Full response content]"
    }
  ],
  "isError": false
}
```

## Architecture

### Integration with Existing System

```text
┌─────────────────┐    ┌─────────────────┐
│   Fastify API   │    │   MCP Server    │
│   (Port 8002)   │    │   (stdio)       │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────┬─────────────┘
                 │
         ┌───────▼───────┐
         │  ChatService  │
         │ (Shared)      │
         └───────┬───────┘
                 │
    ┌────────────▼────────────┐
    │  LangGraph + Vector     │ 
    │  Store + Documents      │
    └─────────────────────────┘
```

### Component Overview

- **MCPServer**: Main server class handling MCP protocol
- **RestApiStandardsTool**: Tool implementation for REST API queries
- **MCPStreamHandler**: Converts ChatService SSE to MCP streaming format
- **Shared ChatService**: Same service used by Fastify API
- **Configuration**: Unified config system with MCP settings

## Development

### Running Tests

```bash
# Run all tests including MCP tests
npm test

# Run only MCP tests
npm test -- --grep "MCP"

# Run specific MCP tool tests
npx tsx --test tests/mcp/tools/restApiStandards.test.ts
```

### Testing the MCP Server

Since the MCP server uses stdio transport, testing requires an actual MCP client. For development:

1. **Unit Tests**: Test individual components (tools, handlers)
2. **Integration Tests**: Use mock MCP client for protocol testing
3. **Manual Testing**: Connect with real MCP client applications

### Adding New Tools

To add additional tools to the MCP server:

1. Create new tool class in `src/mcp/tools/`
2. Implement the tool interface with `execute()` method
3. Register the tool in `MCPServer` constructor
4. Add tool configuration to config schema
5. Update documentation and tests

## Troubleshooting

### Common Issues

1. **MCP Server Won't Start**
   - Check if `MCP_ENABLED=true` in configuration
   - Verify all dependencies are installed: `npm install`
   - Check console logs for specific error messages

2. **Tool Not Found**
   - Verify tool name matches `MCP_TOOL_NAME` configuration
   - Check MCP client is calling correct tool name
   - Ensure server started successfully

3. **Streaming Not Working**
   - Verify client supports MCP streaming protocol
   - Check for connection issues with stdio transport
   - Monitor console logs for streaming events

4. **Empty Responses**
   - Verify ChatService is properly initialized
   - Check vector store contains documents
   - Ensure predefined query is appropriate

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

This provides additional console output for:

- MCP server startup process
- Tool execution details  
- Streaming event processing
- Error stack traces

### Performance Considerations

- **Shared Resources**: MCP server shares ChatService with Fastify API
- **Memory Usage**: Each MCP request creates temporary thread
- **Concurrent Requests**: Both servers can handle requests simultaneously
- **Resource Cleanup**: Threads are cleaned up after completion

## Security

### Authentication

The MCP server inherits authentication from the main application configuration. No separate authentication is required.

### Network Security

- **stdio Transport**: No network ports exposed for MCP server
- **Local Access**: MCP server only accessible via process stdio
- **Shared Security**: Same security model as Fastify API

## Production Deployment

### Docker Configuration

The MCP server is included in the existing Docker image. No additional configuration needed.

### Kubernetes Deployment

For Kubernetes deployment, ensure:

- MCP server is enabled in configuration
- Sufficient resources allocated for dual servers
- Proper health check endpoints configured

### Monitoring

Monitor both servers using existing infrastructure:

- **Fastify API**: HTTP endpoints and metrics
- **MCP Server**: Console logs and error handling
- **Shared Resources**: ChatService performance metrics

---

**Version**: 1.0.0  
**Last Updated**: September 29, 2025  
**Compatibility**: MCP 2.0, Fastify 4.24.3
