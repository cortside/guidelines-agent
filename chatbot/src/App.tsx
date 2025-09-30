import React, { useState, useEffect, useRef } from "react";
import { ChatPage } from "./components/ChatPage";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { useConversations } from "./hooks/useConversations";
import { useResponsive } from "./hooks/useResponsive";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import "./App.css";

export default function App() {
  const {
    threads,
    currentThreadId,
    setCurrentThread,
    createThread,
    removeThread,
    loading,
    error,
    threadsLoaded,
    loadThreads,
    clearError,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const initializationAttempted = useRef(false);
  const { isMobile, sidebarWidth, padding } = useResponsive();

  // Don't reset initialization flag - this was causing duplicate threads
  // The initialization should only happen once per app mount

  // Handle thread creation from sidebar
  const handleCreateThread = async (): Promise<void> => {
    const threadId = await createThread();
    if (threadId) {
      setCurrentThread(threadId);
      if (isMobile) setSidebarOpen(false);
    }
  };

  // Handle thread deletion from sidebar
  const handleDeleteThread = async (threadId: string): Promise<void> => {
    await removeThread(threadId);
    // If deleted thread was current, select the first available thread
    if (currentThreadId === threadId && threads.length > 1) {
      const remainingThreads = threads.filter((t) => t.threadId !== threadId);
      if (remainingThreads.length > 0) {
        setCurrentThread(remainingThreads[0].threadId);
      }
    }
  };

  // Handle message completion - refresh threads to update lastMessage
  const handleMessageComplete = async (): Promise<void> => {
    console.log("[App] Message exchange completed - refreshing threads list");
    await loadThreads(true); // Force refresh to update lastMessage
  };

  // Initialize with first thread if available, or create one if none exist
  useEffect(() => {
    const initializeThread = async () => {
      const currentTime = new Date().toISOString();
      console.log(`[${currentTime}] Checking for thread initialization...`, {
        loading,
        threadsLength: threads.length,
        currentThreadId,
        attempted: initializationAttempted.current,
        threadsLoaded,
        threadIds: threads.map((t) => t.threadId),
      });

      // Don't run initialization multiple times - this is the key protection
      if (initializationAttempted.current) {
        console.log(
          `[${currentTime}] Skipping initialization: already attempted`
        );
        setInitializing(false);
        return;
      }

      // Don't initialize until threads have been loaded from the server
      if (!threadsLoaded) {
        console.log(
          `[${currentTime}] Skipping initialization: threads not loaded yet`
        );
        return;
      }

      // Don't initialize if we already have a current thread selected
      if (currentThreadId) {
        console.log(
          `[${currentTime}] Thread already selected:`,
          currentThreadId
        );
        setInitializing(false);
        initializationAttempted.current = true;
        return;
      }

      // Mark as attempted BEFORE doing anything else - this prevents duplicates
      initializationAttempted.current = true;

      if (threads.length > 0) {
        // Select the most recent thread (first in the sorted list)
        console.log(
          `[${currentTime}] Found ${threads.length} existing threads - selecting most recent:`,
          threads[0].threadId
        );
        setCurrentThread(threads[0].threadId);
        setInitializing(false);
      } else {
        // Only create a new thread if no threads exist after loading is complete
        console.log(
          `[${currentTime}] No existing threads found after loading - creating initial thread`
        );
        try {
          const threadId = await createThread();
          console.log(`[${currentTime}] Created initial thread:`, threadId);
          if (threadId) {
            setCurrentThread(threadId);
          }
        } catch (error) {
          console.error(
            `[${currentTime}] Failed to create initial thread:`,
            error
          );
          // Don't reset attempted flag on error to prevent endless retries
        }
        setInitializing(false);
      }
    };

    initializeThread();
  }, [threadsLoaded, threads.length, currentThreadId]); // Depend on threadsLoaded instead of loading

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleConversationSelect = (id: string) => {
    setCurrentThread(id);
    if (isMobile) setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Calculate sidebar classes
  const getSidebarClasses = () => {
    if (isMobile) {
      const mobileClasses = sidebarOpen ? "translate-x-0" : "-translate-x-full";
      return `fixed top-0 left-0 h-full z-40 transform ${mobileClasses} w-64 bg-white shadow-lg`;
    }
    return "relative";
  };

  return (
    <ErrorBoundary>
      <div className={`flex h-screen bg-gray-50 ${padding}`}>
        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Toggle conversation menu"
            aria-expanded={sidebarOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        <nav
          role="navigation"
          aria-label="Conversation navigation"
          className={`${sidebarWidth} transition-all duration-300 ease-in-out ${getSidebarClasses()}`}
        >
          <Sidebar
            selected={currentThreadId || ""}
            onSelect={handleConversationSelect}
            onClose={isMobile ? () => setSidebarOpen(false) : undefined}
            threads={threads}
            loading={loading}
            error={error}
            onCreateThread={handleCreateThread}
            onDeleteThread={handleDeleteThread}
            onClearError={clearError}
          />
        </nav>

        {/* Overlay for mobile */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <main
          role="main"
          className={`flex-1 overflow-hidden ${isMobile ? "ml-0" : ""}`}
          aria-label="Chat interface"
        >
          {currentThreadId ? (
            <ChatPage
              conversationId={currentThreadId}
              onMessageComplete={handleMessageComplete}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-center">
                {loading || initializing ? (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <div>Loading conversations...</div>
                  </div>
                ) : (
                  "No conversation selected"
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
