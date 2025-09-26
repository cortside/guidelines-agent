import { useState, useEffect, useCallback } from 'react';
import { sendMessage, getThread } from '../lib/api';
import { Message } from '../types/message';
import { isBlank } from '../utils/isBlank';
import { parseChatResponse } from '../utils/parseChatResponse';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useChatApi(conversationId: string, onMessageComplete?: () => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load thread history when conversationId changes
  const loadThreadHistory = useCallback(async (threadId: string) => {
    if (!threadId) return;
    
    setLoadingHistory(true);
    setError(null);
    
    try {
      const threadData = await getThread(threadId);
      
      // Convert thread messages to our Message format
      const threadMessages: Message[] = threadData.messages
        .filter(msg => msg.type === 'human' || msg.type === 'ai')
        .map(msg => ({
          role: msg.type === 'human' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));
      
      setMessages(threadMessages);
    } catch (error) {
      // If thread doesn't exist or error loading, start with empty messages
      console.log('Could not load thread history, starting fresh:', error);
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load history when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      loadThreadHistory(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId, loadThreadHistory]);

  const send = async (input: string) => {
    if (isBlank(input)) return;
    
    setError(null); // Clear previous errors
    setMessages((msgs) => [...msgs, { role: 'user', content: input }]);
    setLoading(true);
    
    try {
      const res = await sendMessage(conversationId, input);
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: parseChatResponse(res) }
      ]);
      
      // Notify parent component that a message exchange completed successfully
      if (onMessageComplete) {
        onMessageComplete();
      }
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(getErrorMessage(error));
      setError(errorInstance);
      
      // Still add error message to chat for user visibility
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: getErrorMessage(error) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { 
    messages, 
    send, 
    loading, 
    loadingHistory, 
    error, 
    clearError,
    refreshHistory: () => loadThreadHistory(conversationId)
  };
}
