# Guidelines Agent API ✨ **FASTIFY + TYPEBOX**

## Overview
Enterprise-grade TypeScript API providing AI-powered document retrieval, ranking, and question answering with multi-thread conversation support. Built with **Fastify + TypeBox** for superior performance, type safety, and auto-generated OpenAPI documentation.

## Architecture ✅ **PRODUCTION READY**

### Primary Server (Fastify)
- **src/fastify-main.ts**: Production Fastify server with TypeBox validation
- **src/schemas/**: TypeScript-first API contract definitions
- **src/fastify-routes/**: Modular route implementations (health, chat, threads)
- **Interactive Documentation**: Auto-generated Swagger UI at `/api-docs`

### Core Components
- **Workflow.ts**: LangGraph workflow orchestration with state management
- **DocumentLoader.ts**: Document loading and vector store processing  
- **PromptTemplates.ts**: LLM prompt template management
- **Services/**: Modular service layer (chat, document, thread management)

### Dependencies
- **Fastify 4.24.3**: High-performance web framework
- **TypeBox 0.31.28**: TypeScript-first schema validation
- **LangChain**: AI workflow orchestration
- **OpenAI**: Language model integration

## Quick Start

### Production Server
```bash
npm install
npm run build
npm start           # Fastify server on port 8002
```

### Development Mode  
```bash
npm run dev         # Development server with tsx hot-reload
```

### Interactive API Documentation
Visit **http://localhost:8002/api-docs** for complete API documentation with:
- Interactive endpoint testing
- Schema validation examples
- Request/response samples
- Auto-generated from TypeBox schemas

## API Endpoints

### Chat Operations
- `POST /chat` - Process AI messages with thread context
- `GET /threads/{threadId}` - Retrieve conversation history

### Thread Management  
- `GET /threads` - List all threads with pagination
- `POST /threads` - Create new conversation threads
- `PATCH /threads/{threadId}` - Update thread metadata
- `DELETE /threads/{threadId}` - Delete threads

### System Monitoring
- `GET /health` - Comprehensive system status
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/ready` - Readiness probe with dependency checks

## Testing

### Comprehensive TypeScript Test Suite
```bash
npm test                  # All tests with Node.js native runner
npm run test:unit         # Unit tests only
npm run test:integration  # Integration workflows  
npm run test:performance  # Performance benchmarks
```

### Test Features
- **fastify.inject()**: Native HTTP testing without network overhead
- **TypeScript Coverage**: Full type safety across test suite  
- **Performance Validation**: Response time and memory benchmarking
- **Schema Testing**: TypeBox validation and error handling

## Configuration

### Environment Variables (Unchanged for Compatibility)
```env
# Server Configuration
PORT=8002
HOST=localhost  
NODE_ENV=development

# LLM Configuration
LLM_MODEL=gpt-4
LLM_API_KEY=your-api-key
LLM_TEMPERATURE=0.7

# Vector Store Configuration
VECTOR_STORE_PATH=./db/chroma.sqlite3
```

### Migration Status ✅ **COMPLETED**
- **Express → Fastify**: Complete migration with rollback capability
- **TypeBox Schemas**: All API contracts defined with TypeScript integration
- **Auto-Generated Documentation**: OpenAPI 3.0.3 specification from schemas
- **Production Ready**: Full test coverage and performance validation

### Rollback Options (During Transition)
```bash
npm run start:express    # Express backup server
npm run dev:express      # Express development mode
```

## Development Guidelines

### TypeScript Best Practices
- **Schema-First Development**: Define TypeBox schemas before implementation
- **Type Safety**: Maintain end-to-end TypeScript coverage
- **Modular Architecture**: Use service/controller separation patterns
- **Error Handling**: Consistent error responses with proper HTTP status codes

### Testing Approach
- **Unit Tests**: Test individual components with mocks
- **Integration Tests**: Test complete workflows end-to-end  
- **Performance Tests**: Validate response times and memory usage
- **Schema Tests**: Verify TypeBox validation and error handling

### Code Review Checklist
- ✅ TypeBox schema definitions for new endpoints
- ✅ Proper error handling with consistent response format
- ✅ Test coverage for new functionality
- ✅ OpenAPI documentation auto-generated from schemas
- ✅ TypeScript strict mode compliance

## Architecture Migration Benefits
- **Type Safety**: Compile-time API contract validation
- **Performance**: Fastify's superior request handling (~40% faster)
- **Documentation**: Always up-to-date OpenAPI specs  
- **Developer Experience**: Better IDE support and debugging
- **Testing**: Native Node.js testing with superior tooling

## Further Help
- **Migration Documentation**: See `docs/step-5-fastify-migration-completion-report.md`
- **API Documentation**: Visit `/api-docs` when server is running
- **General Guidelines**: See root `CONTRIBUTING.md` and `docs/` directory
