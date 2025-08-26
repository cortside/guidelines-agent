import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

export class Workflow {
  static create(
    vectorStore: MemoryVectorStore,
    llm: ChatOpenAI,
    promptTemplate: any
  ) {
    const searchSchema = z.object({
      query: z.string().describe("Search query to run."),
      tags: z
        .array(z.string())
        .describe(
          "Optional functional and topical tags that describe the document to filter by."
        ),
    });

    // Ranks documents using the LLM and returns the top N documents
    async function getRankedDocuments(
      llm: ChatOpenAI,
      query: string,
      docs: Document[],
      topN: number
    ): Promise<Document[]> {
      if (docs.length <= topN) return docs;

      // Prepare a prompt for ranking
      const docSummaries = docs
        .map((doc, i) => `Doc${i + 1}: ${doc.pageContent}`)
        .join("\n");
      const prompt = `You are an expert document ranker.\nGiven the following query: "${query}", rank the following documents from most to least relevant.\n\n${docSummaries}\n\nReturn a comma-separated list of document numbers (e.g. 2,1,3,...) in order of relevance, with no extra text.`;

      // TODO: use structured output
      const response = await llm.invoke(prompt);
      const ranking =
        typeof response.content === "string"
          ? response.content
              .split(/,\s*/)
              .map((n: string) => parseInt(n, 10) - 1)
              .filter((n) => !isNaN(n) && n >= 0 && n < docs.length)
          : [];

      console.log(`Ranking response: ${response.content}`);

      // Select topN ranked documents
      const rankedDocs = ranking.slice(0, topN).map((idx) => docs[idx]);
      // Fallback: if ranking is incomplete, fill with remaining docs
      while (rankedDocs.length < topN && docs.length > rankedDocs.length) {
        const nextDoc = docs.find((doc) => !rankedDocs.includes(doc));
        if (nextDoc) rankedDocs.push(nextDoc);
      }
      return rankedDocs;
    }

    const retrieve = tool(
      async (search: z.infer<typeof searchSchema>) => {
        let retrievedDocs;
        if (search.tags !== null && search.tags.length > 0) {
          const filter = (doc: Document) => {
            const tags = Array.isArray(doc.metadata.tags)
              ? doc.metadata.tags
              : [];
            return search.tags.some((tag) => tags.includes(tag));
          };
          retrievedDocs = await vectorStore.similaritySearch(
            search.query,
            9,
            filter
          );
        } else {
          retrievedDocs = await vectorStore.similaritySearch(search.query, 3);
        }

        const selectedDocs = await getRankedDocuments(
          llm,
          search.query,
          retrievedDocs,
          3
        );

        const serialized = selectedDocs
          .map(
            (doc) =>
              `Source: ${doc.metadata.source}[${doc.metadata.loc.lines.from}-${
                doc.metadata.loc.lines.to
              }]\nTags: ${doc.metadata.tags.join(",")}\nContent: ${
                doc.pageContent
              }`
          )
          .join("\n");

        console.log(`Retrieved ${selectedDocs.length} documents.`);
        return [serialized, selectedDocs];
      },
      {
        name: "retrieve",
        description: "Retrieve information related to a query.",
        schema: searchSchema,
        responseFormat: "content_and_artifact",
      }
    );

    // Step 1: Generate an AIMessage that may include a tool-call to be sent.
    async function queryOrRespond(state: typeof MessagesAnnotation.State) {
      const llmWithTools = llm.bindTools([retrieve]);
      const response = await llmWithTools.invoke(state.messages);
      // MessagesState appends messages to state instead of overwriting
      return { messages: [response] };
    }

    // Step 2: Execute the retrieval.
    const tools = new ToolNode([retrieve]);

    // Step 3: Generate a response using the retrieved content.
    async function generate(state: typeof MessagesAnnotation.State) {
      // Get generated ToolMessages
      let recentToolMessages = [];
      for (let i = state["messages"].length - 1; i >= 0; i--) {
        let message = state["messages"][i];
        if (message instanceof ToolMessage) {
          recentToolMessages.push(message);
        } else {
          break;
        }
      }
      let toolMessages = recentToolMessages.reverse();

      // Format into prompt
      const docsContent = toolMessages.map((doc) => doc.content).join("\n");
      const systemMessageContent =
        "You are an assistant for question-answering tasks. " +
        "Use the following pieces of retrieved context to answer " +
        "the question. If you don't know the answer, say that you " +
        "don't know. Use three sentences maximum and keep the " +
        "answer concise." +
        "\n\n" +
        `${docsContent}`;

      const conversationMessages = state.messages.filter(
        (message) =>
          message instanceof HumanMessage ||
          message instanceof SystemMessage ||
          (message instanceof AIMessage && message.tool_calls?.length == 0)
      );
      const prompt = [
        new SystemMessage(systemMessageContent),
        ...conversationMessages,
      ];

      // Run
      const response = await llm.invoke(prompt);
      return { messages: [response] };
    }

    const graphBuilder = new StateGraph(MessagesAnnotation)
      .addNode("queryOrRespond", queryOrRespond)
      .addNode("tools", tools)
      .addNode("generate", generate)
      .addEdge("__start__", "queryOrRespond")
      .addConditionalEdges("queryOrRespond", toolsCondition, {
        __end__: "__end__",
        tools: "tools",
      })
      .addEdge("tools", "generate")
      .addEdge("generate", "__end__");

    const checkpointer = new MemorySaver();
    return graphBuilder.compile({ checkpointer });
  }
}
