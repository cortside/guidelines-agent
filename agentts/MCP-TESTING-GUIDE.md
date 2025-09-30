# Manual MCP Server Testing Guide

Manual MCP Test Instructions - This file provides step-by-step instructions for manually testing the MCP server that should be running alongside your Fastify server.

## Current Status
✅ MCP server is configured and enabled
✅ Tool implementation is complete  
✅ Configuration shows MCP server will start automatically

## Testing Steps

### 1. Verify Server is Running
Your backend should show these startup messages:
```
🚀 Fastify server started successfully on port 8002
🤖 MCP Server started successfully
```

### 2. Test MCP Communication (Option A: Node.js REPL)
Open a new PowerShell terminal and run:
```powershell
cd c:\Work\cortside\guidelines-agent\agentts
node --loader ts-node/esm
```

Then in the REPL:
```javascript
// Import MCP components
const { MCPServer } = await import('./src/mcp/mcpServer.ts');
const { config } = await import('./src/config/index.ts');

// Create a test MCP server instance  
const server = new MCPServer();
console.log('MCP Server Info:', server.getServerInfo());
```

### 3. Test MCP Communication (Option B: JSON-RPC Messages)
The MCP server communicates via JSON-RPC messages. Here are test messages:

**List Tools Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "rest-api-standards",
        "description": "Provides comprehensive information about REST API standards, best practices, and guidelines",
        "inputSchema": {
          "type": "object",
          "properties": {
            "format": {
              "type": "string",
              "enum": ["streaming", "complete"],
              "default": "complete"
            }
          }
        }
      }
    ]
  }
}
```

**Call Tool Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "rest-api-standards",
    "arguments": {
      "format": "complete"
    }
  }
}
```

### 4. Integration with MCP Clients
Popular MCP clients that can connect to your server:
- **Claude Desktop** (Anthropic's MCP client)
- **Continue** (VS Code extension with MCP support)  
- **Custom clients** using @modelcontextprotocol/sdk

### 5. Server Logs
Check your backend console for MCP-related logs:
- Tool registration messages
- Request/response handling
- Any error messages

## What Should Work
1. ✅ MCP server starts automatically with Fastify
2. ✅ Tool registration (`rest-api-standards` tool)
3. ✅ JSON-RPC request handling
4. ✅ Streaming and complete response formats
5. ✅ Integration with existing ChatService and LangGraph workflow

## Next Steps
1. **Test with actual MCP client** - Connect Claude Desktop or other MCP client
2. **Verify streaming responses** - Test both streaming and complete formats
3. **Load testing** - Ensure MCP doesn't impact Fastify performance
4. **Documentation** - Update API docs with MCP endpoint information

## Troubleshooting
If MCP server doesn't appear to be running:
1. Check environment variables: `MCP_ENABLED=true`
2. Verify no port conflicts on stdio transport
3. Check console logs for MCP startup messages
4. Ensure all dependencies are installed (`@modelcontextprotocol/sdk`)

## Success Indicators
- ✅ Backend shows "MCP Server started successfully" 
- ✅ Tool can be listed via JSON-RPC
- ✅ Tool execution returns REST API standards information
- ✅ Both streaming and complete formats work
- ✅ No impact on existing Fastify functionality
