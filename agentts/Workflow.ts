import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { Annotation, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

export class Workflow {
    static create(vectorStore: MemoryVectorStore, llm: ChatOpenAI, promptTemplate: any) {
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
            const docsContent = state.context.map((doc: Document) => doc.pageContent).join("\n");
            const messages = await promptTemplate.invoke({
                question: state.question,
                context: docsContent,
            });
            const response = await llm.invoke(messages);
            return { answer: response.content };
        };

        return new StateGraph(StateAnnotation)
            .addNode("analyzeQuery", analyzeQuery)
            .addNode("retrieveQA", retrieveQA)
            .addNode("generateQA", generateQA)
            .addEdge("__start__", "analyzeQuery")
            .addEdge("analyzeQuery", "retrieveQA")
            .addEdge("retrieveQA", "generateQA")
            .addEdge("generateQA", "__end__")
            .compile();
    }
}
