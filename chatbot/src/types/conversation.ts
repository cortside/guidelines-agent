export interface Conversation {
  threadId: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  metadata?: Record<string, any>;
}

export interface ConversationState {
  threads: Conversation[];
  currentThreadId: string | null;
  loading: boolean;
  error: string | null;
}
