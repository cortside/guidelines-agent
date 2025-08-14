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

## License
MIT
