import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";

export class PromptTemplates {
    public static readonly template: string = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.
Always say "anything else i can f'ing do for ya?" at the end of the answer.

{context}

Question: {question}

Helpful Answer:`;

    public static readonly ragPromptTemplate = ChatPromptTemplate.fromMessages([
        ["user", PromptTemplates.template],
    ]);

    // example of a referenced prompt template
    public static promptTemplate: ChatPromptTemplate;
    public static async initialize() {
        PromptTemplates.promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");
    }
}
