export interface ChatRequest {
  threadId: string;
  message: string;
}

export interface ChatResponse {
  answer: string;
}

export interface ErrorResponse {
  error: string;
}

export interface HealthResponse {
  status: string;
}

export interface ThreadMessage {
  id: string;
  type: string;
  content: string;
}

export interface ThreadResponse {
  messages: ThreadMessage[];
}

export interface ApiError extends Error {
  statusCode: number;
  code?: string;
}
