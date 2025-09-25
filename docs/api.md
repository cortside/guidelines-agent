# API Module Documentation (`agentts/`)

## Purpose
The `agentts/` directory implements the backend API that wraps a LangGraph agent. It is responsible for document ingestion, prompt management, workflow orchestration, and serving as the backend for the chatbot UI.

## Main Components

- **main.ts**: Entry point for the API server. Initializes and starts the API, sets up routes/endpoints, and connects to the agent logic.
- **DocumentLoader.ts**: Contains logic for loading, parsing, and preparing documents for use by the agent. Handles supported file types and may include preprocessing steps.
- **PromptTemplates.ts**: Manages prompt templates, including loading, storing, and updating templates used by the agent for various tasks.
- **Workflow.ts**: Defines the workflow logic for the agent, including task orchestration, state management, and integration with LangGraph.
- **db/chroma.sqlite3**: Local SQLite database for storing embeddings, metadata, or other persistent data required by the agent.

## Key Concepts

- **LangGraph Agent**: The core AI agent, responsible for processing user input, managing context, and generating responses.
- **Document Ingestion**: The process of loading and preparing documents for use in the agent's context or knowledge base.
- **Prompt Management**: Handling of prompt templates to ensure consistent and effective communication with the agent.
- **Workflow Orchestration**: Managing the sequence of operations and state transitions within the agent.

## Current Limitations

- Prototype-level code; lacks modularity, robust error handling, and enterprise-grade configuration.
- Minimal logging or monitoring.
- Limited test coverage.

## Recommendations

- Refactor for modularity and separation of concerns.
- Add API documentation (OpenAPI/Swagger).
- Implement logging and error handling.
- Add unit and integration tests.
- Improve configuration management (environment variables, secrets).

---

For usage examples and API reference, see future documentation updates.
