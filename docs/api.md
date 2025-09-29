# API Module Documentation (`agentts/`)

## Purpose
The `agentts/` directory implements a **Fastify + TypeBox** backend API that wraps a LangGraph agent. It provides enterprise-grade type safety, performance, and documentation with automatic OpenAPI generation. The API is responsible for document ingestion, prompt management, workflow orchestration, thread management, and serving as the backend for the chatbot UI.

## Architecture Overview ✨ **MIGRATED TO FASTIFY**

### **Primary Server Implementation** ✅ **PRODUCTION READY**
- **src/fastify-main.ts**: **PRIMARY** Fastify server with TypeBox validation and auto-generated OpenAPI documentation
- **Backup Server**: `main-new.ts` - Express implementation maintained for rollback compatibility

### **TypeBox Schema System** ✅ **NEW**
- **src/schemas/**: Complete TypeScript-first schema definitions
  - `chat.ts` - Chat request/response schemas with validation rules
  - `threads.ts` - Thread management schemas for CRUD operations
  - `health.ts` - Health monitoring and system status schemas  
  - `common.ts` - Shared error response and success schemas
  - `index.ts` - Centralized schema exports and type definitions

### **Fastify Route Modules** ✅ **PRODUCTION READY**
- **src/fastify-routes/health.ts**: Health monitoring endpoints with TypeBox validation
- **src/fastify-routes/chat.ts**: AI conversation endpoints with automatic request/response validation
- **src/fastify-routes/threads.ts**: Thread management CRUD operations with TypeBox schemas

### **Legacy Components** (Maintained for Rollback)
- **main-new.ts**: Express modular server (backup during migration)
- **DocumentLoader.ts**: Document processing component (compatible with both servers)
- **PromptTemplates.ts**: Template management (compatible with both servers)
- **Workflow.ts**: LangGraph workflow orchestration (compatible with both servers)
- **db/chroma.sqlite3**: SQLite database for embeddings and metadata (unchanged)

## Modular Architecture (Updated September 2025)

The API has been fully refactored into a modular, enterprise-ready architecture:

### Services Layer
- **ChatService**: Core conversation management with thread integration
- **DocumentService**: Document loading and processing operations
- **PromptService**: Template management and prompt operations
- **WorkflowService**: LangGraph workflow orchestration
- **ThreadManagementService**: Multi-thread conversation management ✨ **NEW**

### Controllers Layer
- **ChatController**: REST endpoints for chat functionality
- **HealthController**: System health and status endpoints
- **ThreadsController**: Thread management CRUD operations ✨ **NEW**

### Infrastructure Layer
- **LLM Integration**: Language model connectivity and configuration
- **Vector Store**: Document embeddings and similarity search
- **Error Handling**: Comprehensive error management middleware
- **Validation**: Input validation and sanitization middleware

### API Endpoints ✨ **FASTIFY + TYPEBOX**

All endpoints now feature automatic TypeBox validation, enhanced error handling, and auto-generated OpenAPI 3.0.3 documentation available at `/api-docs`.

#### Chat Operations
- `POST /chat` - Process AI messages with thread context and TypeBox validation
  - **Request**: `{ threadId: string, message: string }`
  - **Response**: `{ answer: string, threadId: string, messageId: string, timestamp: string }`
  - **Validation**: Thread ID format, message length constraints, content safety
- `GET /threads/{threadId}` - Retrieve conversation history with enhanced metadata
  - **Response**: Thread data with message array and complete metadata

#### Thread Management ✨ **ENHANCED**
- `GET /threads` - List all conversation threads with pagination and sorting
  - **Query Parameters**: `limit`, `offset`, `sortBy`, `sortOrder`
  - **Response**: Array of threads with metadata and activity timestamps
- `POST /threads` - Create new conversation thread with validation
  - **Request**: `{ name?: string, metadata?: object }`
  - **Response**: Created thread with generated ID and timestamps
- `PATCH /threads/{threadId}` - Update thread properties with validation
  - **Request**: `{ name?: string, metadata?: object }`
  - **Response**: Updated thread data
- `DELETE /threads/{threadId}` - Delete thread with proper cleanup
  - **Response**: `{ success: true, deletedThreadId: string }`
- `GET /threads/stats` - Thread analytics and storage debugging

#### System Operations ✨ **ENHANCED** 
- `GET /health` - Comprehensive system status with service health checks
  - **Response**: System status, version info, service health, timestamps
- `GET /health/live` - Kubernetes liveness probe (lightweight)
  - **Response**: `{ status: "alive", timestamp: string }`
- `GET /health/ready` - Kubernetes readiness probe with dependency validation
  - **Response**: Service availability status with detailed dependency checks

#### Documentation
- `GET /api-docs` - **NEW**: Interactive Swagger UI with complete API documentation
- **OpenAPI Specification**: Auto-generated from TypeBox schemas at `/api-docs/json`

## Key Features

### Multi-Thread Support ✨ **NEW**
- **Thread Persistence**: Leverages LangGraph MemorySaver for conversation state
- **Thread Metadata**: Automatic thread naming and activity tracking
- **Thread Management**: Full CRUD operations for conversation threads
- **Backward Compatibility**: Existing single-thread usage continues to work

### Enterprise-Grade Architecture
- **Configuration Management**: Environment-based configuration with validation
- **Error Handling**: Comprehensive error management with user-friendly responses
- **Type Safety**: Complete TypeScript coverage with proper interfaces
- **Logging**: Structured logging for debugging and monitoring
- **Validation**: Input validation and sanitization for all endpoints

## Key Concepts

- **LangGraph Agent**: The core AI agent, responsible for processing user input, managing context, and generating responses.
- **Document Ingestion**: The process of loading and preparing documents for use in the agent's context or knowledge base.
- **Prompt Management**: Handling of prompt templates to ensure consistent and effective communication with the agent.
- **Workflow Orchestration**: Managing the sequence of operations and state transitions within the agent.
- **Thread Management**: Multi-conversation support with persistent state and metadata tracking.

## Recent Improvements ✅ **FASTIFY MIGRATION COMPLETED**

### ✅ **Express → Fastify Migration** (September 2025)
- ✅ **TypeBox Integration**: Complete TypeScript-first schema system with compile-time safety
- ✅ **Automatic OpenAPI Generation**: Self-documenting API with interactive Swagger UI
- ✅ **Enhanced Performance**: Fastify's superior request handling and reduced memory footprint  
- ✅ **Comprehensive Testing**: Node.js native test runner with fastify.inject() integration
- ✅ **Production-Ready Server**: Full migration completed with rollback capability maintained

### ✅ **Architecture Enhancements**
- ✅ **Modular Architecture**: Complete separation of concerns with service/controller layers
- ✅ **Thread Management**: Full multi-conversation support with persistent history
- ✅ **TypeBox Validation**: Automatic request/response validation with business logic rules
- ✅ **Error Handling**: Enterprise-grade error management with consistent response format
- ✅ **Configuration**: Environment-based configuration management (unchanged for compatibility)
- ✅ **Type Safety**: End-to-end TypeScript coverage from HTTP requests to database responses
- ✅ **Testing Framework**: Comprehensive TypeScript test suite with performance benchmarking

## Configuration

The Fastify API maintains full backward compatibility with all existing environment variables:

```env
# Server Configuration (Unchanged)
PORT=8002
HOST=localhost
NODE_ENV=development

# LLM Configuration (Unchanged)
LLM_MODEL=gpt-4
LLM_API_KEY=your-api-key
LLM_TEMPERATURE=0.7

# Vector Store Configuration (Unchanged)
VECTOR_STORE_PATH=./db/chroma.sqlite3
```

### Server Startup Scripts

**Production (Fastify)**:
```bash
npm start           # Fastify server (default)
npm run build       # TypeScript compilation excluding tests
```

**Development (Fastify)**:
```bash
npm run dev         # Fastify dev server with tsx (default)
npm test           # TypeScript test suite with Node.js native runner
```

**Rollback (Express)**:
```bash
npm run start:express  # Express server (backup)
npm run dev:express    # Express dev server (backup)
```

### Testing Commands
```bash
npm test                # All TypeScript tests with tsx
npm run test:unit       # Unit tests only  
npm run test:integration # Integration workflow tests
npm run test:performance # Performance benchmarks
```
EMBEDDING_MODEL=text-embedding-3-small

# Document Processing
DOCUMENTS_PATH=./documents
MAX_DOCUMENT_SIZE=10MB
```

---

For detailed API reference and usage examples, see the OpenAPI specification at `/api-docs` when running the server.
