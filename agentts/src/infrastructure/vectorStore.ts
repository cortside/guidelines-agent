import { VectorStore } from "@langchain/core/vectorstores";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { config } from "../config/index.ts";
import { createEmbeddings } from "./llm.ts";

let vectorStoreInstance: VectorStore | null = null;
let pineconeClient: PineconeClient | null = null;

export async function createVectorStore(): Promise<VectorStore> {
  if (vectorStoreInstance) {
    return vectorStoreInstance;
  }

  const embeddings = createEmbeddings();

  switch (config.vectorStore.provider) {
    case "pinecone":
      return createPineconeStore(embeddings);

    case "chroma":
      return createChromaStore(embeddings);

    case "memory":
    default:
      return createMemoryStore(embeddings);
  }
}

async function createPineconeStore(embeddings: any): Promise<VectorStore> {
  if (!pineconeClient) {
    pineconeClient = new PineconeClient();
  }

  const pineconeIndex = pineconeClient.Index(
    config.vectorStore.pinecone!.indexName,
  );

  // Clear existing documents if in development and force reload is enabled
  if (config.nodeEnv === "development" && config.documents.forceReload) {
    await pineconeIndex.deleteAll();
  }

  vectorStoreInstance = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    maxConcurrency: config.vectorStore.pinecone!.maxConcurrency,
  });

  return vectorStoreInstance;
}

async function createChromaStore(embeddings: any): Promise<VectorStore> {
  vectorStoreInstance = new Chroma(embeddings, {
    collectionName: config.vectorStore.chroma!.collectionName,
    url: config.vectorStore.chroma!.url,
  });

  return vectorStoreInstance;
}

async function createMemoryStore(embeddings: any): Promise<VectorStore> {
  vectorStoreInstance = new MemoryVectorStore(embeddings);
  return vectorStoreInstance;
}

export async function clearVectorStore(): Promise<void> {
  if (!vectorStoreInstance) {
    return;
  }

  switch (config.vectorStore.provider) {
    case "pinecone":
      if (pineconeClient) {
        const pineconeIndex = pineconeClient.Index(
          config.vectorStore.pinecone!.indexName,
        );
        await pineconeIndex.deleteAll();
      }
      break;

    // Note: Chroma and Memory stores don't have a clear method in the current implementation
    // This would need to be implemented based on the specific vector store capabilities
    case "chroma":
    case "memory":
    default:
      console.warn(
        `Clear operation not implemented for ${config.vectorStore.provider} vector store`,
      );
      break;
  }
}

export function resetVectorStore(): void {
  vectorStoreInstance = null;
  pineconeClient = null;
}
