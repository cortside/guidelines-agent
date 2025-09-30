import React, { useCallback, useEffect } from "react";
import { focusElementNextTick } from "../../utils/focusElement";
import { useResponsive } from "../../hooks/useResponsive";

import { StreamingState } from "../../types/message";

export function MessageInput({
  input,
  setInput,
  onSend,
  onCancel,
  loading,
  textareaRef,
  streamingState,
}: Readonly<{
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  streamingState?: StreamingState;
}>) {
  const { isMobile } = useResponsive();

  // Focus the input when loading stops (after message is sent and response received)
  useEffect(() => {
    if (!loading && input === "" && !isMobile) {
      focusElementNextTick(textareaRef.current);
    }
  }, [loading, input, textareaRef, isMobile]);

  // Use a callback ref to always get the latest DOM node
  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (textareaRef) {
        textareaRef.current = node;
      }
      // Focus when node is attached and input is empty, but not on mobile
      if (node && input === "" && !isMobile) {
        // Use setTimeout to ensure focus happens after any pending DOM updates
        focusElementNextTick(node);
      }
    },
    [textareaRef, input, isMobile],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
      // Focus will be handled by the parent component after state updates
    }
  };

  const handleSendClick = () => {
    onSend();
  };

  return (
    <div
      className={`flex gap-3 items-end p-3 bg-white rounded-lg shadow-md border border-gray-200 ${isMobile ? "gap-2 p-2" : ""}`}
    >
      <div className="flex-1">
        <label htmlFor="message-input" className="sr-only">
          Type your message
        </label>
        <textarea
          id="message-input"
          ref={setTextareaRef}
          className={`w-full border-2 border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900 placeholder-gray-500 ${
            isMobile ? "px-3 py-2 text-16" : "" // Prevent zoom on iOS
          }`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          disabled={loading}
          rows={isMobile ? 1 : 2}
          aria-describedby="message-input-help"
          aria-invalid={false}
          style={isMobile ? { fontSize: "16px" } : undefined} // Prevent iOS zoom
        />
        <div id="message-input-help" className="sr-only">
          Press Enter to send message, Shift+Enter for new line
        </div>
      </div>

      {/* Streaming Status */}
      {streamingState?.isStreaming && streamingState.currentStep && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-gray-500 max-w-20 truncate">
            {streamingState.currentStep}
          </div>
        </div>
      )}

      {/* Cancel button when streaming */}
      {streamingState?.isStreaming && onCancel && (
        <button
          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-md hover:shadow-lg ${
            isMobile ? "text-sm min-h-[44px]" : ""
          }`}
          onClick={onCancel}
          type="button"
          aria-label="Cancel streaming response"
        >
          Cancel
        </button>
      )}

      <button
        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isMobile ? "px-4 py-2 text-sm min-h-[44px]" : "" // Better mobile touch target
        } ${
          loading || streamingState?.isStreaming
            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-md hover:shadow-lg"
        }`}
        onClick={handleSendClick}
        disabled={loading || streamingState?.isStreaming}
        type="button"
        aria-describedby="send-button-help"
      >
        {loading || streamingState?.isStreaming ? (
          <span className="inline-flex items-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              ></circle>
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                className="opacity-75"
              ></path>
            </svg>
            {streamingState?.isStreaming ? "Streaming..." : "Sending..."}
          </span>
        ) : (
          "Send"
        )}
      </button>

      <div id="send-button-help" className="sr-only">
        Send your message to the assistant
      </div>
    </div>
  );
}
