# Guidelines Agent Codebase Overview

## Project Structure

This repository contains two main components:

1. **API (agentts/)**: A TypeScript-based API that wraps a LangGraph agent, responsible for handling document loading, prompt templates, workflow orchestration, and agent logic.
2. **Chatbot UI (chatbot/)**: A React-based chat interface for interacting with the agent, designed for end-user conversations and feedback.

---

## 1. API (agentts/)

- **Purpose:**
  - Provides an API layer for interacting with the LangGraph agent.
  - Handles document ingestion, prompt management, and workflow execution.
  - Serves as the backend for the chatbot UI and other potential clients.

- **Key Files:**
  - `main.ts`: Entry point for the API server.
  - `DocumentLoader.ts`: Handles loading and processing of documents for the agent.
  - `PromptTemplates.ts`: Manages prompt templates used by the agent.
  - `Workflow.ts`: Defines and manages the agent's workflow logic.
  - `db/chroma.sqlite3`: Local database for storing embeddings or metadata.
  - `package.json`, `tsconfig.json`: Project configuration and dependencies.

- **Current State:**
  - Prototype-level structure; code organization and error handling may not meet enterprise standards.
  - Lacks modularization, comprehensive testing, and robust configuration management.

- **Areas for Improvement:**
  - Refactor for modularity and separation of concerns.
  - Add API documentation (OpenAPI/Swagger).
  - Implement logging and error handling.
  - Add unit and integration tests.
  - Improve configuration management (env files, secrets handling).

---

## 2. Chatbot UI (chatbot/)

- **Purpose:**
  - Provides a user-friendly web interface for interacting with the agent API.
  - Allows users to submit queries, view responses, and manage conversations.

- **Key Files:**
  - `src/App.tsx`: Main React component.
  - `src/components/ChatPage.tsx`, `Sidebar.tsx`: UI components for chat and navigation.
  - `src/lib/api.ts`: Handles API requests to the backend.
  - `index.html`, `App.css`, `tailwind.config.js`: UI layout and styling.
  - `Dockerfile`, `k8s-deployment.yaml`, `k8s-service.yaml`: Deployment configuration for containerization and Kubernetes.

- **Current State:**
  - Prototype UI; may lack accessibility, responsiveness, and error handling.
  - Minimal state management and testing.

- **Areas for Improvement:**
  - Refactor for maintainability and scalability.
  - Add UI/UX enhancements and accessibility features.
  - Implement robust error handling and user feedback.
  - Add end-to-end and component tests.

---

## General Recommendations for Enterprise Readiness

- **Code Quality:**
  - Enforce linting, formatting, and code review processes.
  - Add comprehensive documentation and inline comments.
- **Testing:**
  - Implement unit, integration, and end-to-end tests.
- **Security:**
  - Add secure secrets management.
- **DevOps:**
  - Set up CI/CD pipelines for automated testing and deployment.
- **Documentation:**
  - Maintain up-to-date documentation for onboarding and development.

---

## Next Steps

- Review and refactor code for modularity and maintainability.
- Add missing documentation and tests.
- Plan for feature expansion and enterprise requirements.

---

For detailed module-level documentation, see additional files in this `docs/` folder.
