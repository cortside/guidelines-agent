# Component Documentation

This document outlines the component boundaries, responsibilities, and usage patterns for the Chatbot UI.

## Component Architecture

### App Component (`src/App.tsx`)
**Responsibility**: Main application container that manages global state, thread lifecycle, and layout.

**Props**: None (root component)

**Key Features**:
- **Thread Management**: Manages conversation selection state and thread lifecycle
- **Intelligent Initialization**: Automatically selects existing threads or creates new ones as needed
- **React StrictMode Compatible**: Robust duplicate prevention for development mode
- **Real-time Updates**: Handles thread refresh after message exchanges
- **Focus Coordination**: Provides callbacks for seamless user experience
- **Responsive Layout**: Orchestrates communication between Sidebar and ChatPage

**State Management**:
- Uses `useConversations` hook for thread data and operations
- Implements `initializationAttempted` ref for duplicate prevention
- Manages sidebar visibility and responsive behavior

**Key Methods**:
- `handleCreateThread()`: Creates new thread and switches to it
- `handleDeleteThread()`: Removes thread and handles current thread cleanup
- `handleMessageComplete()`: Refreshes thread list after message exchanges

**Dependencies**:
- `useConversations` hook for conversation data
- `Sidebar` and `ChatPage` components

---

### ChatPage Component (`src/components/ChatPage.tsx`)
**Responsibility**: Main chat interface container that orchestrates the chat experience with enhanced focus management.

**Props**:
- `conversationId: string` - The ID of the current conversation
- `onMessageComplete?: () => void` - Callback for message completion events

**Key Features**:
- **Complete Chat Flow**: Manages the entire chat interaction lifecycle
- **Enhanced Focus Management**: Auto-focuses input on mount and conversation changes
- **Message Integration**: Integrates MessageList, MessageBubble, and MessageInput
- **State Management**: Handles message submission, display, and loading states
- **Error Handling**: Comprehensive error management with retry capabilities
- **Mobile Optimization**: Responsive behavior with mobile-specific focus handling

**Focus Behavior**:
- Auto-focuses input when conversation changes (new thread selected)
- Maintains focus after message submission
- Disabled on mobile to prevent keyboard popup issues
- 100ms delay for DOM readiness after conversation switch

**Dependencies**:
- `useChatApi` hook for API communication with callback support
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

### useChatApi Hook (`src/hooks/useChatApi.ts`) ✨ **ENHANCED**
**Responsibility**: Manages chat API communication, message state, and message completion events.

**Parameters**:
- `conversationId: string` - The conversation context
- `onMessageComplete?: () => void` - Optional callback for message completion events ✨ **NEW**

**Returns**:
- `messages: Message[]` - Current conversation messages
- `send: (input: string) => Promise<void>` - Function to send messages
- `loading: boolean` - Whether a request is in progress
- `loadingHistory: boolean` - Whether thread history is being loaded ✨ **NEW**
- `error: Error | null` - Current error state ✨ **NEW**
- `clearError: () => void` - Function to clear error state ✨ **NEW**
- `refreshHistory: () => void` - Function to reload conversation history ✨ **NEW**

**Key Features**: ✨ **ENHANCED**
- **Message State Management**: Complete lifecycle management for conversation messages
- **Thread History Loading**: Automatic loading of existing conversation history
- **Message Completion Callbacks**: Triggers parent updates after successful message exchanges
- **Enhanced Error Handling**: Comprehensive error management with user-friendly messages
- **Input Validation**: Prevents empty/whitespace-only message submission
- **Loading State Management**: Separate states for message sending and history loading

**Dependencies**:
- `sendMessage` and `getThread` API functions
- Utility functions: `isBlank`, `parseChatResponse`, `getErrorMessage`

---

### useConversations Hook (`src/hooks/useConversations.ts`) ✨ **SIGNIFICANTLY ENHANCED**
**Responsibility**: Provides comprehensive thread management with React StrictMode compatibility and real-time updates.

**Parameters**: None

**Returns**:
- `threads: Conversation[]` - Array of conversation threads with complete metadata ✨ **ENHANCED**
- `currentThreadId: string | null` - Currently selected thread ID ✨ **NEW**
- `loading: boolean` - Loading state for thread operations
- `error: string | null` - Error state for failed operations  
- `threadsLoaded: boolean` - Whether initial thread loading is complete ✨ **NEW**
- `loadThreads: (forceRefresh?: boolean) => Promise<void>` - Load/refresh threads ✨ **ENHANCED**
- `createThread: (name?: string) => Promise<string | null>` - Create new thread ✨ **ENHANCED**
- `removeThread: (threadId: string) => Promise<boolean>` - Delete thread ✨ **NEW**
- `renameThread: (threadId: string, newName: string) => Promise<boolean>` - Rename thread ✨ **NEW**
- `setCurrentThread: (threadId: string | null) => void` - Set active thread ✨ **NEW**
- `clearError: () => void` - Clear error state ✨ **NEW**

**Key Features**: ✨ **SIGNIFICANTLY ENHANCED**
- **React StrictMode Compatibility**: Global flags prevent duplicate thread creation during development
- **Intelligent Thread Loading**: Distinguishes between initial load and force refresh operations  
- **Real-time Thread Updates**: Force refresh capability for post-message thread list updates
- **Complete CRUD Operations**: Create, read, update, delete operations for threads
- **Thread Validation**: Integration with backend validation for thread integrity
- **Optimized State Management**: Local state updates for immediate UI feedback
- **Error Recovery**: Comprehensive error handling with recovery mechanisms
- **Performance Optimization**: Prevents unnecessary API calls while allowing forced updates

**Thread Management Features**:
- **Duplicate Prevention**: Global initialization flags prevent React StrictMode issues
- **Timing Control**: Proper sequencing of initialization and thread loading
- **State Synchronization**: Real-time updates after message exchanges
- **Memory Management**: Efficient cleanup and state management

**Dependencies**:
- API functions: `getAllThreads`, `createNewThread`, `deleteThread`, `updateThreadName`
- Thread type definitions and conversation state interfaces
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
