import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { FastifyReply } from "fastify";
import { streamMonitor } from "../infrastructure/streamMonitor.ts";
import { VectorStore } from "@langchain/core/vectorstores";
import { ChatOpenAI } from "@langchain/openai";
import { WorkflowService } from './workflowService.ts';
import { PromptService } from './promptService.ts';
import { DocumentService } from './documentService.ts';
import { createVectorStore } from '../infrastructure/vectorStore.ts';
import { createChatLLM } from '../infrastructure/llm.ts';
import { config } from '../config/index.ts';
import { ThreadManagementService } from './threadManagementService.ts';


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
    this.graph = WorkflowService.create(this.vectorStore, this.llm, promptTemplate);
    
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
        console.log("No documents in vector store or force reload enabled, loading from URLs...");
        
        const splits = await this.documentService.splitDocumentsFromUrls();
        console.log(`Document tags identified: ${this.documentService.tags.length}`);

        // Index chunks
        await this.vectorStore.addDocuments(splits);
        console.log(`Indexed ${splits.length} document chunks.`);
      } else {
        // Load metadata tags from existing documents
        console.log("Documents exist in vector store, extracting tags...");
        const existingDocs = await this.vectorStore.similaritySearch("", 100);
        const allTags = new Set<string>();
        
        existingDocs.forEach(doc => {
          if (doc.metadata?.tags && Array.isArray(doc.metadata.tags)) {
            doc.metadata.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        
        this.documentService.setTags(Array.from(allTags));
        
        console.log(`Document tags identified: ${this.documentService.allTags.length}`);
        console.log(`Found ${testSearch.length} existing documents in vector store`);
      }
    } catch (error) {
      // If collection doesn't exist or is empty, load documents
      console.log("Vector store collection doesn't exist or is empty, loading from URLs...");
      console.log(`Error details: ${error instanceof Error ? error.message : String(error)}`);
      
      const splits = await this.documentService.splitDocumentsFromUrls();
      console.log(`Document tags identified: ${this.documentService.tags.length}`);

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
        const systemMessage = PromptService.createSystemMessage(this.documentService.tags);
        inputs.messages.push(new SystemMessage(systemMessage));
      }

      // Create or update thread metadata (but don't set final activity time yet)
      this.threadManagementService.updateThreadMetadata(threadId, content, isNewThread, messageStartTime);

      inputs.messages.push(new HumanMessage(content));
      
      let lastMessage: BaseMessage | undefined;
      for await (const step of await this.graph.stream(inputs, threadConfig)) {
        lastMessage = step.messages[step.messages.length - 1];
      }
      
      // Update the actual activity time after message processing is complete
      const messageCompletedTime = new Date();
      this.threadManagementService.updateThreadActivity(threadId, messageCompletedTime);
      
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

    console.log("ChatService: Thread discovery not supported by LangGraph, using existing metadata");
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
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    streamMonitor.startStream(streamId, threadId);

    try {
      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Helper function to write SSE events
      const writeEvent = (event: string, data: any) => {
        const eventData = JSON.stringify(data);
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${eventData}\n\n`);
        streamMonitor.incrementTokenCount(streamId, 1);
      };

      // Send initial event
      writeEvent('start', { 
        message: 'Stream started',
        threadId,
        timestamp: new Date().toISOString()
      });

      // Send a test step event to verify streaming works
      setTimeout(() => {
        writeEvent('step', {
          step: 'Initializing workflow...',
          timestamp: new Date().toISOString()
        });
      }, 500);

      // Prepare input messages
      let inputs: { messages: BaseMessage[] } = { messages: [] };

      // Add system message if provided
      if (systemMessage) {
        inputs.messages.push(new SystemMessage(systemMessage));
      }

      // Add user message
      inputs.messages.push(new HumanMessage(content));

      let lastMessage: BaseMessage | undefined;
      let currentStep = '';
      let accumulatedContent = '';

      // Send another test step
      setTimeout(() => {
        writeEvent('step', {
          step: 'Starting LangGraph workflow...',
          timestamp: new Date().toISOString()
        });
      }, 1000);

      // Stream the workflow execution
      const stream = await this.graph.stream(inputs, {
        configurable: { thread_id: threadId },
        streamMode: "values"
      });

      console.log('LangGraph stream created, starting iteration...'); // Debug logging

      // Add timeout to prevent hanging
      let streamCompleted = false;
      const streamTimeout = setTimeout(() => {
        if (!streamCompleted) {
          console.log('Stream timeout reached, completing with fallback response');
          writeEvent('step', {
            step: 'Generating response...',
            timestamp: new Date().toISOString()
          });
          
          // Send fallback response
          const fallbackResponse = "I'm here to help! How can I assist you today?";
          const chunks = this.splitIntoChunks(fallbackResponse, 5);
          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              writeEvent('token', {
                content: chunk,
                timestamp: new Date().toISOString()
              });
              
              // Send complete event after last chunk
              if (index === chunks.length - 1) {
                setTimeout(() => {
                  writeEvent('complete', {
                    message: 'Stream completed (timeout fallback)',
                    finalContent: fallbackResponse,
                    timestamp: new Date().toISOString()
                  });
                  streamCompleted = true;
                }, 100);
              }
            }, index * 100);
          });
        }
      }, 5000);

      let chunkCount = 0;
      try {
        for await (const chunk of stream) {
          chunkCount++;
          console.log(`Processing chunk ${chunkCount}`); // Debug logging
        console.log('Stream chunk received:', JSON.stringify(chunk, null, 2)); // Debug logging
        
        // Detect workflow step changes
        const currentMessages = chunk.messages || [];
        console.log('Current messages count:', currentMessages.length); // Debug logging
        
        if (currentMessages.length > 0) {
          const latestMessage = currentMessages[currentMessages.length - 1];
          console.log('Latest message:', JSON.stringify(latestMessage, null, 2)); // Debug logging
          
          if (latestMessage !== lastMessage) {
            // New message or message update
            if (latestMessage.content) {
              const messageContent = typeof latestMessage.content === 'string' 
                ? latestMessage.content 
                : JSON.stringify(latestMessage.content);
              
              console.log('Message content:', messageContent); // Debug logging
              console.log('Message type:', latestMessage._getType()); // Debug logging
              
              // Check if this is a workflow step
              if (messageContent.includes('searching') || 
                  messageContent.includes('retrieving') || 
                  messageContent.includes('processing') ||
                  messageContent.includes('Searching') ||
                  messageContent.includes('Retrieved') ||
                  messageContent.includes('Processing')) {
                currentStep = messageContent.substring(0, 100);
                console.log('Sending step event:', currentStep); // Debug logging
                streamMonitor.updateStreamStep(streamId, currentStep);
                writeEvent('step', {
                  step: currentStep,
                  timestamp: new Date().toISOString()
                });
              } else if (latestMessage._getType() === 'ai') {
                // This is AI response content - send incremental updates
                console.log('AI message detected, accumulated:', accumulatedContent.length, 'new:', messageContent.length); // Debug logging
                if (messageContent !== accumulatedContent) {
                  const newContent = messageContent.slice(accumulatedContent.length);
                  if (newContent) {
                    console.log('Sending new content:', newContent); // Debug logging
                    // For better streaming effect, split longer content into smaller chunks
                    const chunks = this.splitIntoChunks(newContent, 10);
                    for (const chunk of chunks) {
                      writeEvent('token', {
                        content: chunk,
                        timestamp: new Date().toISOString()
                      });
                      // Small delay between chunks for visual effect
                      await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    accumulatedContent = messageContent;
                  }
                }
              } else {
                // Handle other message types - send as step updates
                console.log('Unknown message type, sending as step:', latestMessage._getType()); // Debug logging
                writeEvent('step', {
                  step: `Processing: ${latestMessage._getType()}`,
                  timestamp: new Date().toISOString()
                });
              }
            }
            lastMessage = latestMessage;
          }
        }
        }

        console.log('LangGraph stream iteration completed'); // Debug logging
        clearTimeout(streamTimeout);
        
        if (!streamCompleted) {
          streamCompleted = true;
          
          // If no content was accumulated, send some test content
          if (!accumulatedContent) {
            console.log('No accumulated content, sending test response'); // Debug logging
            const testResponse = "Hello! I'm your AI assistant. How can I help you today?";
            const chunks = this.splitIntoChunks(testResponse, 5);
            for (const chunk of chunks) {
              writeEvent('token', {
                content: chunk,
                timestamp: new Date().toISOString()
              });
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            accumulatedContent = testResponse;
          }

          // Send completion event
          writeEvent('complete', {
            message: 'Stream completed',
            finalContent: accumulatedContent,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error in LangGraph streaming:', error);
        clearTimeout(streamTimeout);
        
        if (!streamCompleted) {
          writeEvent('error', {
            error: 'Workflow execution failed',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Mark stream as completed
      streamMonitor.completeStream(streamId);

    } catch (error) {
      console.error('Streaming error:', error);
      
      // Send error event
      const errorData = JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      reply.raw.write(`event: error\n`);
      reply.raw.write(`data: ${errorData}\n\n`);
      
      streamMonitor.errorStream(streamId, error instanceof Error ? error.message : 'Unknown error');
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
