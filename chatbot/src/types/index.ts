import type { Message } from './message';
import type { Conversation } from './conversation';

// Re-export core types
export type { Message } from './message';
export type { Conversation } from './conversation';

// API response types
export interface ApiResponse {
  answer?: string;
  error?: string;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// Chat API hook return type  
export interface ChatApiHook {
  messages: Message[];
  send: (input: string) => Promise<void>;
  loading: boolean;
}

// Component prop types
export interface MessageListProps {
  messages: Message[];
  loading: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  index: number;
}

export interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export interface SidebarProps {
  conversations: Conversation[];
  selected: string;
  onSelect: (id: string) => void;
}

export interface ChatPageProps {
  conversationId: string;
}
