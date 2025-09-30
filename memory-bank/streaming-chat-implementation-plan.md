# Streaming Chat Implementation Plan

**Feature**: Add `/chat/stream` endpoint with Server-Sent Events (SSE) streaming and update chatbot UI to use streaming responses with real-time display and cancellation support.

**Date**: September 29, 2025  
**Status**: ✅ Phase 1 COMPLETE - Phase 2 Ready  
**Branch**: `streamable-response`

---

## Overview

This plan implements a new streaming chat endpoint that exposes LangGraph's existing streaming capabilities via Server-Sent Events (SSE), while maintaining backward compatibility with the existing `/chat` endpoint. The chatbot UI will be updated to consume streaming responses with real-time display, progress indicators, and cancellation support.

### Key Requirements
- ✅ Use Server-Sent Events (SSE) for streaming
- ✅ Expose existing LangGraph streaming mechanism  
- ✅ Maintain existing `/chat` endpoint unchanged
- ✅ Show partial responses with cancellation support
- ✅ Same thread management as `/chat`
- ✅ Handle <10 concurrent users (no rate limiting needed)
- ✅ Stream without buffering
- ✅ Add stream health monitoring
- ✅ Comprehensive test coverage

---

## Technical Architecture

### Streaming Strategy: Hybrid Approach ✅ **SELECTED**

**Decision**: Implement Option 3 (Hybrid) - combines workflow-level progress updates with token-level content streaming for optimal user experience.

**Benefits**:
- Users see clear progress during document retrieval and ranking phases
- Real-time responsive text streaming during LLM generation
- Transparent workflow visibility matches existing LangGraph architecture
- Perfect balance between progress transparency and responsiveness

**Implementation Strategy**:

1. **Workflow Steps**: Document retrieval, ranking, generation phases with progress events
2. **Token Streaming**: Real-time text chunks during LLM response generation  
3. **Progress Indicators**: Clear status updates for each processing phase
4. **Error Handling**: Graceful error events with connection cleanup

**Event Flow Example**:
```
event: start → "Starting conversation..."
event: step → "Searching documents..." (retrieval phase)
event: step → "Ranking results..." (ranking phase) 
event: step → "Generating response..." (generation phase)
event: token → "Based " (real-time text streaming)
event: token → "on the guidelines, "
event: token → "here is the answer..."
event: complete → "Response complete"
```

### SSE Event Format
```typescript
// Event Types
event: start     // Initialize streaming session
event: step      // Workflow progress updates  
event: token     // Content chunks during generation
event: complete  // Successful completion
event: error     // Error occurred
event: cancelled // User cancellation
```

---

## Implementation Plan

### Phase 1: Backend API Implementation ✅ COMPLETE

#### 1.1 Create Streaming Chat Service Enhancement ✅
**File**: `agentts/src/services/chatService.ts`

**New Method**: `processMessageStream(threadId, message, responseWriter)`
- Expose LangGraph's existing `streamMode: "values"` 
- Extract workflow steps (retrieval, ranking, generation)
- Stream content tokens during LLM generation
- Handle cancellation via AbortController
- Maintain same thread management as existing `processMessage()`

**Implementation Details**:
```typescript
async processMessageStream(
  threadId: string, 
  content: string, 
  responseWriter: ServerResponse,
  abortController: AbortController
): Promise<void> {
  // Initialize SSE headers
  // Create workflow stream with LangGraph
  // Track workflow steps and emit progress events
  // Stream LLM tokens during generation phase
  // Handle cancellation and cleanup
  // Update thread metadata on completion
}
```

#### 1.2 Add Streaming Route Handler ✅
**File**: `agentts/src/fastify-routes/chat.ts`

**New Endpoint**: `POST /chat/stream`
- TypeBox schema validation (same as `/chat`)
- SSE response headers setup
- AbortController integration for cancellation
- Connection management and cleanup
- Error handling with proper SSE events

**Schema Definition**:
```typescript
// Request: Same as ChatRequestSchema
// Response: text/event-stream with SSE events
```

#### 1.3 TypeBox Schema Updates ✅
**File**: `agentts/src/schemas/chat.ts`

**New Schemas**:
- `StreamEventSchema` - Define SSE event structure
- `StreamResponseSchema` - Document streaming response format
- Update OpenAPI documentation for streaming endpoint

#### 1.4 Stream Health Monitoring ✅
**File**: `agentts/src/infrastructure/streamMonitor.ts`

**Monitoring Metrics**:
- Active streaming connections count
- Average stream duration
- Cancellation rate
- Error rate per connection
- Connection cleanup tracking

### Phase 2: Frontend UI Implementation  

#### 2.1 Streaming API Integration
**File**: `chatbot/src/lib/api.ts`

**New Function**: `sendMessageStream(threadId, message, onEvent, abortController)`
- EventSource integration for SSE consumption
- Event parsing and type safety
- Cancellation support via AbortController
- Error handling and reconnection logic

**Event Handler Interface**:
```typescript
interface StreamEventHandlers {
  onStart: (data: StartEvent) => void;
  onStep: (data: StepEvent) => void;
  onToken: (data: TokenEvent) => void;
  onComplete: (data: CompleteEvent) => void;
  onError: (data: ErrorEvent) => void;
  onCancelled: (data: CancelledEvent) => void;
}
```

#### 2.2 Enhanced Chat Hook
**File**: `chatbot/src/hooks/useChatApi.ts`

**Streaming Integration**:
- Replace `sendMessage` calls with `sendMessageStream`
- Real-time message building from token events
- Progress state management (retrieval, ranking, generating)
- Cancellation state and controls
- Error handling for streaming failures

**State Management**:
```typescript
interface ChatStreamState {
  isStreaming: boolean;
  currentStep: 'retrieval' | 'ranking' | 'generation' | null;
  partialResponse: string;
  canCancel: boolean;
  streamError: Error | null;
}
```

#### 2.3 UI Components Enhancement

**File**: `chatbot/src/components/ChatPage/MessageInput.tsx`
- Add "Stop Generating" button during streaming
- Disable input during active streaming
- Cancel button styling and accessibility

**File**: `chatbot/src/components/ChatPage/MessageList.tsx`  
- Real-time message updates during streaming
- Progress indicators for workflow steps
- Typing animation during generation
- Cancelled/incomplete message styling

**File**: `chatbot/src/components/ChatPage/MessageBubble.tsx`
- Support for partial/streaming message state
- Progress indicators (searching, ranking, generating)
- Cancelled message visual treatment
- Loading animations and states

#### 2.4 New UI Components

**File**: `chatbot/src/components/ChatPage/StreamingIndicator.tsx`
- Visual progress for retrieval/ranking phases
- Typing indicator for generation phase  
- Cancellation button with confirmation
- Progress text ("Searching documents...", "Generating response...")

### Phase 3: Testing Implementation

#### 3.1 Backend API Tests
**Files**: 
- `agentts/tests/integration/streaming-chat.test.ts`
- `agentts/tests/unit/chatService-streaming.test.ts`

**Test Coverage**:
- SSE endpoint response format validation
- Streaming workflow step events
- Token streaming during generation
- Cancellation mid-stream
- Error handling and cleanup
- Thread management consistency
- Concurrent streaming sessions
- Connection cleanup on client disconnect

#### 3.2 Frontend UI Tests  
**Files**:
- `chatbot/src/components/ChatPage/StreamingIndicator.test.tsx`
- `chatbot/src/hooks/useChatApi-streaming.test.ts`
- `chatbot/src/lib/api-streaming.test.ts`

**Test Coverage**:
- EventSource integration
- Real-time UI updates from stream events
- Cancellation button functionality
- Progress indicator state changes
- Error handling and recovery
- Message building from token chunks
- Accessibility of streaming UI elements

#### 3.3 End-to-End Tests
**File**: `tests/e2e/streaming-workflow.test.ts`

**Test Scenarios**:
- Complete streaming conversation flow
- Mid-stream cancellation by user
- Network interruption recovery
- Multiple concurrent streaming sessions
- Backward compatibility with `/chat` endpoint

---

## Detailed Implementation Specifications

### Backend Streaming Flow (Hybrid Approach)

```typescript
// Hybrid streaming workflow implementation
async function processMessageStream(
  threadId: string,
  content: string, 
  responseWriter: ServerResponse,
  abortController: AbortController
) {
  const messageId = generateMessageId();
  let currentWorkflowStep = 'initializing';
  
  try {
    // 1. Send start event
    writeSSE('start', { 
      threadId, 
      messageId, 
      timestamp: new Date().toISOString() 
    });
    
    // 2. Setup LangGraph streaming with workflow step detection
    const stream = await this.graph.stream(inputs, threadConfig);
    
    for await (const step of stream) {
      // Check for cancellation
      if (abortController.signal.aborted) {
        writeSSE('cancelled', { messageId, step: currentWorkflowStep });
        return;
      }
      
      // Detect workflow phase changes
      if (isToolCallStep(step, 'retrieve')) {
        currentWorkflowStep = 'retrieval';
        writeSSE('step', { 
          step: 'retrieval', 
          status: 'processing',
          message: 'Searching relevant documents...'
        });
      } 
      else if (isRankingStep(step)) {
        currentWorkflowStep = 'ranking';
        writeSSE('step', { 
          step: 'ranking', 
          status: 'processing',
          message: 'Ranking search results...'
        });
      }
      else if (isAIMessageStep(step)) {
        currentWorkflowStep = 'generation';
        writeSSE('step', { 
          step: 'generation', 
          status: 'started',
          message: 'Generating response...'
        });
        
        // Stream AI response tokens in real-time
        const aiMessage = step.messages[step.messages.length - 1];
        await streamContentTokens(aiMessage.content, responseWriter, abortController);
      }
    }
    
    // 3. Send completion event
    writeSSE('complete', { 
      messageId, 
      timestamp: new Date().toISOString(),
      status: 'complete' 
    });
    
  } catch (error) {
    writeSSE('error', { 
      messageId, 
      error: error.message,
      step: currentWorkflowStep 
    });
  }
}

// Helper function for token-level streaming
async function streamContentTokens(
  content: string, 
  responseWriter: ServerResponse,
  abortController: AbortController
) {
  // Split content into meaningful chunks (words/phrases)
  const tokens = content.split(/(\s+)/).filter(t => t.length > 0);
  
  for (const token of tokens) {
    if (abortController.signal.aborted) break;
    
    writeSSE('token', { content: token });
    
    // Small delay for natural typing effect
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
```

### Frontend Streaming Integration (Hybrid Approach)

```typescript
// Enhanced UI streaming integration for hybrid approach
function useChatApiStreaming() {
  const [streamState, setStreamState] = useState<ChatStreamState>({
    isStreaming: false,
    currentStep: null,
    stepMessage: '',
    partialResponse: '',
    canCancel: false,
    streamError: null
  });

  const sendMessage = (message: string) => {
    const abortController = new AbortController();
    let currentMessageId = '';
    
    // Reset streaming state
    setStreamState({
      isStreaming: true,
      currentStep: 'initializing', 
      stepMessage: 'Starting conversation...',
      partialResponse: '',
      canCancel: true,
      streamError: null
    });
    
    sendMessageStream(threadId, message, {
      onStart: (data) => {
        currentMessageId = data.messageId;
        setStreamState(prev => ({
          ...prev,
          currentStep: 'started',
          stepMessage: 'Processing your request...'
        }));
      },
      
      onStep: (data) => {
        // Update progress based on workflow step
        const stepMessages = {
          retrieval: 'Searching relevant documents...',
          ranking: 'Ranking search results...',
          generation: 'Generating response...'
        };
        
        setStreamState(prev => ({
          ...prev,
          currentStep: data.step,
          stepMessage: stepMessages[data.step] || data.message
        }));
      },
      
      onToken: (data) => {
        // Accumulate tokens for real-time display
        setStreamState(prev => ({
          ...prev,
          partialResponse: prev.partialResponse + data.content
        }));
      },
      
      onComplete: (data) => {
        // Finalize the message
        finalizeMessage(currentMessageId, streamState.partialResponse);
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          canCancel: false,
          currentStep: null,
          stepMessage: ''
        }));
      },
      
      onCancelled: (data) => {
        // Mark message as incomplete/cancelled
        markMessageIncomplete(currentMessageId, streamState.partialResponse);
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          canCancel: false,
          currentStep: null,
          stepMessage: 'Response cancelled'
        }));
      },
      
      onError: (error) => {
        handleStreamError(error);
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          canCancel: false,
          streamError: error,
          stepMessage: 'Error occurred'
        }));
      }
    }, abortController);
    
    // Store abort controller for cancellation
    setAbortController(abortController);
  };

  const cancelStream = () => {
    if (abortController && streamState.canCancel) {
      abortController.abort();
    }
  };

  return {
    ...streamState,
    sendMessage,
    cancelStream
  };
}

// Enhanced ChatStreamState interface for hybrid approach
interface ChatStreamState {
  isStreaming: boolean;
  currentStep: 'initializing' | 'retrieval' | 'ranking' | 'generation' | null;
  stepMessage: string;        // Human-readable step description
  partialResponse: string;    // Accumulated response content
  canCancel: boolean;
  streamError: Error | null;
}
```

---

## Error Handling Strategy

### Backend Error Events
- **Connection Errors**: Send error event and close stream
- **LangGraph Errors**: Send error event with details, then close
- **Cancellation**: Send cancelled event and clean up resources
- **Timeout**: Send error event after configurable timeout (30s)

### Frontend Error Recovery
- **Connection Lost**: Show reconnection UI, attempt to restore state
- **Stream Error**: Display error message, keep partial response
- **Cancellation**: Mark message as cancelled, preserve content
- **Network Issues**: Graceful degradation with retry options

---

## Performance Considerations

### Concurrency Management
- **Target**: <10 concurrent streaming connections
- **Resource Limits**: Monitor memory usage per active stream
- **Connection Cleanup**: Automatic cleanup on client disconnect
- **Timeout Handling**: 30-second timeout for inactive streams

### Memory Optimization
- **No Buffering**: Stream directly from LangGraph to client
- **Token Batching**: Optional batching of small tokens for efficiency
- **Connection Pooling**: Reuse HTTP connections where possible
- **Garbage Collection**: Ensure proper cleanup of stream resources

---

## Monitoring and Observability

### Stream Health Metrics
```typescript
interface StreamMetrics {
  activeConnections: number;
  totalStreamsStarted: number;
  completedStreams: number;  
  cancelledStreams: number;
  erroredStreams: number;
  averageStreamDuration: number;
  averageTokensPerStream: number;
}
```

### Logging Strategy
- **Stream Lifecycle**: Start, progress, completion, errors
- **Performance Metrics**: Duration, token count, step timing
- **Error Tracking**: Detailed error context and stack traces
- **User Actions**: Cancellation, network disconnects

---

## Migration Strategy

### Backward Compatibility
- **Existing `/chat` endpoint**: Unchanged, continues to work
- **Other API clients**: No impact, can continue using `/chat`
- **Chatbot UI**: Migrates to `/chat/stream` by default
- **Rollback Plan**: UI can easily revert to `/chat` if needed

### Deployment Phases
1. **Phase 1**: Deploy streaming backend without UI changes
2. **Phase 2**: Deploy UI changes with feature flag
3. **Phase 3**: Enable streaming by default
4. **Phase 4**: Monitor and optimize based on usage

---

## Success Criteria

### Functional Requirements ✅
- [ ] `/chat/stream` endpoint returns valid SSE events
- [ ] Real-time progress updates during document retrieval/ranking  
- [ ] Token-level streaming during response generation
- [ ] User can cancel mid-stream and keep partial response
- [ ] Thread management identical to `/chat` endpoint
- [ ] Existing `/chat` endpoint remains unchanged

### Performance Requirements ✅
- [ ] Handle 10 concurrent streaming connections
- [ ] Stream latency <100ms for token events
- [ ] Memory usage within acceptable limits
- [ ] Proper connection cleanup on disconnect

### User Experience Requirements ✅
- [ ] Clear progress indicators for each workflow phase
- [ ] Responsive text streaming during generation
- [ ] Intuitive "Stop Generating" button placement
- [ ] Graceful error handling with user feedback
- [ ] Accessibility compliance for streaming UI elements

### Testing Coverage ✅
- [ ] >90% test coverage for streaming components
- [ ] Integration tests for complete streaming workflow
- [ ] Load testing for concurrent streaming sessions
- [ ] Error scenario testing (network, cancellation, timeouts)

---

## Timeline Estimate

### Sprint 1 (Week 1-2): Backend Implementation ✅ **IN PROGRESS**
- ✅ **Streaming chat service enhancement** - `processMessageStream()` method added with hybrid approach
- ✅ **SSE endpoint implementation** - `POST /chat/stream` endpoint with TypeBox validation
- ✅ **TypeBox schema updates** - Complete streaming event schemas added
- ✅ **Stream monitoring infrastructure** - StreamMonitor class with comprehensive metrics
- ✅ **Basic integration testing** - Unit tests for StreamMonitor and streaming logic

### Sprint 2 (Week 3-4): Frontend Implementation  
- API integration for EventSource
- Chat hook streaming enhancement
- UI component updates
- Streaming indicator component
- Frontend unit testing

### Sprint 3 (Week 5): Testing & Polish
- Comprehensive test suite
- End-to-end testing
- Performance optimization
- Error handling refinement
- Documentation updates

### Sprint 4 (Week 6): Deployment & Monitoring
- Feature flag deployment
- Production monitoring setup
- User acceptance testing
- Performance tuning
- Go-live preparation

**Total Estimated Timeline**: 6 weeks

---

## Risk Mitigation

### Technical Risks
- **SSE Browser Compatibility**: All modern browsers support EventSource
- **Connection Stability**: Implement reconnection logic and graceful degradation
- **Memory Leaks**: Comprehensive testing and monitoring of stream cleanup
- **LangGraph Integration**: Existing streaming already works, minimal risk

### User Experience Risks  
- **UI Complexity**: Keep streaming UI simple and intuitive
- **Performance Impact**: Monitor and optimize based on real usage
- **Cancellation UX**: Clear visual feedback for cancelled messages
- **Error States**: Comprehensive error handling with user-friendly messages

### Rollback Plan
- **Backend Rollback**: Keep existing `/chat` endpoint unchanged
- **UI Rollback**: Feature flag to disable streaming and use `/chat`
- **Data Rollback**: Thread management unchanged, no data migration needed
- **Monitoring**: Real-time alerts for streaming errors or performance issues

---

## Future Enhancements

### Phase 2 Features (Future)
- **WebSocket Support**: For bidirectional communication needs  
- **Stream Resumption**: Resume interrupted streams
- **Advanced Cancellation**: Cancel specific workflow steps
- **Stream Analytics**: Detailed user interaction analytics
- **Mobile Optimization**: Enhanced mobile streaming experience

### Performance Improvements (Future)
- **Token Compression**: Optimize token event payloads
- **Connection Pooling**: Advanced connection management
- **Edge Caching**: Cache common responses at edge locations
- **Load Balancing**: Distribute streaming load across instances

---

This comprehensive plan provides a roadmap for implementing streaming chat functionality while maintaining system stability, user experience, and technical excellence. The phased approach ensures manageable implementation and testing cycles with clear success criteria and risk mitigation strategies.
