import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { writeFile } from "fs/promises";
import { DocumentLoader } from "./DocumentLoader.js";
import { PromptTemplates } from "./PromptTemplates.js";
import { Workflow } from "./Workflow.js";
import {
  HumanMessage,
  SystemMessage,
  isAIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const llm = new ChatOpenAI({
  model: "gpt-4.1-mini",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

//const vectorStore = new MemoryVectorStore(embeddings);

// import { Chroma } from "@langchain/community/vectorstores/chroma";
// import { exit } from "process";

// const vectorStore = new Chroma(embeddings, {
//   collectionName: "guidelines",
//   url: "http://localhost:9000", // URL of the Chroma server
//   // For file-based storage, omit the 'url' parameter
//   // Chroma will use local storage by default
// });

import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

const pinecone = new PineconeClient();
const pineconeIndex = pinecone.Index("guidelines");

// delete all documents in the vector store
await pineconeIndex.deleteAll();

const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex,
  // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
  maxConcurrency: 5,
  // You can pass a namespace here too
  // namespace: "foo",
});

const urls: string[] = [
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Messaging.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Microservices.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Observability.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/References.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/REST.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/Security.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/TokenExchange.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/CodingStandards.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/PackageAndSymbolServerSetup.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/Rounding.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/csharp/update-net6.0.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/git/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/BestPractices.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/DateTime.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Errors.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HealthCheck.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HTTPStatusCodes.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/OpenAPI.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Representation.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Resource.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/scrum/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/scrum/user-stories.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/sql/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/template/README.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/template/TemplateApi.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/template/WebApiStarter.md",
  "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/README.md",
];
console.log(`URLs to be loaded: ${urls.length}`);

const loader = new DocumentLoader();

// Load and split documents, generating tags if there are none in the db
try {
  // Try to perform a simple similarity search to check if collection has documents
  const testSearch = await vectorStore.similaritySearch("rest", 1);
  if (testSearch.length === 0) {
    console.log(
      "No documents in vector store, loading from URLs and generating tags..."
    );
    const splits = await loader.splitDocumentsFromUrls(urls);
    console.log(`Document tags identified: ${loader.tags.length}`);

    // Index chunks
    await vectorStore.addDocuments(splits);
  } else {
    // load metadata tags from existing documents
    // For Pinecone, we need to query documents to extract tags from metadata
    const existingDocs = await vectorStore.similaritySearch("", 100); // Get more docs to collect tags
    const allTags = new Set<string>();
    
    existingDocs.forEach(doc => {
      if (doc.metadata?.tags && Array.isArray(doc.metadata.tags)) {
        doc.metadata.tags.forEach((tag: string) => allTags.add(tag));
      }
    });
    
    loader.allTags = Array.from(allTags);
    
    console.log(`Document tags identified: ${loader.allTags.length}`);
    console.log(`Found ${testSearch.length} existing documents in vector store`);
  }
} catch (error) {
  // If collection doesn't exist or is empty, load documents
  console.log(
    "Vector store collection doesn't exist or is empty, loading from URLs and generating tags..."
  );
  console.log(`Error details: ${error instanceof Error ? error.message : String(error)}`);
  const splits = await loader.splitDocumentsFromUrls(urls);
  console.log(`Document tags identified: ${loader.tags.length}`);

  // Index chunks
  await vectorStore.addDocuments(splits);
}

const promptTemplate = PromptTemplates.ragPromptTemplate;

// write the graph to a file
const graph = Workflow.create(vectorStore, llm, promptTemplate);
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
  // TODO: show token usage
  //txt += `\nTokens: ${message.usage_metadata?.total_tokens ?? "unknown"}`;
  console.log(txt);
};

async function callGraph(thread_id: string, content: string): Promise<string> {
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
    console.log(`Creating new thread with ID: ${thread_id}`);
    inputs.messages.push(
      new SystemMessage(
        `You are an assistant for question-answering tasks. Use the provided context to answer user questions.  
You have access to a retrieve tool and should rely on that for source of context.  
The question should be analyzed for topical keywords and functional categories to be used to search against tags.  
The following tags are valid: [${loader.tags.join(", ")}]
If you don't know the answer, just say that you don't know, don't try to make up an answer.  
If you get the content from the retrieve tool, end response with "So says the good book, The First Book of Cort."
Always say "Anything else i can f'ing do for ya?" at the end of the answer.`
      )
    );
  }

  inputs.messages.push(new HumanMessage(content));
  let lastMessage: BaseMessage | undefined;
  for await (const step of await graph.stream(inputs, threadConfig)) {
    lastMessage = step.messages[step.messages.length - 1];
  }
  if (lastMessage) {
    return typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);
  }
  return "No response from AI.";
}

/*
await callGraph("abc123", "Hello");
// should call retreive tool without seection (null)
await callGraph("abc123", "What do the documents say about REST?");
// should call retreive tool without seection 'end'
await callGraph("abc123", "What does the end of any document say about REST?");
*/

//const threadId = uuidv4();
//await callGraph(threadId, "What is REST?");
//await callGraph(threadId, "What are the levels?");

// const threadId2 = uuidv4();
// await callGraph(threadId2, "What is REST?  Once you get that answer, what are the levels?");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/chat", async (req: express.Request, res: express.Response) => {
  const { threadId, message } = req.body;
  if (typeof threadId !== "string" || typeof message !== "string") {
    return res
      .status(400)
      .json({ error: "threadId and message must be strings" });
  }
  try {
    const answer = await callGraph(threadId, message);
    res.json({ answer });
  } catch (err) {
    const errorMsg =
      err && typeof err === "object" && "message" in err
        ? (err as { message?: string }).message ?? "Internal server error"
        : "Internal server error";
    res.status(500).json({ error: errorMsg });
  }
});

app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({ status: "ok" });
});

app.get(
  "/threads/:threadId",
  async (req: express.Request, res: express.Response) => {
    const threadId = req.params.threadId;
    if (typeof threadId !== "string" || !threadId) {
      return res.status(400).json({ error: "threadId must be a string" });
    }
    try {
      const threadConfig = {
        configurable: { thread_id: threadId },
        streamMode: "values" as const,
      };
      const history = await graph.getStateHistory(threadConfig).next();
      if (history.done || !history.value) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Extract messages from history.value.values.messages
      let allMessages: any[] = [];
      if (
        history.value?.values?.messages &&
        Array.isArray(history.value.values.messages)
      ) {
        allMessages = history.value.values.messages;
      }
      const annotated = allMessages.map((msg) => {
        let type = msg.getType();
        let content = msg.content || "";
        // If content is empty and there are tool calls, format them
        if (
          content === "" &&
          Array.isArray(msg.tool_calls) &&
          msg.tool_calls.length > 0
        ) {
          content = msg.tool_calls
            .map((tc: { args: any; name: any }) => {
              const args =
                typeof tc.args === "object" ? JSON.stringify(tc.args) : tc.args;
              return `${tc.name}: ${args}`;
            })
            .join("\n");
        }
        return { id: msg.id, type, content };
      });
      res.json({ messages: annotated });
    } catch (err) {
      const errorMsg =
        err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message ?? "Internal server error"
          : "Internal server error";
      res.status(500).json({ error: errorMsg });
    }
  }
);

const port = process.env.PORT || 8002;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
