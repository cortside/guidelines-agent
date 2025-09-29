import { useState, useEffect, useCallback, useRef } from 'react';
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
  const loadingRef = useRef(false);

  // Load thread history when conversationId changes
  const loadThreadHistory = useCallback(async (threadId: string) => {
    if (!threadId) return;
    
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('useChatApi: History load already in progress, skipping');
      return;
    }
    
    loadingRef.current = true;
    setLoadingHistory(true);
    setError(null);
    
    console.log('useChatApi: Loading thread history for:', threadId);
    
    try {
      const threadData = await getThread(threadId);
      
      // Convert thread messages to our Message format
      const threadMessages: Message[] = threadData.messages
        // Filter out system messages and tool calls that are not part of the user conversation
        .filter(msg => {
          // Keep all user messages
          if (msg.role === 'user') return true;
          
          if (msg.role === 'assistant') {
            // Filter out system instructions
            if (msg.content.includes('You are an assistant for question-answering tasks') ||
                msg.content.includes('Use the provided context to answer user questions') ||
                msg.content.startsWith('You are ')) {
              return false;
            }
            
            // Filter out tool calls (retrieve tool invocations)
            if (msg.content.startsWith('retrieve: {') || 
                /^[a-zA-Z_]+:\s*\{/.test(msg.content)) {
              return false;
            }
            
            // Filter out raw tool responses (source documents)
            if (msg.content.startsWith('Source: ') && 
                msg.content.includes('Tags: ') && 
                msg.content.includes('Content: ')) {
              return false;
            }
            
            // Keep actual assistant responses to users
            return true;
          }
          
          return false;
        })
        // Sort by timestamp to ensure correct chronological order
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      setMessages(threadMessages);
    } catch (error) {
      // If thread doesn't exist or error loading, start with empty messages
      console.log('Could not load thread history, starting fresh:', error);
      setMessages([]);
    } finally {
      setLoadingHistory(false);
      loadingRef.current = false;
    }
  }, []);

  // Load history when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      loadThreadHistory(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]); // Removed loadThreadHistory from dependencies to prevent double calls

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
