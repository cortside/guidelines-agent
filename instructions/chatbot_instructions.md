# Chatbot Instructions

## Purpose
Guidelines for developing and maintaining the chatbot UI component (`chatbot/*`).

## Coding Standards
- Use modern frontend frameworks (e.g., React, Vue, etc.)
- Maintain clear separation of UI, state management, and API calls.
- Use descriptive names for components, functions, and variables.
- Document complex logic and public APIs.

## UI/UX Requirements
- Display threaded conversations, preserving context across turns.
- Clearly distinguish human and agent responses in the chat interface.
- Support markdown or rich text in agent responses (optional).

## API Integration
- Communicate with the agent API via HTTP requests.
- Handle errors gracefully and provide user feedback.
- Maintain conversation state for follow-up questions.

## Code Generation & PR Review
- Generated code should be modular, maintainable, and easy to test.
- Adhere to the PR checklist in `CONTRIBUTING.md`.

## Further Reference
- See `chatbot/README.md`, root `README.md`, and `CODEGEN_GUIDE.md` for more details.
