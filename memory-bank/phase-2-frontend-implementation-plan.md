# Phase 2: Frontend Streaming Implementation Plan

**Date**: September 29, 2025  
**Status**: 🔄 Implementation Starting  
**Previous**: ✅ Phase 1 Backend Complete

---

## Overview

Phase 2 implements the frontend streaming experience by updating the React chatbot to consume the new `/chat/stream` endpoint. This provides real-time message streaming with workflow progress indicators and responsive user feedback.

## Current Frontend Architecture

**Existing Implementation:**
- ✅ React 18+ with TypeScript
- ✅ Custom hooks: `useChatApi` for message management
- ✅ Component structure: `ChatPage` → `MessageList` + `MessageInput`
- ✅ Non-streaming API: `sendMessage()` using `/chat` endpoint
- ✅ Thread management and history loading

**Key Files to Modify:**
- `src/lib/api.ts` - Add streaming API functions
- `src/hooks/useChatApi.ts` - Add streaming message handling
- `src/components/ChatPage/MessageList.tsx` - Add streaming message display
- `src/types/message.ts` - Add streaming message types

---

## Implementation Tasks

### Task 1: Add Streaming API Support
**File**: `src/lib/api.ts`

**New Functions to Add:**
```typescript
// Server-Sent Events streaming for chat messages
export async function sendMessageStream(
  threadId: string, 
  message: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void>

// Stream event types matching backend SSE events
export interface StreamEvent {
  type: 'start' | 'step' | 'token' | 'complete' | 'error' | 'cancelled';
  data: any;
  timestamp: string;
}
```

**Implementation Details:**
- Use `EventSource` API for Server-Sent Events
- Handle all 6 event types from backend
- Support cancellation via AbortController
- Proper error handling and connection cleanup

### Task 2: Enhanced Message Types
**File**: `src/types/message.ts`

**New Types:**
```typescript
// Extend existing Message type for streaming
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // New streaming properties
  isStreaming?: boolean;
  streamingStep?: string;
  isComplete?: boolean;
  error?: string;
}

// Streaming state management
export interface StreamingState {
  isStreaming: boolean;
  currentStep: string;
  accumulatedContent: string;
  error?: string;
}
```

### Task 3: Streaming Chat Hook
**File**: `src/hooks/useChatApi.ts`

**Enhanced Hook:**
- Add `sendStreaming()` method alongside existing `send()`
- Real-time message updates during streaming
- Progress indicator state management
- Streaming cancellation support
- Error handling for streaming failures

**New State:**
```typescript
const {
  // Existing
  messages, loading, error,
  // New streaming features
  sendStreaming,
  isStreaming,
  streamingStep,
  cancelStream
} = useChatApi(conversationId);
```

### Task 4: Streaming UI Components
**Files**: `src/components/ChatPage/`

**MessageList Enhancements:**
- Streaming message bubble with progressive content
- Workflow progress indicators ("Searching documents...", "Generating response...")
- Typing animation during token streaming
- Cancellation button during active streams
- Error state display for failed streams

**MessageInput Enhancements:**
- Disable input during streaming
- Show streaming status in input area
- Cancel button integration

### Task 5: User Experience Features
**Components to Add/Enhance:**

**Streaming Progress Indicator:**
```tsx
<StreamingIndicator 
  step={streamingStep}
  isVisible={isStreaming}
/>
```

**Cancel Stream Button:**
```tsx
<CancelButton 
  onClick={cancelStream}
  disabled={!isStreaming}
/>
```

**Typing Animation:**
```tsx
<TypingDots visible={isStreaming && streamingStep === 'generating'} />
```

---

## Implementation Priority

### 🚀 **Phase 2A: Core Streaming (Essential)**
1. ✅ Backend SSE API working
2. 🔄 Frontend EventSource integration
3. 🔄 Basic streaming message display
4. 🔄 Stream cancellation support

### 🎨 **Phase 2B: Enhanced UX (Nice-to-have)**
1. 🔄 Workflow progress indicators
2. 🔄 Typing animations
3. 🔄 Improved error handling
4. 🔄 Mobile responsiveness for streaming

### 🧪 **Phase 2C: Testing & Polish**
1. 🔄 Streaming integration tests
2. 🔄 Error scenario testing
3. 🔄 Performance optimization
4. 🔄 Accessibility improvements

---

## Technical Considerations

### EventSource vs Fetch Streaming
- **EventSource**: Simpler, built-in retry logic, perfect for SSE
- **Decision**: Use EventSource for reliable SSE handling

### State Management
- **Streaming State**: Local state in useChatApi hook
- **Message Updates**: Real-time updates to messages array
- **Cancellation**: AbortController integration

### Error Handling
- **Connection Errors**: Graceful fallback to regular API
- **Stream Errors**: Display error in message bubble
- **Network Issues**: Retry logic and user feedback

### Mobile Considerations
- **Performance**: Efficient DOM updates during streaming
- **Battery**: Minimize background processing
- **UX**: Touch-friendly cancel buttons

---

## Success Criteria

### Phase 2A Success Metrics:
- ✅ Users see messages streaming in real-time
- ✅ Progress indicators show workflow steps
- ✅ Cancellation works reliably
- ✅ Fallback to regular API on streaming failure

### Phase 2B Success Metrics:
- ✅ Smooth typing animations
- ✅ Clear workflow progress feedback
- ✅ Mobile-optimized streaming experience
- ✅ Accessible streaming interface

### Final Integration Success:
- ✅ Seamless user experience with streaming
- ✅ Backward compatibility maintained
- ✅ Performance comparable to non-streaming
- ✅ All existing tests continue to pass

---

## Next Steps

**Immediate Action:** Start with Task 1 - Add streaming API support in `api.ts`

**Timeline Estimate:** 
- Phase 2A: 2-3 hours
- Phase 2B: 1-2 hours  
- Phase 2C: 1 hour

**Total Phase 2: ~4-6 hours**

---

Ready to begin implementation! 🚀
