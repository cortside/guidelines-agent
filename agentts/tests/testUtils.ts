import { ChatService } from "../src/services/chatService.ts";

export function createMockChatService(
  overrides: Partial<ChatService> = {},
): Partial<ChatService> {
  const mockService = {
    initialize: async () => {},
    processMessage: async (
      threadId: string,
      content: string,
    ): Promise<string> => {
      return `Mock response to: ${content}`;
    },
    getThreadHistory: async (threadId: string): Promise<any[]> => {
      return [
        {
          id: "msg-1",
          role: "user",
          content: "Test message",
          timestamp: new Date().toISOString(),
        },
      ];
    },
    discoverExistingThreads: async (): Promise<string[]> => {
      return ["thread-1", "thread-2"];
    },
    ...overrides,
  };

  return mockService;
}

export function createFailingMockChatService(): Partial<ChatService> {
  return {
    initialize: async () => {},
    processMessage: async (): Promise<string> => {
      throw new Error("Service error");
    },
    getThreadHistory: async (): Promise<any[]> => {
      throw new Error("Service error");
    },
    discoverExistingThreads: async (): Promise<string[]> => {
      throw new Error("Service error");
    },
  };
}
