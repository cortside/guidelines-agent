import React, { useRef, useEffect, useState } from "react";
import { useChatApi } from "../hooks/useChatApi";
import { MessageList } from "./ChatPage/MessageList";
import { MessageInput } from "./ChatPage/MessageInput";
import { scrollToBottom } from "../utils/scrollToBottom";
import { focusElement } from "../utils/focusElement";
import { useResponsive } from "../hooks/useResponsive";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { NetworkError } from "./common/NetworkError";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { LoadingSpinner } from "./common/LoadingSpinner";

export function ChatPage({
  conversationId,
  onMessageComplete,
}: Readonly<{
  conversationId: string;
  onMessageComplete?: () => void;
}>) {
  const {
    messages,
    sendStreaming,
    cancelStreaming,
    loading,
    loadingHistory,
    error: apiError,
    streamingState,
    clearError: clearApiError,
  } = useChatApi(conversationId, onMessageComplete);
  const [input, setInput] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const prevInputRef = useRef(input);
  const { isMobile, padding } = useResponsive();
  const { error, isError, errorType, clearError, retry, handleAsyncError } =
    useErrorHandler();

  useEffect(() => {
    scrollToBottom(historyRef);
  }, [messages]);

  useEffect(() => {
    // Focus input on mount or when conversation changes, but not on mobile to avoid keyboard popping up
    if (!isMobile) {
      // Add a small delay to ensure DOM is ready after conversation switch
      setTimeout(() => {
        focusElement(textareaRef.current);
      }, 100);
    }
  }, [conversationId, isMobile]); // Focus when conversationId changes

  useEffect(() => {
    // Focus input after sending (when input transitions from non-empty to empty)
    if (prevInputRef.current && !input && !isMobile) {
      // Use setTimeout to ensure focus happens after any DOM updates
      focusElement(textareaRef.current);
    }
    prevInputRef.current = input;
  }, [input, isMobile]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || streamingState.isStreaming) return;

    clearError();
    clearApiError();

    const result = await handleAsyncError(async () => {
      await sendStreaming(trimmedInput);
    });

    if (result !== null) {
      setInput("");
      // Focus the input after a short delay, but not on mobile
      if (!isMobile) {
        focusElement(textareaRef.current);
      }
    }
  };

  const handleCancel = () => {
    cancelStreaming();
  };

  const handleRetry = async () => {
    if (prevInputRef.current) {
      await retry(() => sendStreaming(prevInputRef.current));
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${padding} bg-gradient-to-br from-blue-50 to-green-50`}
    >
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 sr-only">
          Chat Messages
        </h2>
      </header>

      <section
        ref={historyRef}
        className={`flex-1 overflow-y-auto mb-4 ${isMobile ? "p-2" : "p-4"} rounded-lg bg-white shadow-md border border-gray-200`}
        style={{
          maxHeight: isMobile ? "calc(100vh - 180px)" : "calc(100vh - 200px)",
          minHeight: "200px",
        }}
        role="log"
        aria-label="Chat conversation"
        aria-live="polite"
        aria-atomic="false"
      >
        {loadingHistory ? (
          <LoadingSpinner
            size="lg"
            message="Loading conversation history..."
            className="flex items-center justify-center h-full"
          />
        ) : (
          <>
            <MessageList messages={messages} />

            {/* Loading State */}
            {loading && (
              <LoadingSpinner
                size="md"
                message="Assistant is thinking..."
                className="my-4"
              />
            )}

            {/* Error States */}
            {(isError || apiError) && (
              <NetworkError
                error={error || apiError || new Error("Unknown error")}
                onRetry={handleRetry}
                onDismiss={clearError}
                className="my-4"
              />
            )}
          </>
        )}
      </section>

      <footer className="mt-auto">
        <MessageInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onCancel={handleCancel}
          loading={loading}
          textareaRef={textareaRef}
          streamingState={streamingState}
        />
      </footer>
    </div>
  );
}
