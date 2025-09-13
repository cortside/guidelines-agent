import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatOpenAI } from "@langchain/openai";

export class DocumentLoader {
  private readonly llm: ChatOpenAI;
  private readonly allTags: string[] = [];

  constructor() {
    this.llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.8,  // higher temperature for more diverse tags
    });
  }

  private async loadDocument(url: string): Promise<Document[]> {
    const response = await fetch(url);
    const text = await response.text();
    // Return as array of Document objects
    return [new Document({ pageContent: text, metadata: { source: url } })];
  }

  private async generateMetaTags(content: string): Promise<string[]> {
    // bias functional tags by adding this to the end of the text using realistic tags: `, such as contract, proposal, research paper, meeting notes, policy, report, plan, strategy, guideline`
    // could feed in existing tags to avoid variances
    const metaTagPrompt = `You are a document tagging assistant.
Analyze the following long-form document and generate 3–5 flat tags that combine:
Topical keywords (what the document is about)
Functional categories (the type or purpose of the document)
There is no fixed taxonomy — generate the tags dynamically based on the content.
Output only a comma-separated list of tags, with no extra text, explanations, or formatting.`;

    const prompt = `${metaTagPrompt}\n${content}`;
    const response = await this.llm.invoke(prompt);
    // Expecting a comma-separated list of tags
    const tags =
      typeof response.content === "string"
        ? response.content.split(/,\s*/).map((tag: string) => tag.trim().toLowerCase()).filter(Boolean)
        : [];

    // Only add tags that are not already in allTags
    const newTags = tags.filter(tag => !this.allTags.includes(tag));
    this.allTags.push(...newTags);

    console.log(`Generated tags: ${tags.join(", ")}`);
    return tags;
  }

  private async loadAllDocuments(urls: string[]): Promise<Document[]> {
    const docsArrays = await Promise.all(urls.map(this.loadDocument));
    const docs = docsArrays.flat();

    // generate meta tags for each document
    for (const doc of docs) {
      const tags = await this.generateMetaTags(doc.pageContent);
      // Convert tags array to comma-separated string for ChromaDB compatibility
      doc.metadata["tags"] = tags.join(", ");
      // Also store as array for internal use (in a separate field)
      //doc.metadata["tagsArray"] = tags;
    }

    // Flatten the array of arrays
    return docs;
  }

  async loadFromUrls(urls: string[]): Promise<Document[]> {
    if (!urls || urls.length === 0) {
      throw new Error("No URLs provided to load documents.");
    }
    console.log(`Loading documents from URLs: ${urls.length}`);
    const docs = await this.loadAllDocuments(urls);
    console.log(`Loaded ${docs.length} documents.`);
    return docs;
  }

  // the chunks size and overlap need to be played with to figure out optimal values for the ingested content
  private async splitDocuments(docs: Document[]): Promise<Document[]> {
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const allSplits = await splitter.splitDocuments(docs);
    console.log(
      `Split ${docs.length} document into ${allSplits.length} sub-documents.`
    );
    return allSplits;
  }

  async splitDocumentsFromUrls(urls: string[]): Promise<Document[]> {
    const docs = await this.loadFromUrls(urls);
    return this.splitDocuments(docs);
  }

  public get tags(): string[] {
    return this.allTags;
  }
}
