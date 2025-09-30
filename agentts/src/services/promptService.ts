import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { config } from '../config/index.ts';

export class PromptService {
  private static ragPromptTemplateCache: ChatPromptTemplate | null = null;
  private static hubPromptTemplateCache: ChatPromptTemplate | null = null;

  public static get ragTemplate(): string {
    return config.prompts.ragTemplate;
  }

  public static get systemMessage(): string {
    return config.prompts.systemMessage;
  }

  public static get ragPromptTemplate(): ChatPromptTemplate {
    if (!this.ragPromptTemplateCache) {
      this.ragPromptTemplateCache = ChatPromptTemplate.fromMessages([
        ["user", this.ragTemplate],
      ]);
    }
    return this.ragPromptTemplateCache;
  }

  // Example of a referenced prompt template from LangChain Hub
  public static async getHubPromptTemplate(): Promise<ChatPromptTemplate> {
    if (!this.hubPromptTemplateCache) {
      try {
        this.hubPromptTemplateCache = await pull<ChatPromptTemplate>("rlm/rag-prompt");
      } catch (error) {
        console.warn("Failed to load prompt template from hub, using default:", error);
        // Fallback to local template
        this.hubPromptTemplateCache = this.ragPromptTemplate;
      }
    }
    return this.hubPromptTemplateCache;
  }

  public static createSystemMessage(availableTags: string[]): string {
    const baseMessage = this.systemMessage;
    
    // Insert available tags into the system message
    return baseMessage.replace(
      "The following tags are valid: [${loader.tags.join(\", \")}]",
      `The following tags are valid: [${availableTags.join(", ")}]`
    );
  }

  // Reset cached templates (useful for testing or configuration changes)
  public static resetCache(): void {
    this.ragPromptTemplateCache = null;
    this.hubPromptTemplateCache = null;
  }
}
