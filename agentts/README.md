# Agent Component

## Overview
This directory contains the AI-powered agent responsible for document retrieval, ranking, and question answering. The agent exposes its functionality via an API, which is consumed by the chatbot UI and other clients.

## Architecture
- `Workflow.ts`: Main workflow logic, including document ranking and retrieval.
- `DocumentLoader.ts`: Loads and processes documents for the vector store.
- `PromptTemplates.ts`: Templates for prompts sent to the LLM.
- `main.ts`: Entry point for running the agent.
- Dependencies: LangChain, OpenAI, Zod, TypeScript.

## Setup
1. Install dependencies:
   ```pwsh
   npm install
   ```
2. Configure environment variables for OpenAI API keys as needed.
3. Run the agent:
   ```pwsh
   npm start
   ```

## Usage
- The agent retrieves documents using semantic search and ranks them using an LLM.
- Supports filtering by tags and returns concise, relevant context for question answering.

## Coding Conventions
- TypeScript is used throughout.
- Use clear, descriptive names for files, classes, and functions.
- Document public APIs and complex logic with comments.
- Prefer async/await for asynchronous operations.

## Copilot & Code Generation Tips
- Entry points for codegen: `Workflow.ts` (main logic), `DocumentLoader.ts` (data ingestion), `PromptTemplates.ts` (prompt customization).
- When generating code, follow the existing file structure and naming conventions.
- For PR reviews, check for:
  - Clear separation of concerns
  - Proper error handling
  - Sufficient test coverage
  - Adherence to TypeScript best practices

## Further Help
See root `CONTRIBUTING.md` and `CODEGEN_GUIDE.md` for contribution and codegen agent instructions.
