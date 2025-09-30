import { z } from "zod";

// Configuration schema for validation
const ConfigSchema = z.object({
  // Server Configuration
  port: z.number().min(1).max(65535).default(8002),
  
  // OpenAI Configuration
  openai: z.object({
    apiKey: z.string().min(1),
    chatModel: z.string().default("gpt-4o-mini"),
    chatTemperature: z.number().min(0).max(2).default(0),
    embeddingModel: z.string().default("text-embedding-3-large"),
    tagGenerationModel: z.string().default("gpt-4o-mini"),
    tagGenerationTemperature: z.number().min(0).max(2).default(0.8),
  }),
  
  // Vector Store Configuration
  vectorStore: z.object({
    provider: z.enum(["pinecone", "chroma", "memory"]).default("pinecone"),
    pinecone: z.object({
      indexName: z.string().default("guidelines"),
      maxConcurrency: z.number().min(1).default(5),
    }).optional(),
    chroma: z.object({
      url: z.string().default("http://localhost:9000"),
      collectionName: z.string().default("guidelines"),
    }).optional(),
  }),
  
  // Document Loading Configuration
  documents: z.object({
    urls: z.array(z.string().url()),
    chunkSize: z.number().min(100).default(1000),
    chunkOverlap: z.number().min(0).default(200),
    forceReload: z.boolean().default(false),
  }),
  
  // System Prompts Configuration
  prompts: z.object({
    systemMessage: z.string().default(
      `You are an assistant for question-answering tasks. Use the provided context to answer user questions.  
You have access to a retrieve tool and should rely on that for source of context.  
The question should be analyzed for topical keywords and functional categories to be used to search against tags.  
If you don't know the answer, just say that you don't know, don't try to make up an answer.  
If you get the content from the retrieve tool, end response with "So says the good book, The First Book of Cort."
Always say "Anything else i can f'ing do for ya?" at the end of the answer.`
    ),
    ragTemplate: z.string().default(
      `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.
Always say "anything else i can f'ing do for ya?" at the end of the answer.

{context}

Question: {question}

Helpful Answer:`
    ),
  }),
  
  // Retrieval Configuration
  retrieval: z.object({
    maxDocuments: z.number().min(1).default(21),
    rankedDocuments: z.number().min(1).default(7),
    similarityThreshold: z.number().min(0).max(1).optional(),
  }),

  // MCP Server Configuration
  mcp: z.object({
    enabled: z.boolean().default(true),
    port: z.number().min(1).max(65535).default(8003),
    host: z.string().default("localhost"),
    toolName: z.string().default("rest-api-standards"),
    toolDescription: z.string().default("Get comprehensive information about REST API features and expected standards"),
    predefinedQuery: z.string().default("What are the key features and expected standards of a restful api?"),
  }),
  
  // Environment
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): Config {
    const rawConfig = {
      port: parseInt(process.env.PORT || "8002"),
      
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "",
        chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        chatTemperature: parseFloat(process.env.OPENAI_CHAT_TEMPERATURE || "0"),
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large",
        tagGenerationModel: process.env.OPENAI_TAG_MODEL || "gpt-4o-mini",
        tagGenerationTemperature: parseFloat(process.env.OPENAI_TAG_TEMPERATURE || "0.8"),
      },
      
      vectorStore: {
        provider: process.env.VECTOR_STORE_PROVIDER || "pinecone",
        pinecone: {
          indexName: process.env.PINECONE_INDEX_NAME || "guidelines",
          maxConcurrency: parseInt(process.env.PINECONE_MAX_CONCURRENCY || "5"),
        },
        chroma: {
          url: process.env.CHROMA_URL || "http://localhost:9000",
          collectionName: process.env.CHROMA_COLLECTION_NAME || "guidelines",
        },
      },
      
      documents: {
        urls: this.parseDocumentUrls(),
        chunkSize: parseInt(process.env.DOCUMENT_CHUNK_SIZE || "1000"),
        chunkOverlap: parseInt(process.env.DOCUMENT_CHUNK_OVERLAP || "200"),
        forceReload: process.env.FORCE_DOCUMENT_RELOAD === "true",
      },
      
      prompts: {
        systemMessage: process.env.SYSTEM_MESSAGE || undefined,
        ragTemplate: process.env.RAG_TEMPLATE || undefined,
      },
      
      retrieval: {
        maxDocuments: parseInt(process.env.RETRIEVAL_MAX_DOCUMENTS || "21"),
        rankedDocuments: parseInt(process.env.RETRIEVAL_RANKED_DOCUMENTS || "7"),
        similarityThreshold: process.env.RETRIEVAL_SIMILARITY_THRESHOLD 
          ? parseFloat(process.env.RETRIEVAL_SIMILARITY_THRESHOLD) 
          : undefined,
      },

      mcp: {
        enabled: process.env.MCP_ENABLED !== "false",
        port: parseInt(process.env.MCP_PORT || "8003"),
        host: process.env.MCP_HOST || "localhost",
        toolName: process.env.MCP_TOOL_NAME || "rest-api-standards",
        toolDescription: process.env.MCP_TOOL_DESCRIPTION || "Get comprehensive information about REST API features and expected standards",
        predefinedQuery: process.env.MCP_PREDEFINED_QUERY || "What are the key features and expected standards of a restful api?",
      },
      
      nodeEnv: process.env.NODE_ENV || "development",
    };

    try {
      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Configuration validation failed:");
        error.errors.forEach((err) => {
          console.error(`- ${err.path.join(".")}: ${err.message}`);
        });
        throw new Error("Invalid configuration. Please check your environment variables.");
      }
      throw error;
    }
  }

  private parseDocumentUrls(): string[] {
    // Try environment variable first
    if (process.env.DOCUMENT_URLS) {
      return process.env.DOCUMENT_URLS.split(",").map(url => url.trim());
    }

    // Fallback to hardcoded URLs for now (will be moved to external config file)
    return [
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Messaging.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Microservices.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Observability.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/References.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/REST.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Security.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/TokenExchange.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/CodingStandards.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/PackageAndSymbolServerSetup.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/Rounding.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/update-net6.0.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/git/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/BestPractices.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/DateTime.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Errors.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HealthCheck.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HTTPStatusCodes.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/OpenAPI.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Representation.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Resource.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/scrum/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/scrum/user-stories.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/sql/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/template/README.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/template/TemplateApi.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/template/WebApiStarter.md",
      "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/README.md",
    ];
  }

  public get(): Config {
    return this.config;
  }

  public reload(): void {
    this.config = this.loadConfig();
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance().get();
export const configManager = ConfigManager.getInstance();
