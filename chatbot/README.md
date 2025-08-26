# Chatbot UI

A React 19 + TypeScript chat UI for interacting with the FastAPI MCP agent.

## Features
- Chat page with streaming messages via WebSocket
- API client for backend
- OIDC login (PKCE), JWT stored in memory
- Modern UI: Tailwind CSS + shadcn/ui
- Dockerfile, `.env.example`, k8s manifests

## Requirements
- Node.js 18+
- See `package.json` for dependencies

## Setup
1. Install dependencies:
   ```pwsh
   npm install
   ```
2. Copy `.env.example` to `.env` and set required environment variables.

## Running
```pwsh
npm run dev
```

## Build
```pwsh
npm run build
```

# Chatbot UI Component

## Overview
This directory contains the chatbot user interface for interacting with the agent API. The chatbot allows users to have threaded conversations, sending queries to the agent and displaying both human and agent responses in a standard chat format.

## Features
- Threaded conversation: Maintains context across multiple user and agent messages.
- Standard chat style: Human and agent responses are visually distinguished.
- Calls the agent API for document retrieval and question answering.

## Basic Usage
1. Start the chatbot UI (see implementation for details).
2. Enter queries in the chat input box.
3. View responses from the agent in the chat window.
4. Continue the conversation; context is preserved for follow-up questions.

## Example Conversation
```
User: What is the process for storing documents?
Agent: The process involves uploading documents, which are then indexed and made available for semantic search and retrieval.
User: Can I filter results by tags?
Agent: Yes, you can specify tags to filter relevant documents during your search.
```

## Implementation Notes
- The chatbot UI should make HTTP requests to the agent API endpoint.
- Display messages in a threaded format, with clear separation between user and agent turns.
- Optionally, support markdown or rich text in agent responses.

## Further Help
See root `README.md` for overall application architecture and integration details.
