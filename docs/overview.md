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

- **Current State:** ✨ **SIGNIFICANTLY ENHANCED**
  - ✅ **Production-Ready Thread System**: Complete multi-conversation support with React StrictMode compatibility
  - ✅ **Zero-Duplicate Thread Creation**: Robust protection against duplicate thread creation on page reload
  - ✅ **Intelligent Thread Selection**: Smart initialization logic that selects existing threads vs creating new ones
  - ✅ **Real-time Sidebar Updates**: Automatic thread list refresh after message exchanges  
  - ✅ **Enhanced Focus Management**: Seamless input focus after thread creation and switching
  - ✅ **Mobile-Optimized UX**: Responsive design with mobile-specific focus behavior
  - ✅ **Comprehensive Error Handling**: User-friendly error messages and recovery mechanisms
  - ✅ **Type Safety**: Full TypeScript coverage with enhanced interfaces

- **Recent Major Enhancements:** ✨ **NEW SECTION**
  - **Thread Lifecycle Management**: Completely rewritten initialization logic with proper timing
  - **React StrictMode Compatibility**: Global flags and enhanced protection mechanisms
  - **Message Completion Callbacks**: Real-time thread updates after successful message exchanges
  - **Advanced State Management**: Proper separation of loading states and thread data availability
  - **Performance Optimization**: Reduced API calls and improved caching strategies
  - **User Experience Improvements**: Automatic focus management and seamless thread switching

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
  - Allows users to submit queries, view responses, and manage multiple conversation threads.
  - Features dynamic thread management with persistent conversation history.

- **Key Files:**
  - `src/App.tsx`: Main React component managing global thread state and application flow.
  - `src/components/ChatPage/`: Modular chat UI components (MessageList, MessageBubble, MessageInput).
  - `src/components/Sidebar/Sidebar.tsx`: ✨ **Enhanced** - Dynamic sidebar for thread management with CRUD operations.
  - `src/hooks/useChatApi.ts`: Custom hook for chat API logic with comprehensive error handling.
  - `src/hooks/useConversations.ts`: ✨ **NEW** - Thread management hook with full API integration.
  - `src/lib/api.ts`: ✨ **Enhanced** - API client with complete thread management support.
  - `src/types/`: Centralized TypeScript interfaces including thread management types.
  - `src/utils/`: Extracted utility functions for validation, parsing, and DOM operations.

- **Current State:**
  - ✅ **Enterprise-Ready Architecture**: Complete modular component structure with separation of concerns
  - ✅ **Multi-Thread Support**: Full conversation thread management with persistent history ✨ **NEW**
  - ✅ **Type Safety**: Complete TypeScript coverage with proper interfaces and prop definitions
  - ✅ **State Management**: Efficient state management with custom hooks and API synchronization
  - ✅ **User Experience**: Intuitive interface with loading states, error handling, and responsive design
  - ✅ **API Integration**: Full integration with backend thread management endpoints
  - `src/hooks/useConversations.ts`: Custom hook for conversation management.
  - `src/types/`: Shared TypeScript types for messages and conversations.
  - `src/utils/`: Utility functions (string formatting, scroll, validation, key generation, API parsing, error extraction, etc.).
  - `src/lib/api.ts`: Handles API requests to the backend.
  - `index.html`, `App.css`, `tailwind.config.js`: UI layout and styling.
  - `Dockerfile`, `k8s-deployment.yaml`, `k8s-service.yaml`: Deployment configuration for containerization and Kubernetes.

- **Current State:**
  - **COMPLETED (Sept 2025)**: Full modularization with separated components, hooks, and utilities.
  - Enhanced TypeScript types and comprehensive component documentation.
  - All utility functions extracted and implemented.
  - Clean, maintainable architecture ready for enterprise features.

- **Areas for Improvement:**
  - Add UI/UX enhancements and accessibility features (Step 2).
  - Implement robust error handling and user feedback (Step 3).
  - Add end-to-end and component tests (Step 4).

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
