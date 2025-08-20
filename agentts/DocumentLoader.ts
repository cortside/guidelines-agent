import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export class DocumentLoader {
    private async loadDocument(url: string): Promise<Document[]> {
        const response = await fetch(url);
        const text = await response.text();
        // Return as array of Document objects
        return [new Document({ pageContent: text, metadata: { source: url } })];
    }

    private async loadAllDocuments(urls: string[]): Promise<Document[]> {
        const docsArrays = await Promise.all(urls.map(this.loadDocument));
        // Flatten the array of arrays
        return docsArrays.flat();
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
            chunkSize: 1000, chunkOverlap: 200
        });
        const allSplits = await splitter.splitDocuments(docs);
        console.log(`Split ${docs.length} document into ${allSplits.length} sub-documents.`);
    
        const totalDocuments = allSplits.length;
        const third = Math.floor(totalDocuments / 3);
    
        allSplits.forEach((document: Document, i: number) => {
            if (i < third) {
                document.metadata["section"] = "beginning";
            } else if (i < 2 * third) {
                document.metadata["section"] = "middle";
            } else {
                document.metadata["section"] = "end";
            }
        });
        return allSplits;
    }

    async splitDocumentsFromUrls(urls: string[]): Promise<Document[]> {
        const docs = await this.loadFromUrls(urls);
        return this.splitDocuments(docs);
    }
}
