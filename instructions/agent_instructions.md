# Agent Instructions

## Purpose
Guidelines for developing, extending, and maintaining the agent component (`agent/*`).

## Coding Standards
- Use TypeScript and follow project conventions.
- Prefer async/await for asynchronous operations.
- Document public APIs and complex logic.
- Use clear, descriptive names for files, classes, and functions.

## Architecture
- Main workflow: `Workflow.ts`
- Document ingestion: `DocumentLoader.ts`
- Prompt customization: `PromptTemplates.ts`
- Entry point: `main.ts`

## Extension Points
- To add new retrieval tools, extend the `retrieve` tool in `Workflow.ts`.
- For new prompt templates, update `PromptTemplates.ts`.
- For new document types, extend `DocumentLoader.ts`.

## Code Generation & PR Review
- Generated code should be modular, readable, and maintainable.
- Ensure proper error handling and test coverage.
- Adhere to the PR checklist in `CONTRIBUTING.md`.

## API Guidelines
- Expose agent functionality via a clear API endpoint.
- Validate and sanitize all inputs.
- Return concise, relevant responses for chatbot consumption.

## Further Reference
- See `agent/README.md`, `CODEGEN_GUIDE.md`, and root `README.md` for more details.
