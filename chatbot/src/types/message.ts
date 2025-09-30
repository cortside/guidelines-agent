export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // Streaming properties
  isStreaming?: boolean;
  streamingStep?: string;
  isComplete?: boolean;
  error?: string;
}

export interface StreamingState {
  isStreaming: boolean;
  currentStep: string;
  accumulatedContent: string;
  error?: string;
  messageId?: string;
}
