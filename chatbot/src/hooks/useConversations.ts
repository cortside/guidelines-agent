import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllThreads,
  createNewThread,
  deleteThread,
  updateThreadName,
} from "../lib/api";
import type { ConversationState, Conversation } from "../types/conversation";

// Global flag to prevent multiple thread creation during app initialization
let globalInitializationInProgress = false;

export function useConversations() {
  const [state, setState] = useState<ConversationState>({
    threads: [],
    currentThreadId: null,
    loading: false,
    error: null,
  });

  // Add a ref to track ongoing thread creation to prevent duplicates in React StrictMode
  const creatingThread = useRef(false);
  // Add a ref to track ongoing thread loading to prevent duplicate API calls
  const loadingThreads = useRef(false);
  // Add a ref to track if threads have been loaded initially
  const threadsLoaded = useRef(false);

  // Load threads from API
  const loadThreads = useCallback(async (forceRefresh = false) => {
    console.log("useConversations: loadThreads called", { forceRefresh });

    // Prevent multiple simultaneous loadThreads calls, but allow forced refresh
    if (loadingThreads.current) {
      console.log(
        "useConversations: loadThreads already in progress, skipping",
      );
      return;
    }

    // Skip if already loaded unless it's a forced refresh
    if (threadsLoaded.current && !forceRefresh) {
      console.log(
        "useConversations: threads already loaded and not forced refresh, skipping",
      );
      return;
    }

    loadingThreads.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const threads = await getAllThreads();
      console.log(
        "useConversations: getAllThreads returned",
        threads.length,
        "threads",
      );

      // Convert API response to local format and sort intelligently
      const conversations: Conversation[] = threads
        .map((thread) => ({
          threadId: thread.threadId,
          name: thread.name,
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt),
          messageCount: thread.messageCount,
          metadata: thread.metadata,
        }))
        .sort((a, b) => {
          // Check if all updatedAt dates are very close (within 1 minute)
          // This would indicate they're just current timestamps from server restarts
          const timeDiff = Math.abs(
            a.updatedAt.getTime() - b.updatedAt.getTime(),
          );
          if (timeDiff < 60000) {
            // Less than 1 minute difference
            // Fall back to sorting by createdAt (most recent first)
            return b.createdAt.getTime() - a.createdAt.getTime();
          } else {
            // Sort by updatedAt (most recent first)
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }
        });

      console.log(
        "useConversations: Setting state with",
        conversations.length,
        "conversations",
      );
      setState((prev) => ({
        ...prev,
        threads: conversations,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load conversations",
      }));
    } finally {
      // Reset the loading lock and mark as loaded
      loadingThreads.current = false;
      threadsLoaded.current = true;
    }
  }, []);

  // Create new thread
  const createThread = useCallback(
    async (name?: string): Promise<string | null> => {
      console.log("useConversations: createThread called with name:", name);

      // Global protection against multiple thread creation during app initialization
      if (globalInitializationInProgress) {
        console.log(
          "useConversations: Global initialization in progress, skipping thread creation",
        );
        return null;
      }

      // Prevent duplicate thread creation during React StrictMode double-rendering
      if (creatingThread.current) {
        console.log(
          "useConversations: Thread creation already in progress, skipping",
        );
        return null;
      }

      console.trace("useConversations: createThread called from:");

      // Set both local and global flags
      creatingThread.current = true;
      globalInitializationInProgress = true;
      setState((prev) => ({ ...prev, error: null }));

      try {
        const result = await createNewThread(name);
        console.log(
          "useConversations: Thread created with ID:",
          result.threadId,
        );
        // Don't reload all threads, just add the new thread to the list
        const newThread = {
          threadId: result.threadId,
          name: name || "New Conversation",
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
          metadata: undefined,
        };

        setState((prev) => ({
          ...prev,
          threads: [newThread, ...prev.threads], // Add to beginning of list
        }));

        return result.threadId;
      } catch (error) {
        console.error("useConversations: Error creating thread:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create conversation",
        }));
        return null;
      } finally {
        // Reset the creation lock after a longer delay to prevent React StrictMode issues
        setTimeout(() => {
          creatingThread.current = false;
          globalInitializationInProgress = false;
        }, 1000); // Keep 1000ms delay
      }
    },
    [],
  ); // No dependencies to break the cycle

  // Delete thread
  const removeThread = useCallback(
    async (threadId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        await deleteThread(threadId);
        // Remove thread from local state instead of reloading all
        setState((prev) => ({
          ...prev,
          threads: prev.threads.filter(
            (thread) => thread.threadId !== threadId,
          ),
          // Clear currentThreadId if it was the deleted thread
          currentThreadId:
            prev.currentThreadId === threadId ? null : prev.currentThreadId,
        }));

        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete conversation",
        }));
        return false;
      }
    },
    [],
  ); // No dependencies

  // Rename thread
  const renameThread = useCallback(
    async (threadId: string, newName: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        await updateThreadName(threadId, newName);
        // Update thread name in local state instead of reloading all
        setState((prev) => ({
          ...prev,
          threads: prev.threads.map((thread) =>
            thread.threadId === threadId
              ? { ...thread, name: newName }
              : thread,
          ),
        }));

        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to rename conversation",
        }));
        return false;
      }
    },
    [],
  ); // No dependencies

  // Set current thread
  const setCurrentThread = useCallback((threadId: string | null) => {
    setState((prev) => ({ ...prev, currentThreadId: threadId }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, []); // Empty dependency array to only run once

  return {
    threads: state.threads,
    currentThreadId: state.currentThreadId,
    loading: state.loading,
    error: state.error,
    threadsLoaded: threadsLoaded.current, // Expose whether initial load is complete
    loadThreads,
    createThread,
    removeThread,
    renameThread,
    setCurrentThread,
    clearError,
  };
}
