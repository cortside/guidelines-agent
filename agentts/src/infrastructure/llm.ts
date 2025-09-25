import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { config } from "../config/index.js";

let llmInstance: ChatOpenAI | null = null;
let embeddingsInstance: OpenAIEmbeddings | null = null;
let tagGenerationLlmInstance: ChatOpenAI | null = null;

export function createChatLLM(): ChatOpenAI {
  if (!llmInstance) {
    llmInstance = new ChatOpenAI({
      model: config.openai.chatModel,
      temperature: config.openai.chatTemperature,
      apiKey: config.openai.apiKey,
    });
  }
  return llmInstance;
}

export function createEmbeddings(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({
      model: config.openai.embeddingModel,
      apiKey: config.openai.apiKey,
    });
  }
  return embeddingsInstance;
}

export function createTagGenerationLLM(): ChatOpenAI {
  if (!tagGenerationLlmInstance) {
    tagGenerationLlmInstance = new ChatOpenAI({
      model: config.openai.tagGenerationModel,
      temperature: config.openai.tagGenerationTemperature,
      apiKey: config.openai.apiKey,
    });
  }
  return tagGenerationLlmInstance;
}

// Reset instances (useful for testing or configuration changes)
export function resetLLMInstances(): void {
  llmInstance = null;
  embeddingsInstance = null;
  tagGenerationLlmInstance = null;
}
