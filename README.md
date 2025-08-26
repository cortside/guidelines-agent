# guidelines-agent Repository

## Overview
This repository provides an agent and chatbot system for answering questions about REST API and architecture guidelines. It retrieves and summarizes content from markdown documents hosted on GitHub, using LangChain, LangGraph, and OpenAI models for retrieval, grading, rewriting, and answering user queries.

### Main Components
- **agent/**: Python 3.11 FastAPI agent that connects to an MCP server over HTTP. Handles document loading, semantic search, and workflow orchestration for question answering. See [agent/README.md](agent/README.md) for setup and usage.
- **chatbot/**: React 19 + TypeScript chat UI for interacting with the agent. See [chatbot/README.md](chatbot/README.md) for setup and usage.

## Features
- Loads and processes markdown guidelines from GitHub
- Splits documents, embeds chunks, and enables semantic search
- Uses OpenAI models for retrieval and answering
- Supports streaming chat responses
- Authenticates users via OpenID Connect
- Observability with Prometheus metrics and OpenTelemetry tracing
- Infrastructure via Docker Compose and Kubernetes manifests

## Requirements
- Python 3.8+ (agent)
- Node.js 18+ (chatbot)
- See `agent/requirements.txt` and `chatbot/package.json` for dependencies

## Documentation
- Architecture, conventions, and recipes: see [docs/](docs/)
- MCP tool catalog: see [docs/mcp-tools-catalog.md](docs/mcp-tools-catalog.md)
- Copilot instructions: see [docs/copilot-instructions-guidelines.md](docs/copilot-instructions-guidelines.md)

## Getting Started
- See [agent/README.md](agent/README.md) for agent setup and running instructions
- See [chatbot/README.md](chatbot/README.md) for chatbot setup and running instructions

## License
MIT

---
For more details, refer to the documentation in the `docs/` folder and the individual service READMEs.

- **Agent API**: An AI-powered backend that retrieves, ranks, and summarizes documents in response to user queries. It exposes its functionality via an API endpoint.
- **Chatbot UI**: A user-friendly chat interface that allows users to interact with the agent, ask questions, and receive answers in a threaded conversation format.

## How It Works
1. Users interact with the chatbot UI, entering questions or requests.
2. The chatbot sends these queries to the agent API.
3. The agent processes the query, retrieves relevant documents, and generates concise answers.
4. The chatbot displays both user and agent messages in a standard chat format, maintaining conversation context.

## Key Features
- Threaded conversations with context-aware responses
- Semantic document search and ranking
- Tag-based filtering for more relevant results
- Clear separation of human and agent responses in the UI

## Getting Started
- See `agent/README.md` for details on running and developing the agent API.
- See `chatbot/README.md` for information about the chatbot UI and its integration with the agent API.

## Contributing & Code Generation
- Contribution guidelines and codegen agent instructions are available in `CONTRIBUTING.md` and `CODEGEN_GUIDE.md`.

## Support
For questions or help, open an issue or discussion in the repository.
