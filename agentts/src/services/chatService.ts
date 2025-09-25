import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { VectorStore } from "@langchain/core/vectorstores";
import { ChatOpenAI } from "@langchain/openai";
import { WorkflowService } from "./workflowService.js";
import { PromptService } from "./promptService.js";
import { DocumentService } from "./documentService.js";
import { createVectorStore } from "../infrastructure/vectorStore.js";
import { createChatLLM } from "../infrastructure/llm.js";
import { config } from "../config/index.js";

export class ChatService {
  private vectorStore: VectorStore | null = null;
  private llm: ChatOpenAI | null = null;
  private graph: any | null = null;
  private documentService: DocumentService | null = null;

  async initialize(): Promise<void> {
    console.log("Initializing ChatService...");
    
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
      // Specify an ID for the thread
      const threadConfig = {
        configurable: { thread_id: threadId },
        streamMode: "values" as const,
      };

      let inputs: { messages: BaseMessage[] } = { messages: [] };

      // Check if the thread exists by inspecting the graph's state history
      const history = await this.graph.getStateHistory(threadConfig).next();
      if (!history.done && history.value) {
        // thread already exists
      } else {
        console.log(`Creating new thread with ID: ${threadId}`);
        const systemMessage = PromptService.createSystemMessage(this.documentService.tags);
        inputs.messages.push(new SystemMessage(systemMessage));
      }

      inputs.messages.push(new HumanMessage(content));
      
      let lastMessage: BaseMessage | undefined;
      for await (const step of await this.graph.stream(inputs, threadConfig)) {
        lastMessage = step.messages[step.messages.length - 1];
      }
      
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
}
