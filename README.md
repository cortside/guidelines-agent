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
