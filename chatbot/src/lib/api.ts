import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8002";

export interface ThreadSummary {
  threadId: string;
  name?: string;
  createdAt: string; // ISO date string from API
  updatedAt: string; // ISO date string from API
  messageCount: number;
  metadata?: Record<string, any>;
}

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ThreadResponse {
  threadId: string;
  messages: ThreadMessage[];
  totalMessages: number;
}

export async function sendMessage(threadId: string, message: string) {
  const res = await axios.post(`${API_URL}/chat`, { threadId, message });
  return res.data;
}

export async function getAllThreads(): Promise<ThreadSummary[]> {
  const res = await axios.get(`${API_URL}/threads`);
  return res.data.threads;
}

export async function getThread(threadId: string): Promise<ThreadResponse> {
  const res = await axios.get(`${API_URL}/threads/${threadId}`);
  return res.data;
}

export async function createNewThread(
  name?: string,
): Promise<{ threadId: string }> {
  console.log("API: Creating new thread with name:", name);
  console.trace("API: createNewThread called from:");
  const res = await axios.post(`${API_URL}/threads`, name ? { name } : {});
  console.log("API: Thread created successfully:", res.data);
  return res.data;
}

export async function updateThreadName(
  threadId: string,
  name: string,
): Promise<void> {
  await axios.patch(`${API_URL}/threads/${threadId}`, { name });
}

export async function deleteThread(threadId: string): Promise<void> {
  await axios.delete(`${API_URL}/threads/${threadId}`);
}

// Streaming API Support
export interface StreamEvent {
  type: "start" | "step" | "token" | "complete" | "error" | "cancelled";
  data: any;
  timestamp: string;
}

export async function sendMessageStream(
  threadId: string,
  message: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use fetch with SSE for POST requests (EventSource doesn't support POST)
    fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ threadId, message }),
      signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        await processStreamResponse(response.body, onEvent, resolve, reject);
      })
      .catch((error) => {
        handleStreamError(error, onEvent, reject);
      });
  });
}

// Helper function to process stream response
async function processStreamResponse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
  resolve: () => void,
  reject: (error: Error) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; // Buffer for incomplete chunks

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          processSSEChunk(buffer, onEvent, resolve, reject);
        }
        resolve();
        break;
      }

      // Decode and append to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete events (events end with double newline)
      const events = buffer.split("\n\n");
      // Keep the last incomplete event in buffer
      buffer = events.pop() || "";

      // Process complete events
      for (const event of events) {
        if (event.trim()) {
          processSSEChunk(event + "\n\n", onEvent, resolve, reject);
        }
      }
    }
  } catch (error) {
    reader.releaseLock();
    reject(error instanceof Error ? error : new Error(String(error)));
  }
}

// Helper function to process SSE chunks
function processSSEChunk(
  chunk: string,
  onEvent: (event: StreamEvent) => void,
  resolve: () => void,
  reject: (error: Error) => void,
): void {
  const lines = chunk.split("\n");
  let currentEventType = "message";

  console.log("Processing SSE chunk:", chunk); // Debug logging

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("event: ")) {
      currentEventType = trimmedLine.slice(7).trim();
      console.log("Event type:", currentEventType); // Debug logging
    } else if (trimmedLine.startsWith("data: ")) {
      try {
        const dataStr = trimmedLine.slice(6).trim();
        console.log("Event data:", dataStr); // Debug logging
        const eventData = JSON.parse(dataStr);
        const event: StreamEvent = {
          type: currentEventType as StreamEvent["type"],
          data: eventData,
          timestamp: eventData.timestamp || new Date().toISOString(),
        };

        console.log("Emitting event:", event); // Debug logging
        onEvent(event);

        // Handle stream completion
        if (event.type === "complete") {
          console.log("Stream completed"); // Debug logging
          resolve();
          return;
        }

        // Handle stream errors
        if (event.type === "error") {
          console.log("Stream error:", eventData.error); // Debug logging
          reject(new Error(eventData.error || "Stream error occurred"));
          return;
        }
      } catch (parseError) {
        console.warn("Failed to parse SSE data:", trimmedLine, parseError);
      }
    }
  }
}

// Helper function to handle stream errors
function handleStreamError(
  error: unknown,
  onEvent: (event: StreamEvent) => void,
  reject: (error: Error) => void,
): void {
  if (error instanceof Error && error.name === "AbortError") {
    // Handle cancellation gracefully
    onEvent({
      type: "cancelled",
      data: { message: "Stream cancelled by user" },
      timestamp: new Date().toISOString(),
    });
  }
  reject(error instanceof Error ? error : new Error(String(error)));
}
