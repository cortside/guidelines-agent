# Component Documentation

This document outlines the component boundaries, responsibilities, and usage patterns for the Chatbot UI.

## Component Architecture

### App Component (`src/App.tsx`)
**Responsibility**: Main application container that manages global state and layout.

**Props**: None (root component)

**Key Features**:
- Manages conversation selection state
- Generates thread IDs for new conversations
- Orchestrates communication between Sidebar and ChatPage
- Provides the main layout structure

**Dependencies**:
- `useConversations` hook for conversation data
- `Sidebar` and `ChatPage` components

---

### ChatPage Component (`src/components/ChatPage.tsx`)
**Responsibility**: Main chat interface container that orchestrates the chat experience.

**Props**:
- `conversationId: string` - The ID of the current conversation

**Key Features**:
- Manages the complete chat flow
- Integrates MessageList, MessageBubble, and MessageInput
- Handles message submission and display
- Manages loading states

**Dependencies**:
- `useChatApi` hook for API communication
- MessageList, MessageBubble, MessageInput components

---

### MessageList Component (`src/components/ChatPage/MessageList.tsx`)
**Responsibility**: Renders the scrollable list of messages in the chat.

**Props**:
- `messages: Message[]` - Array of messages to display
- `loading: boolean` - Whether a response is being loaded

**Key Features**:
- Auto-scrolls to bottom when new messages arrive
- Handles loading indicators
- Provides proper message spacing and layout

**Dependencies**:
- `MessageBubble` component for individual messages
- `scrollToBottom` utility for auto-scrolling

---

### MessageBubble Component (`src/components/ChatPage/MessageBubble.tsx`)
**Responsibility**: Renders individual message bubbles with proper styling for user vs assistant messages.

**Props**:
- `message: Message` - The message object to display
- `index: number` - Index for key generation

**Key Features**:
- Distinguishes between user and assistant messages visually
- Handles message content rendering
- Provides consistent message styling

**Dependencies**:
- `getMessageKey` utility for generating unique keys
- Message type definition

---

### MessageInput Component (`src/components/ChatPage/MessageInput.tsx`)
**Responsibility**: Handles message input and submission.

**Props**:
- `onSend: (message: string) => void` - Callback for sending messages
- `disabled: boolean` - Whether input should be disabled (during loading)

**Key Features**:
- Input validation (prevents empty/whitespace-only messages)
- Keyboard shortcuts (Enter to send)
- Focus management
- Input clearing after submission

**Dependencies**:
- `isBlank` utility for input validation
- `focusElement` utility for focus management

---

### Sidebar Component (`src/components/Sidebar/Sidebar.tsx`)
**Responsibility**: Dynamic navigation sidebar for conversation thread management with full CRUD operations.

**Props**:
- `conversations: ThreadSummary[]` - Array of conversation threads with metadata
- `selected: string` - ID of currently selected conversation thread
- `onSelect: (id: string) => void` - Callback for thread selection
- `onCreate: () => void` - Callback for creating new threads ✨ **NEW**
- `onDelete: (id: string) => void` - Callback for deleting threads ✨ **NEW**

**Key Features**: ✨ **ENHANCED**
- Displays dynamic list of conversation threads from API
- Highlights currently selected conversation thread
- Handles conversation switching with preserved history
- "New Thread" creation button with loading states
- Thread deletion with confirmation dialogs
- Real-time thread list updates
- Loading and error state management
- Thread metadata display (name, last activity, message count)

**Dependencies**:
- ThreadSummary type definition ✨ **NEW**
- Enhanced conversation management hooks

---

## Custom Hooks

### useChatApi Hook (`src/hooks/useChatApi.ts`)
**Responsibility**: Manages chat API communication and message state.

**Parameters**:
- `conversationId: string` - The conversation context

**Returns**:
- `messages: Message[]` - Current conversation messages
- `send: (input: string) => Promise<void>` - Function to send messages
- `loading: boolean` - Whether a request is in progress

**Key Features**:
- Handles message state management
- API error handling with user-friendly messages
- Input validation
- Loading state management

**Dependencies**:
- `sendMessage` API function
- Utility functions: `isBlank`, `parseChatResponse`, `getErrorMessage`

---

### useConversations Hook (`src/hooks/useConversations.ts`) ✨ **ENHANCED**
**Responsibility**: Provides conversation thread data and complete thread management operations.

**Returns**:
- `threads: ThreadSummary[]` - Array of available conversation threads with metadata ✨ **NEW**
- `loading: boolean` - Loading state for thread operations ✨ **NEW**
- `error: string | null` - Error state for failed operations ✨ **NEW**
- `createThread: () => Promise<string>` - Function to create new thread ✨ **NEW**
- `deleteThread: (threadId: string) => Promise<void>` - Function to delete thread ✨ **NEW**
- `refreshThreads: () => Promise<void>` - Function to reload thread list ✨ **NEW**

**Key Features**: ✨ **ENHANCED**
- Dynamic thread list loading from API
- Real-time thread creation and deletion
- Thread state synchronization with backend
- Comprehensive error handling and loading states
- Thread metadata management (names, activity, message counts)
- Optimistic UI updates with rollback on failure

**Dependencies**:
- Thread management API functions (getAllThreads, createNewThread, deleteThread)
- ThreadSummary type definitions
- Error handling utilities

---

## Utility Functions

### String Utilities
- `isBlank(str: string): boolean` - Validates if string is empty or whitespace-only
- `formatString(str: string): string` - Handles string capitalization and formatting

### Message Utilities
- `getMessageKey(msg: Message, index: number): string` - Generates unique keys for message rendering

### API Utilities
- `parseChatResponse(res: any): string` - Extracts response content from API responses
- `getErrorMessage(error: unknown): string` - Extracts user-friendly error messages

### DOM Utilities
- `scrollToBottom(element: HTMLElement): void` - Scrolls element to bottom
- `focusElement(element: HTMLElement | null, delay?: number): void` - Manages element focus with timing

---

## Data Flow

```
App
├── useConversations() → conversations[]
├── Sidebar(conversations, selected, onSelect)
└── ChatPage(conversationId)
    ├── useChatApi(conversationId) → {messages, send, loading}
    ├── MessageList(messages, loading)
    │   └── MessageBubble(message, index) [repeated]
    └── MessageInput(onSend=send, disabled=loading)
```

## Key Design Principles

1. **Single Responsibility**: Each component has a clear, focused purpose
2. **Prop Drilling Minimization**: Use hooks to manage shared state
3. **Reusability**: Components are designed to be reusable with different props
4. **Separation of Concerns**: Business logic in hooks, presentation in components
5. **Type Safety**: All components use TypeScript for better maintainability
6. **Utility-First**: Common operations extracted to utility functions

## Extension Points

- **New Message Types**: Extend Message interface and MessageBubble component
- **Conversation Persistence**: Replace useConversations mock with real data management
- **Message Features**: Add timestamps, editing, deletion through MessageBubble
- **UI Themes**: Add theme context for dynamic styling
- **Real-time Updates**: Extend useChatApi for WebSocket or SSE support
