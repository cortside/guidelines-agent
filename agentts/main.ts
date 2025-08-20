import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { writeFile } from "fs/promises";
import { DocumentLoader } from "./DocumentLoader.js";
import { PromptTemplates } from "./PromptTemplates.js";
import "cheerio";
import { z } from "zod";
import { Workflow } from "./Workflow.js";

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large"
});

const vectorStore = new MemoryVectorStore(embeddings);

const urls: string[] = [
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/BestPractices.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Representation.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Resource.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Errors.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/REST.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/TokenExchange.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HTTPStatusCodes.md"
];
console.log(`URLs to be loaded: ${urls.length}`);

const loader = new DocumentLoader();
const splits = await loader.splitDocumentsFromUrls(urls);

// Index chunks
await vectorStore.addDocuments(splits)

const promptTemplate = PromptTemplates.ragPromptTemplate;

// write the graph to a file
const graph = Workflow.create(vectorStore, llm, promptTemplate);
const image = await graph.getGraph().drawMermaidPng();
const arrayBuffer = await image.arrayBuffer();
// output graph as image
await writeFile("workflow.png", Buffer.from(arrayBuffer));

let inputs = {
  question: "What does the end of any document say about REST?",
};

console.log(inputs);
console.log("\n====\n");
for await (const chunk of await graph.stream(inputs, {
  streamMode: "updates",
})) {
  console.log(chunk);
  console.log("\n====\n");
}
