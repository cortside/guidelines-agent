import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { FastifyReply } from "fastify";
import { streamMonitor } from "../infrastructure/streamMonitor.ts";
import { VectorStore } from "@langchain/core/vectorstores";
import { ChatOpenAI } from "@langchain/openai";
import { WorkflowService } from "./workflowService.ts";
import { PromptService } from "./promptService.ts";
import { DocumentService } from "./documentService.ts";
import { createVectorStore } from "../infrastructure/vectorStore.ts";
import { createChatLLM } from "../infrastructure/llm.ts";
import { config } from "../config/index.ts";
import { ThreadManagementService } from "./threadManagementService.ts";

export class ChatService {
  private vectorStore: VectorStore | null = null;
  private llm: ChatOpenAI | null = null;
  private graph: any | null = null;
  private documentService: DocumentService | null = null;
  private threadManagementService!: ThreadManagementService;

  async initialize(): Promise<void> {
    console.log("Initializing ChatService...");

    // Initialize thread management service
    this.threadManagementService = new ThreadManagementService();

    // Initialize LLM
    this.llm = createChatLLM();

    // Initialize vector store
    this.vectorStore = await createVectorStore();

    // Initialize document service
    this.documentService = new DocumentService();

    // Load documents if vector store is empty or force reload is enabled
    await this.initializeDocuments();

    // Create workflow graph
    const promptTemplate = PromptService.ragPromptTemplate;
    this.graph = WorkflowService.create(
      this.vectorStore,
      this.llm,
      promptTemplate
    );

    // Validate thread metadata against actual agent data
    await this.threadManagementService.initializeWithValidation(this);

    console.log("ChatService initialization complete.");
  }

  private async initializeDocuments(): Promise<void> {
    if (!this.vectorStore || !this.documentService) {
      throw new Error("Vector store or document service not initialized");
    }

    try {
      // Try to perform a simple similarity search to check if collection has documents
      const testSearch = await this.vectorStore.similaritySearch("rest", 1);

      if (testSearch.length === 0 || config.documents.forceReload) {
        console.log(
          "No documents in vector store or force reload enabled, loading from URLs..."
        );

        const splits = await this.documentService.splitDocumentsFromUrls();
        console.log(
          `Document tags identified: ${this.documentService.tags.length}`
        );

        // Index chunks
        await this.vectorStore.addDocuments(splits);
        console.log(`Indexed ${splits.length} document chunks.`);
      } else {
        // Load metadata tags from existing documents
        console.log("Documents exist in vector store, extracting tags...");
        const existingDocs = await this.vectorStore.similaritySearch("", 100);
        const allTags = new Set<string>();

        existingDocs.forEach((doc) => {
          if (doc.metadata?.tags && Array.isArray(doc.metadata.tags)) {
            doc.metadata.tags.forEach((tag: string) => allTags.add(tag));
          }
        });

        this.documentService.setTags(Array.from(allTags));

        console.log(
          `Document tags identified: ${this.documentService.allTags.length}`
        );
        console.log(
          `Found ${testSearch.length} existing documents in vector store`
        );
      }
    } catch (error) {
      // If collection doesn't exist or is empty, load documents
      console.log(
        "Vector store collection doesn't exist or is empty, loading from URLs..."
      );
      console.log(
        `Error details: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      const splits = await this.documentService.splitDocumentsFromUrls();
      console.log(
        `Document tags identified: ${this.documentService.tags.length}`
      );

      // Index chunks
      await this.vectorStore.addDocuments(splits);
      console.log(`Indexed ${splits.length} document chunks.`);
    }
  }

  async processMessage(threadId: string, content: string): Promise<string> {
    if (!this.graph || !this.documentService) {
      throw new Error("ChatService not initialized. Call initialize() first.");
    }

    try {
      const messageStartTime = new Date(); // Track when message processing starts

      // Specify an ID for the thread
      const threadConfig = {
        configurable: { thread_id: threadId },
        streamMode: "values" as const,
      };

      let inputs: { messages: BaseMessage[] } = { messages: [] };

      // Check if the thread exists by inspecting the graph's state history
      const history = await this.graph.getStateHistory(threadConfig).next();
      const isNewThread = history.done || !history.value;

      if (!isNewThread) {
        // thread already exists
      } else {
        console.log(`Creating new thread with ID: ${threadId}`);
        const systemMessage = PromptService.createSystemMessage(
          this.documentService.tags
        );
        inputs.messages.push(new SystemMessage(systemMessage));
      }

      // Create or update thread metadata (but don't set final activity time yet)
      this.threadManagementService.updateThreadMetadata(
        threadId,
        content,
        isNewThread,
        messageStartTime
      );

      inputs.messages.push(new HumanMessage(content));

      let lastMessage: BaseMessage | undefined;
      for await (const step of await this.graph.stream(inputs, threadConfig)) {
        lastMessage = step.messages[step.messages.length - 1];
      }

      // Update the actual activity time after message processing is complete
      const messageCompletedTime = new Date();
      this.threadManagementService.updateThreadActivity(
        threadId,
        messageCompletedTime
      );

      if (lastMessage) {
        return typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
      }

      return "No response from AI.";
    } catch (error) {
      console.error("Error processing message:", error);
      throw error;
    }
  }

  async getThreadHistory(threadId: string): Promise<any[]> {
    if (!this.graph) {
      throw new Error("ChatService not initialized. Call initialize() first.");
    }

    try {
      const threadConfig = {
        configurable: { thread_id: threadId },
        streamMode: "values" as const,
      };

      const history = await this.graph.getStateHistory(threadConfig).next();
      if (history.done || !history.value) {
        return [];
      }

      // Extract messages from history.value.values.messages
      let allMessages: any[] = [];
      if (
        history.value?.values?.messages &&
        Array.isArray(history.value.values.messages)
      ) {
        allMessages = history.value.values.messages;
      }

      return allMessages.map((msg) => {
        let type = msg.getType();
        let content = msg.content || "";

        // If content is empty and there are tool calls, format them
        if (
          content === "" &&
          Array.isArray(msg.tool_calls) &&
          msg.tool_calls.length > 0
        ) {
          content = msg.tool_calls
            .map((tc: { args: any; name: any }) => {
              const args =
                typeof tc.args === "object" ? JSON.stringify(tc.args) : tc.args;
              return `${tc.name}: ${args}`;
            })
            .join("\n");
        }

        return { id: msg.id, type, content };
      });
    } catch (error) {
      console.error("Error getting thread history:", error);
      throw error;
    }
  }

  /**
   * Get the thread management service for external use
   */
  getThreadManagementService(): ThreadManagementService {
    if (!this.threadManagementService) {
      throw new Error("ChatService not initialized. Call initialize() first.");
    }
    return this.threadManagementService;
  }

  /**
   * Get all existing thread IDs from the LangGraph agent
   * This method attempts to discover all threads by checking the agent's state store
   */
  async discoverExistingThreads(): Promise<string[]> {
    if (!this.graph) {
      console.log("ChatService: Graph not initialized, no threads to discover");
      return [];
    }

    // Note: LangGraph doesn't provide a direct method to list all threads
    // This is a limitation of the current LangGraph API
    // For now, we'll return an empty array and rely on the thread metadata file
    // In a production system, you might need to:
    // 1. Store thread IDs in a separate database
    // 2. Use a different state store that supports listing keys
    // 3. Implement a custom tracking mechanism

    console.log(
      "ChatService: Thread discovery not supported by LangGraph, using existing metadata"
    );
    return [];
  }

  /**
   * Process a message with streaming response using Server-Sent Events (SSE)
   * Implements hybrid streaming: workflow progress + token streaming
   */
  async processMessageStream(
    content: string,
    threadId: string,
    reply: FastifyReply,
    systemMessage?: string
  ): Promise<void> {
    if (!this.graph) {
      throw new Error("ChatService not initialized");
    }

    // Register stream with monitor
    const streamId = `stream_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    streamMonitor.startStream(streamId, threadId);

    try {
      // Set up SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Helper function to write SSE events
      const writeEvent = (event: string, data: any) => {
        const eventData = JSON.stringify(data);
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${eventData}\n\n`);
        streamMonitor.incrementTokenCount(streamId, 1);
      };

      // Send initial event
      writeEvent("start", {
        message: "Stream started",
        threadId,
        timestamp: new Date().toISOString(),
      });

      // Prepare input messages
      let inputs: { messages: BaseMessage[] } = { messages: [] };

      // Add system message if provided
      if (systemMessage) {
        inputs.messages.push(new SystemMessage(systemMessage));
      }

      // Add user message
      inputs.messages.push(new HumanMessage(content));

      let lastMessage: BaseMessage | undefined;
      let currentStep = "";
      let accumulatedContent = "";
      let stepCount = 0;
      let hasSeenToolCalls = false;

      // Send initial workflow step
      writeEvent("step", {
        step: "Processing your request...",
        timestamp: new Date().toISOString(),
      });

      // Stream the workflow execution
      const stream = await this.graph.stream(inputs, {
        configurable: { thread_id: threadId },
        streamMode: "values",
      });

      console.log("LangGraph stream created, starting iteration..."); // Debug logging

      // Add timeout to prevent hanging - increased to 30 seconds for document processing
      let streamCompleted = false;
      const streamTimeout = setTimeout(() => {
        if (!streamCompleted) {
          console.log(
            "Stream timeout reached after 30 seconds - this indicates a problem with LangGraph execution"
          );
          writeEvent("error", {
            error: "Request timeout - please try again",
            timestamp: new Date().toISOString(),
          });
          streamCompleted = true;
        }
      }, 30000);

      let chunkCount = 0;
      try {
        for await (const chunk of stream) {
          chunkCount++;
          console.log(`Processing chunk ${chunkCount}`); // Debug logging

          // Detect workflow step changes
          const currentMessages = chunk.messages || [];
          console.log("Current messages count:", currentMessages.length); // Debug logging

          if (currentMessages.length > 0) {
            const latestMessage = currentMessages[currentMessages.length - 1];

            if (latestMessage !== lastMessage) {
              // New message or message update
              stepCount++;
              
              // Check for tool calls to indicate search phase
              if (latestMessage.tool_calls && latestMessage.tool_calls.length > 0 && !hasSeenToolCalls) {
                hasSeenToolCalls = true;
                writeEvent("step", {
                  step: "Searching for relevant information...",
                  timestamp: new Date().toISOString(),
                });
                console.log("Tool calls detected, sending search step"); // Debug logging
              }
              
              if (latestMessage.content) {
                const messageContent =
                  typeof latestMessage.content === "string"
                    ? latestMessage.content
                    : JSON.stringify(latestMessage.content);

                console.log("Message content:", messageContent); // Debug logging
                console.log("Message type:", latestMessage._getType()); // Debug logging

                // Check message type and content to determine how to handle it
                if (latestMessage._getType() === "ai" && messageContent) {
                  // Send retrieval complete step when we start getting AI content
                  if (hasSeenToolCalls && accumulatedContent.length === 0) {
                    writeEvent("step", {
                      step: "Information retrieved, generating response...",
                      timestamp: new Date().toISOString(),
                    });
                    console.log("AI content starting, sending generation step"); // Debug logging
                  }
                  
                  // This is AI response content - send incremental updates
                  console.log(
                    "AI message detected, accumulated:",
                    accumulatedContent.length,
                    "new:",
                    messageContent.length
                  ); // Debug logging

                  // Check if this is new content (different from accumulated)
                  if (
                    messageContent !== accumulatedContent &&
                    messageContent.length > 0
                  ) {
                    const newContent = messageContent.slice(
                      accumulatedContent.length
                    );
                    if (newContent && newContent.trim().length > 0) {
                      console.log(
                        "Sending new content:",
                        newContent.substring(0, 50) + "..."
                      ); // Debug logging (truncated)

                      // Send the new content in chunks for streaming effect
                      const chunks = this.splitIntoChunks(newContent, 10);
                      for (const chunk of chunks) {
                        writeEvent("token", {
                          content: chunk,
                          timestamp: new Date().toISOString(),
                        });
                        // Small delay between chunks for visual effect
                        await new Promise((resolve) => setTimeout(resolve, 30));
                      }
                      accumulatedContent = messageContent;
                    }
                  }

                  // If we have complete content and it looks like a final response, we can prepare to complete
                  if (messageContent.length > 50) {
                    console.log(
                      "Complete AI response detected, length:",
                      messageContent.length
                    );
                  }
                } else if (latestMessage._getType() === "tool") {
                  // Tool response - indicates search completion
                  console.log("Tool message detected, content:", messageContent.substring(0, 200));
                  
                  if (messageContent.includes("Source:")) {
                    // Tool returned results
                    writeEvent("step", {
                      step: "Processing retrieved information...",
                      timestamp: new Date().toISOString(),
                    });
                    console.log("Tool results detected, sending processing step"); // Debug logging
                  }
                } else if (latestMessage._getType() !== "ai" && latestMessage._getType() !== "human") {
                  // Other message types
                  const messageType = latestMessage._getType();
                  console.log(
                    "Other message type detected:",
                    messageType,
                    "content:",
                    messageContent.substring(0, 200)
                  ); // Debug logging with more content
                } else if (latestMessage._getType() === "human") {
                  // Skip human messages - they're just the user input being processed
                  console.log("Skipping human message in stream"); // Debug logging
                } else {
                  // Handle other message types that might contain workflow information
                  const messageType = latestMessage._getType();
                  console.log(
                    "Other message type detected:",
                    messageType,
                    "content:",
                    messageContent.substring(0, 100)
                  ); // Debug logging
                  
                  // Only send as step if it's not empty and seems like a meaningful update
                  if (messageContent && messageContent.trim().length > 0) {
                    writeEvent("step", {
                      step: `Processing: ${messageType}`,
                      timestamp: new Date().toISOString(),
                    });
                  }
                }
              }
              lastMessage = latestMessage;
            }
          }
        }

        console.log("LangGraph stream iteration completed"); // Debug logging
        clearTimeout(streamTimeout);

        if (!streamCompleted) {
          streamCompleted = true;

          // If no AI content was accumulated, there might be an issue with the workflow
          if (!accumulatedContent) {
            console.log(
              "Warning: No AI response content was generated from LangGraph workflow"
            );
            writeEvent("error", {
              error:
                "No response generated - please try rephrasing your question",
              details:
                "The AI workflow completed but did not produce a response",
              timestamp: new Date().toISOString(),
            });
          } else {
            // Send completion event with the actual AI response
            writeEvent("complete", {
              message: "Stream completed successfully",
              finalContent: accumulatedContent,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error in LangGraph streaming:", error);
        clearTimeout(streamTimeout);

        if (!streamCompleted) {
          writeEvent("error", {
            error: "Workflow execution failed",
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Mark stream as completed
      streamMonitor.completeStream(streamId);
    } catch (error) {
      console.error("Streaming error:", error);

      // Send error event
      const errorData = JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      reply.raw.write(`event: error\n`);
      reply.raw.write(`data: ${errorData}\n\n`);

      streamMonitor.errorStream(
        streamId,
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      // Clean up
      reply.raw.end();
    }
  }

  /**
   * Split text into smaller chunks for streaming effect
   * @param text Text to split
   * @param maxChunkSize Maximum size of each chunk
   * @returns Array of text chunks
   */
  private splitIntoChunks(text: string, maxChunkSize: number = 10): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }
    return chunks;
  }
}
