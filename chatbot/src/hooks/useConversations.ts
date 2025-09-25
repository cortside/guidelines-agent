import { useState } from 'react';
import { Conversation } from '../types/conversation';

const DEFAULT_CONVERSATIONS: Conversation[] = [
  { id: 'default', name: 'Default' },
  { id: 'project', name: 'Project' },
  { id: 'architecture', name: 'Architecture' },
  { id: 'errors', name: 'Errors' },
];

export function useConversations() {
  // In the future, fetch from backend or local storage
  const [conversations] = useState<Conversation[]>(DEFAULT_CONVERSATIONS);
  return conversations;
}
