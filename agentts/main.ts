import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { writeFile } from "fs/promises";
import { DocumentLoader } from "./DocumentLoader.js";
import { PromptTemplates } from "./PromptTemplates.js";
import "cheerio";
import { z } from "zod";

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

// Define state for application
const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const searchSchema = z.object({
  query: z.string().describe("Search query to run."),
  section: z.enum(["beginning", "middle", "end"]).describe("Section to query."),
});

const structuredLlm = llm.withStructuredOutput(searchSchema);

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  search: Annotation<z.infer<typeof searchSchema>>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

const analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
  const result = await structuredLlm.invoke(state.question);
  return { search: result };
};

const retrieveQA = async (state: typeof StateAnnotation.State) => {
  try {
    console.log("retrieveQA called with:", state);
    if (!state.search) {
      throw new Error("state.search is undefined");
    }
    console.log("search.query:", state.search.query);
    console.log("search.section:", state.search.section);
    const filter = (doc: Document) => doc.metadata.section === state.search.section;
    const retrievedDocs = await vectorStore.similaritySearch(
      state.search.query,
      5,
      filter
    );
    console.log("retrievedDocs:", retrievedDocs);
    return { context: retrievedDocs };
  } catch (err) {
    console.error("Error in retrieveQA:", err);
    console.error("Type of error:", typeof err);
    console.dir(err, { depth: null });
    throw err;
  }
};

const generateQA = async (state: typeof StateAnnotation.State) => {
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(messages);
  return { answer: response.content };
};

// write the graph to a file
const graph = new StateGraph(StateAnnotation)
  .addNode("analyzeQuery", analyzeQuery)
  .addNode("retrieveQA", retrieveQA)
  .addNode("generateQA", generateQA)
  .addEdge("__start__", "analyzeQuery")
  .addEdge("analyzeQuery", "retrieveQA")
  .addEdge("retrieveQA", "generateQA")
  .addEdge("generateQA", "__end__")
  .compile();

const image = await graph.getGraph().drawMermaidPng();
const arrayBuffer = await image.arrayBuffer();
// write the graph to a file
//import { writeFile } from "fs/promises";
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
