import { useState, useEffect, useCallback } from 'react';
import { getAllThreads, createNewThread, deleteThread, updateThreadName } from '../lib/api';
import type { ConversationState, Conversation } from '../types/conversation';

export function useConversations() {
  const [state, setState] = useState<ConversationState>({
    threads: [],
    currentThreadId: null,
    loading: false,
    error: null,
  });

  // Load threads from API
  const loadThreads = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const threads = await getAllThreads();
      
      // Convert API response to local format
      const conversations: Conversation[] = threads.map(thread => ({
        id: thread.threadId,
        name: thread.name,
        lastMessage: thread.lastMessage,
        lastActivity: new Date(thread.lastActivity),
        messageCount: thread.messageCount,
        createdAt: new Date(thread.createdAt),
      }));

      setState(prev => ({
        ...prev,
        threads: conversations,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load conversations',
      }));
    }
  }, []);

  // Create new thread
  const createThread = useCallback(async (name?: string): Promise<string | null> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const result = await createNewThread(name);
      await loadThreads(); // Refresh the list
      return result.threadId;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create conversation',
      }));
      return null;
    }
  }, [loadThreads]);

  // Delete thread
  const removeThread = useCallback(async (threadId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      await deleteThread(threadId);
      await loadThreads(); // Refresh the list
      
      // If deleted thread was current, clear selection
      if (state.currentThreadId === threadId) {
        setState(prev => ({ ...prev, currentThreadId: null }));
      }
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      }));
      return false;
    }
  }, [loadThreads, state.currentThreadId]);

  // Rename thread
  const renameThread = useCallback(async (threadId: string, newName: string): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      await updateThreadName(threadId, newName);
      await loadThreads(); // Refresh the list
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to rename conversation',
      }));
      return false;
    }
  }, [loadThreads]);

  // Set current thread
  const setCurrentThread = useCallback((threadId: string | null) => {
    setState(prev => ({ ...prev, currentThreadId: threadId }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  return {
    threads: state.threads,
    currentThreadId: state.currentThreadId,
    loading: state.loading,
    error: state.error,
    loadThreads,
    createThread,
    removeThread,
    renameThread,
    setCurrentThread,
    clearError,
  };
}
