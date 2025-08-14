# FastAPI MCP Agent

This service provides a REST API for answering guideline questions using LLMs and semantic search. It loads guideline documents, embeds them, and orchestrates a workflow for question answering. It also integrates with an MCP server for tool invocation, and exposes metrics and health endpoints.

## Features
- `/chat` endpoint: Accepts user questions, streams answers (SSE/WebSocket), uses LLM and retriever workflow
- `/health` endpoint: Liveness/readiness checks
- `/metrics` endpoint: Prometheus metrics
- Observability: Prometheus + OpenTelemetry
- MCP client: HTTP integration with retries
- In-memory chat history per user
- Dockerfile, `.env.example`, k8s manifests

## Requirements
- Python 3.11+
- See `requirements.txt` for dependencies

## Setup
1. Create and activate a virtual environment:
   ```pwsh
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
2. Install dependencies:
   ```pwsh
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and set required environment variables.

## Running
```pwsh
python main.py
```

## Endpoints
- `POST /chat` – Ask a question, get a streamed answer
- `GET /health` – Health check
- `GET /metrics` – Prometheus metrics

## Observability
- Metrics exposed at `/metrics`
- Tracing via OpenTelemetry

## License
MIT

---
