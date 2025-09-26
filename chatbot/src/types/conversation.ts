export interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  lastActivity: Date;
  messageCount: number;
  createdAt: Date;
}

export interface ConversationState {
  threads: Conversation[];
  currentThreadId: string | null;
  loading: boolean;
  error: string | null;
}
