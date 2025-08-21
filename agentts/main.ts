import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { writeFile } from "fs/promises";
import { DocumentLoader } from "./DocumentLoader.js";
import { PromptTemplates } from "./PromptTemplates.js";
import { WorkflowTools } from "./WorkflowTools.js";
import {
  HumanMessage,
  SystemMessage,
  isAIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);

const urls: string[] = [
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/BestPractices.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Representation.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Resource.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Errors.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/REST.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/TokenExchange.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HTTPStatusCodes.md",
];
console.log(`URLs to be loaded: ${urls.length}`);

const loader = new DocumentLoader();
const splits = await loader.splitDocumentsFromUrls(urls);

// Index chunks
await vectorStore.addDocuments(splits);

const promptTemplate = PromptTemplates.ragPromptTemplate;

// write the graph to a file
const graph = WorkflowTools.create(vectorStore, llm, promptTemplate);
const image = await graph.getGraph().drawMermaidPng();
const arrayBuffer = await image.arrayBuffer();
// output graph as image
await writeFile("workflow.png", Buffer.from(arrayBuffer));

const prettyPrint = (message: BaseMessage) => {
  const contentStr =
    typeof message.content === "object"
      ? JSON.stringify(message.content)
      : message.content;
  let txt = `[${message.getType()}]: ${contentStr}`;
  if (isAIMessage(message) && (message.tool_calls?.length ?? 0) > 0) {
    const tool_calls = message.tool_calls
      ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
      .join("\n");
    txt += ` \nTools: \n${tool_calls}`;
  }
  // show token usage
  //txt += `\nTokens: ${message.usage_metadata?.total_tokens ?? "unknown"}`;
  console.log(txt);
};

async function callGraph(thread_id: string, content: string) {
  // Specify an ID for the thread
  const threadConfig = {
    configurable: { thread_id: thread_id },
    streamMode: "values" as const,
  };

  let inputs: { messages: BaseMessage[] } = { messages: [] };

  // Check if the thread exists by inspecting the graph's state history
  const history = await graph.getStateHistory(threadConfig).next();
  if (!history.done && history.value) {
    // thread already exists
  } else {
    console.log(`Creating new thread with ID ${thread_id}.`);
    inputs.messages.push(
      new SystemMessage(
        `You are an assistant for question-answering tasks. Use the provided context to answer user questions.  
You have access to a retrieve tool and should rely on that for source of context.  If the user does not specify a section (beginning, middle, end) use null.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.
Always say "So says the good book, The First Book of Cort. Anything else i can f'ing do for ya?" at the end of the answer.`
      )
    );
  }

  inputs.messages.push(new HumanMessage(content));
  for await (const step of await graph.stream(inputs, threadConfig)) {
    const lastMessage = step.messages[step.messages.length - 1];
    prettyPrint(lastMessage);
    console.log("-----\n");
  }
}

/*
await callGraph("abc123", "Hello");
// should call retreive tool without seection (null)
await callGraph("abc123", "What do the documents say about REST?");
// should call retreive tool without seection 'end'
await callGraph("abc123", "What does the end of any document say about REST?");
*/

const threadId = uuidv4();
await callGraph(threadId, "What is REST?");
await callGraph(threadId, "What are the levels?");

// const threadId2 = uuidv4();
// await callGraph(threadId2, "What is REST?  Once you get that answer, what are the levels?");

const app = express();
app.use(bodyParser.json());

app.post("/chat", async (req: express.Request, res: express.Response) => {
  const { threadId, message } = req.body;
  if (typeof threadId !== "string" || typeof message !== "string") {
    return res
      .status(400)
      .json({ error: "threadId and message must be strings" });
  }
  try {
    let answer = "";
    // Capture prettyPrint output
    const originalConsoleLog = console.log;
    let output = "";
    console.log = (txt) => {
      output += txt + "\n";
    };
    await callGraph(threadId, message);
    console.log = originalConsoleLog;
    answer = output.trim();
    res.json({ answer });
  } catch (err) {
    const errorMsg = (err && typeof err === "object" && "message" in err) ? (err as { message?: string }).message ?? "Internal server error" : "Internal server error";
    res.status(500).json({ error: errorMsg });
  }
});

app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8002;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});