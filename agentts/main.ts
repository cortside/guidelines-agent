import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { writeFile } from "fs/promises";
import { DocumentLoader } from "./DocumentLoader.js";
import { PromptTemplates } from "./PromptTemplates.js";
import { WorkflowTools } from "./WorkflowTools.js";
import { AIMessage,  HumanMessage,  SystemMessage,  ToolMessage } from "@langchain/core/messages";

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
const graph = WorkflowTools.create(vectorStore, llm, promptTemplate);
const image = await graph.getGraph().drawMermaidPng();
const arrayBuffer = await image.arrayBuffer();
// output graph as image
await writeFile("workflow.png", Buffer.from(arrayBuffer));

import { BaseMessage, isAIMessage } from "@langchain/core/messages";

const prettyPrint = (message: BaseMessage) => {
  let txt = `[${message._getType()}]: ${message.content}`;
  if ((isAIMessage(message) && message.tool_calls?.length) || 0 > 0) {
    const tool_calls = (message as AIMessage)?.tool_calls
      ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
      .join("\n");
    txt += ` \nTools: \n${tool_calls}`;
  }
  console.log(txt);
};

let inputs1 = { messages: [{ role: "user", content: "Hello" }] };

for await (const step of await graph.stream(inputs1, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}

// let inputs = {
//   question: "What does the end of any document say about REST?",
// };

// console.log(inputs);
// console.log("\n====\n");
// for await (const chunk of await graph.stream(inputs, {
//   streamMode: "updates",
// })) {
//   console.log(chunk);
//   console.log("\n====\n");
// }

let inputs2 = {
  messages: [{ role: "user", content: "What does the end of any document say about REST?" }],
};

for await (const step of await graph.stream(inputs2, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}