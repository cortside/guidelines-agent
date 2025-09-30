import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatOpenAI } from "@langchain/openai";
import { config } from '../config/index.ts';
import { createTagGenerationLLM } from '../infrastructure/llm.ts';

export class DocumentService {
  private readonly llm: ChatOpenAI;
  public allTags: string[] = [];

  constructor() {
    this.llm = createTagGenerationLLM();
  }

  private async loadDocument(url: string): Promise<Document[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      return [new Document({ 
        pageContent: text, 
        metadata: { 
          source: url.replace('https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master', '') 
        } 
      })];
    } catch (error) {
      console.error(`Error loading document from ${url}:`, error);
      throw error;
    }
  }

  private async generateMetaTags(content: string): Promise<string[]> {
    const metaTagPrompt = `You are a document tagging assistant.
Analyze the following long-form document and generate 3–5 flat tags that combine:
Topical keywords (what the document is about)
Functional categories (the type or purpose of the document)
There is no fixed taxonomy — generate the tags dynamically based on the content.
Output only a comma-separated list of tags, with no extra text, explanations, or formatting.`;

    const prompt = `${metaTagPrompt}\n${content}`;
    
    try {
      const response = await this.llm.invoke(prompt);
      const tags = typeof response.content === "string"
        ? response.content
            .split(/,\s*/)
            .map((tag: string) => tag.trim().toLowerCase())
            .filter(Boolean)
        : [];

      // Only add tags that are not already in allTags
      const newTags = tags.filter(tag => !this.allTags.includes(tag));
      this.allTags.push(...newTags);

      console.log(`Generated tags: ${tags.join(", ")}`);
      return tags;
    } catch (error) {
      console.error("Error generating meta tags:", error);
      // Return empty array on error to prevent blocking document processing
      return [];
    }
  }

  private async loadAllDocuments(urls: string[]): Promise<Document[]> {
    console.log(`Loading documents from URLs: ${urls.length}`);
    
    // Load documents in parallel but with error handling for individual failures
    const documentPromises = urls.map(async (url) => {
      try {
        return await this.loadDocument(url);
      } catch (error) {
        console.error(`Failed to load document from ${url}, skipping:`, error);
        return [];
      }
    });
    
    const docsArrays = await Promise.all(documentPromises);
    const docs = docsArrays.flat().filter(doc => doc.pageContent.length > 0);

    // Generate meta tags for each document
    for (const doc of docs) {
      try {
        const tags = await this.generateMetaTags(doc.pageContent);
        doc.metadata["tags"] = tags;
      } catch (error) {
        console.error(`Failed to generate tags for document ${doc.metadata.source}, using empty tags:`, error);
        doc.metadata["tags"] = [];
      }
    }

    console.log(`Successfully loaded ${docs.length} documents.`);
    return docs;
  }

  async loadFromUrls(urls?: string[]): Promise<Document[]> {
    const urlsToLoad = urls || config.documents.urls;
    
    if (!urlsToLoad || urlsToLoad.length === 0) {
      throw new Error("No URLs provided to load documents.");
    }
    
    return this.loadAllDocuments(urlsToLoad);
  }

  private async splitDocuments(docs: Document[]): Promise<Document[]> {
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: config.documents.chunkSize,
      chunkOverlap: config.documents.chunkOverlap,
    });

    // Split each document individually to preserve metadata
    const allSplitsArrays = await Promise.all(
      docs.map(async (doc) => {
        try {
          return await splitter.createDocuments([doc.pageContent], [doc.metadata]);
        } catch (error) {
          console.error(`Error splitting document ${doc.metadata.source}:`, error);
          return [];
        }
      })
    );
    
    const allSplits = allSplitsArrays.flat();
    console.log(`Split ${docs.length} documents into ${allSplits.length} sub-documents.`);
    return allSplits;
  }

  async splitDocumentsFromUrls(urls?: string[]): Promise<Document[]> {
    const docs = await this.loadFromUrls(urls);
    return this.splitDocuments(docs);
  }

  public get tags(): string[] {
    return this.allTags;
  }

  public setTags(tags: string[]): void {
    this.allTags = tags;
  }
}
