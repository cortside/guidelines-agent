import { useState, useEffect, useCallback, useRef } from "react";
import {
  sendMessage,
  getThread,
  sendMessageStream,
  StreamEvent,
} from "../lib/api";
import { Message, StreamingState } from "../types/message";
import { isBlank } from "../utils/isBlank";
import { parseChatResponse } from "../utils/parseChatResponse";
import { getErrorMessage } from "../utils/getErrorMessage";

export function useChatApi(
  conversationId: string,
  onMessageComplete?: () => void,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentStep: "",
    accumulatedContent: "",
    error: undefined,
    messageId: undefined,
  });
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load thread history when conversationId changes
  const loadThreadHistory = useCallback(async (threadId: string) => {
    if (!threadId) return;

    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log("useChatApi: History load already in progress, skipping");
      return;
    }

    loadingRef.current = true;
    setLoadingHistory(true);
    setError(null);

    console.log("useChatApi: Loading thread history for:", threadId);

    try {
      const threadData = await getThread(threadId);

      // Convert thread messages to our Message format
      const threadMessages: Message[] = threadData.messages
        // Filter out system messages and tool calls that are not part of the user conversation
        .filter((msg) => {
          // Keep all user messages
          if (msg.role === "user") return true;

          if (msg.role === "assistant") {
            // Filter out system instructions
            if (
              msg.content.includes(
                "You are an assistant for question-answering tasks",
              ) ||
              msg.content.includes(
                "Use the provided context to answer user questions",
              ) ||
              msg.content.startsWith("You are ")
            ) {
              return false;
            }

            // Filter out tool calls (retrieve tool invocations)
            if (
              msg.content.startsWith("retrieve: {") ||
              /^[a-zA-Z_]+:\s*\{/.test(msg.content)
            ) {
              return false;
            }

            // Filter out raw tool responses (source documents)
            if (
              msg.content.startsWith("Source: ") &&
              msg.content.includes("Tags: ") &&
              msg.content.includes("Content: ")
            ) {
              return false;
            }

            // Keep actual assistant responses to users
            return true;
          }

          return false;
        })
        // Sort by timestamp to ensure correct chronological order
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )
        .map((msg) => ({
          id: msg.id || Date.now().toString() + Math.random().toString(36),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
        }));

      setMessages(threadMessages);
    } catch (error) {
      // If thread doesn't exist or error loading, start with empty messages
      console.log("Could not load thread history, starting fresh:", error);
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

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    try {
      const res = await sendMessage(conversationId, input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: parseChatResponse(res),
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, assistantMessage]);

      // Notify parent component that a message exchange completed successfully
      if (onMessageComplete) {
        onMessageComplete();
      }
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(getErrorMessage(error));
      setError(errorInstance);

      // Still add error message to chat for user visibility
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: getErrorMessage(error),
        timestamp: new Date().toISOString(),
        error: getErrorMessage(error),
      };
      setMessages((msgs) => [...msgs, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const sendStreaming = async (input: string) => {
    if (isBlank(input)) return;

    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, userMessage]);

    // Create assistant message placeholder for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
      isComplete: false,
    };
    setMessages((msgs) => [...msgs, assistantMessage]);

    // Initialize streaming state
    setStreamingState({
      isStreaming: true,
      currentStep: "Starting...",
      accumulatedContent: "",
      messageId: assistantMessageId,
    });

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    const updateMessageStep = (step: string) => {
      setMessages((msgs) =>
        msgs.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, streamingStep: step } : msg,
        ),
      );
    };

    const updateMessageContent = (content: string) => {
      setMessages((msgs) =>
        msgs.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, content } : msg,
        ),
      );
    };

    const markMessageComplete = () => {
      setMessages((msgs) =>
        msgs.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
                isComplete: true,
                streamingStep: undefined,
              }
            : msg,
        ),
      );
    };

    const markMessageError = (errorMsg: string) => {
      setMessages((msgs) =>
        msgs.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
                error: errorMsg,
                content:
                  msg.content || "Error occurred during response generation",
              }
            : msg,
        ),
      );
    };

    try {
      await sendMessageStream(
        conversationId,
        input,
        (event: StreamEvent) => {
          switch (event.type) {
            case "start": {
              const message = event.data.message || "Stream started";
              setStreamingState((prev) => ({
                ...prev,
                currentStep: message,
              }));
              updateMessageStep(message);
              break;
            }
            case "step": {
              const step =
                event.data.step || event.data.message || "Processing...";
              setStreamingState((prev) => ({
                ...prev,
                currentStep: step,
              }));
              updateMessageStep(step);
              break;
            }
            case "token": {
              const content = event.data.content || "";
              setStreamingState((prev) => {
                const newContent = prev.accumulatedContent + content;
                // Update message content immediately with new accumulated content
                updateMessageContent(newContent);
                return {
                  ...prev,
                  accumulatedContent: newContent,
                };
              });
              break;
            }
            case "complete":
              setStreamingState((prev) => ({
                ...prev,
                isStreaming: false,
                currentStep: "Complete",
              }));
              markMessageComplete();
              onMessageComplete?.();
              break;
            case "error": {
              const errorMsg = event.data.error || "Stream error occurred";
              setStreamingState((prev) => ({
                ...prev,
                isStreaming: false,
                error: errorMsg,
              }));
              markMessageError(errorMsg);
              setError(new Error(errorMsg));
              break;
            }
          }
        },
        abortControllerRef.current.signal,
      );
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(getErrorMessage(error));
      setError(errorInstance);

      setStreamingState((prev) => ({
        ...prev,
        isStreaming: false,
        error: errorInstance.message,
      }));

      markMessageError(errorInstance.message);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      setStreamingState((prev) => ({
        ...prev,
        isStreaming: false,
        currentStep: "Cancelled",
      }));
    }
  };

  const clearError = () => setError(null);

  return {
    messages,
    send,
    sendStreaming,
    cancelStreaming,
    loading,
    loadingHistory,
    error,
    streamingState,
    clearError,
    refreshHistory: () => loadThreadHistory(conversationId),
  };
}
