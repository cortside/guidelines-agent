# API Module Documentation (`agentts/`)

## Purpose
The `agentts/` directory implements the backend API that wraps a LangGraph agent. It is responsible for document ingestion, prompt management, workflow orchestration, thread management, and serving as the backend for the chatbot UI.

## Main Components

- **main.ts**: Entry point for the API server. Initializes and starts the API, sets up routes/endpoints, and connects to the agent logic.
- **DocumentLoader.ts**: Contains logic for loading, parsing, and preparing documents for use by the agent. Handles supported file types and may include preprocessing steps.
- **PromptTemplates.ts**: Manages prompt templates, including loading, storing, and updating templates used by the agent for various tasks.
- **Workflow.ts**: Defines the workflow logic for the agent, including task orchestration, state management, and integration with LangGraph.
- **db/chroma.sqlite3**: Local SQLite database for storing embeddings, metadata, or other persistent data required by the agent.

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

### API Endpoints

#### Chat Operations
- `POST /chat` - Send message to agent with thread support
- `GET /threads/{threadId}` - Retrieve conversation history

#### Thread Management ✨ **NEW**
- `GET /threads` - List all conversation threads with metadata
- `POST /threads` - Create new conversation thread
- `PUT /threads/{threadId}` - Update thread metadata (name, etc.)
- `DELETE /threads/{threadId}` - Delete conversation thread

#### System Operations
- `GET /health` - Health check and system status

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

## Recent Improvements ✅ **COMPLETED**

- ✅ **Modular Architecture**: Complete separation of concerns with service/controller layers
- ✅ **Thread Management**: Full multi-conversation support with persistent history
- ✅ **API Documentation**: Comprehensive OpenAPI/Swagger specification
- ✅ **Error Handling**: Enterprise-grade error management and logging
- ✅ **Configuration**: Environment-based configuration management
- ✅ **Type Safety**: Complete TypeScript coverage with proper interfaces
- ✅ **Testing Ready**: Architecture supports comprehensive unit and integration testing

## Configuration

The API supports extensive configuration through environment variables:

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
EMBEDDING_MODEL=text-embedding-3-small

# Document Processing
DOCUMENTS_PATH=./documents
MAX_DOCUMENT_SIZE=10MB
```

---

For detailed API reference and usage examples, see the OpenAPI specification at `/api-docs` when running the server.
