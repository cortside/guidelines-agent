import getpass
import os
import asyncio
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from dotenv import load_dotenv
from mcp_client import MCPClient
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.tools.retriever import create_retriever_tool
from langgraph.graph import MessagesState, StateGraph, START, END
from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field
from typing import Literal
from langchain_core.messages import convert_to_messages
from langgraph.prebuilt import ToolNode, tools_condition

load_dotenv()

urls = [
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/BestPractices.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Representation.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Resource.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/Errors.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/REST.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/architecture/TokenExchange.md",
    "https://raw.githubusercontent.com/cortside/guidelines/refs/heads/master/docs/rest/HTTPStatusCodes.md"
]

print(f"Loading documents from URLs: {len(urls)}")
docs = [WebBaseLoader(url).load() for url in urls]

docs_list = [item for sublist in docs for item in sublist]

text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=100, chunk_overlap=50
)
doc_splits = text_splitter.split_documents(docs_list)

vectorstore = InMemoryVectorStore.from_documents(
    documents=doc_splits, embedding=OpenAIEmbeddings()
)
retriever = vectorstore.as_retriever()

print(f"Number of documents in vectorstore: {len(urls)}")
print(f"Number of chunks: {len(doc_splits)}")

retriever_tool = create_retriever_tool(
    retriever,
    "retrieve_blog_posts",
    "Search and return information about guidelines.",
)

response_model = init_chat_model("openai:gpt-4.1", temperature=0)


def get_message_role_content(m):
    if isinstance(m, dict):
        role = m.get("role", "user")
        content = m.get("content", str(m))
    else:
        role = getattr(m, "type", "user")
        content = getattr(m, "content", str(m))
    return f"{role}: {content}"


def generate_query_or_respond(state: MessagesState):
    """Call the model to generate a response based on the current state. Given
    the question, it will decide to retrieve using the retriever tool, or simply respond to the user.
    Now uses the full message history for context."""
    # Use all messages for context
    messages = state["messages"]
    print(f"User messages: {[m.content for m in messages]}")
    response = (
        response_model
        .bind_tools([retriever_tool]).invoke(messages)
    )
    print(f"Response from model: {response}")
    return {"messages": [response]}

GRADE_PROMPT = (
    "You are a grader assessing relevance of a retrieved document to a user question. \n "
    "Here is the retrieved document: \n\n {context} \n\n"
    "Here is the user question: {question} \n"
    "If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. \n"
    "Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question."
)


class GradeDocuments(BaseModel):
    """Grade documents using a binary score for relevance check."""

    binary_score: str = Field(
        description="Relevance score: 'yes' if relevant, or 'no' if not relevant"
    )


def grade_documents(
    state: MessagesState,
) -> Literal["generate_answer", "rewrite_question"]:
    """Determine whether the retrieved documents are relevant to the question, using full history."""
    messages = state["messages"]
    question = messages[0].content
    context = messages[-1].content
    history_text = "\n".join([get_message_role_content(m) for m in messages[:-1]])
    prompt = (
        GRADE_PROMPT +
        (f"\nConversation history:\n{history_text}" if history_text else "")
    ).format(question=question, context=context)
    print(f"Grading prompt: {prompt}")
    response = response_model.with_structured_output(GradeDocuments).invoke(
        [{"role": "user", "content": prompt}]
    )
    # Fix: Access binary_score correctly for both dict and BaseModel
    score = getattr(response, "binary_score", None)
    if score is None and isinstance(response, dict):
        score = response.get("binary_score")
    if score == "yes":
        return "generate_answer"
    else:
        return "rewrite_question"

REWRITE_PROMPT = (
    "Look at the input and try to reason about the underlying semantic intent / meaning.\n"
    "Here is the initial question:"
    "\n ------- \n"
    "{question}"
    "\n ------- \n"
    "Formulate an improved question:"
)


def rewrite_question(state: MessagesState):
    """Rewrite the original user question, using full history."""
    messages = state["messages"]
    history_text = "\n".join([get_message_role_content(m) for m in messages])
    prompt = (
        REWRITE_PROMPT +
        f"\nConversation history:\n{history_text}"
    ).format(question=messages[0].content)
    response = response_model.invoke([{"role": "user", "content": prompt}])
    return {"messages": [{"role": "user", "content": response.content}]}

GENERATE_PROMPT = (
    "You are an assistant for question-answering tasks. "
    "Use the following pieces of retrieved context to answer the question. "
    "If you don't know the answer, just say that you don't know. "
    "Use three sentences maximum and keep the answer concise.\n"
    "Question: {question} \n"
    "Context: {context}"
)


def generate_answer(state: MessagesState):
    """Generate an answer, using full history."""
    messages = state["messages"]
    question = messages[0].content
    context = messages[-1].content
    history_text = "\n".join([get_message_role_content(m) for m in messages])
    prompt = (
        GENERATE_PROMPT +
        f"\nConversation history:\n{history_text}"
    ).format(question=question, context=context)
    print(f"Answer generation prompt: {prompt}")
    response = response_model.invoke([{"role": "user", "content": prompt}])
    print(f"Generated answer: {response.content}")
    # Return the response as a message
    return {"messages": [response]}

workflow = StateGraph(MessagesState)

# Define the nodes we will cycle between
workflow.add_node(generate_query_or_respond)
workflow.add_node("retrieve", ToolNode([retriever_tool]))
workflow.add_node(rewrite_question)
workflow.add_node(generate_answer)

workflow.add_edge(START, "generate_query_or_respond")

# Decide whether to retrieve
workflow.add_conditional_edges(
    "generate_query_or_respond",
    # Assess LLM decision (call `retriever_tool` tool or respond to the user)
    tools_condition,
    {
        # Translate the condition outputs to nodes in our graph
        "tools": "retrieve",
        END: END,
    },
)

# Edges taken after the `action` node is called.
workflow.add_conditional_edges(
    "retrieve",
    # Assess agent decision
    grade_documents,
)
workflow.add_edge("generate_answer", END)
workflow.add_edge("rewrite_question", "generate_query_or_respond")

# Compile
graph = workflow.compile()

with open("workflow.png", "wb") as f:
    f.write(graph.get_graph().draw_mermaid_png())

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
FastAPIInstrumentor().instrument_app(app)

# Prometheus metrics
CHAT_REQUESTS = Counter('chat_requests_total', 'Total chat requests')
CHAT_RESPONSES = Counter('chat_responses_total', 'Total chat responses')
HEALTH_CHECKS = Counter('health_checks_total', 'Total health checks')

# In-memory chat history per user
chat_history = {}

@app.post("/chat")
async def chat(request: Request):
    CHAT_REQUESTS.inc()
    data = await request.json()
    user_id = data.get("user_id", "anonymous")
    message = data["message"]
    chat_history.setdefault(user_id, []).append({"role": "user", "content": message})
    # Integrate workflow logic
    user_messages = chat_history[user_id]
    # Convert to LangChain messages format
    lc_messages = convert_to_messages(user_messages)
    # Run the workflow graph
    answer = None
    async for chunk in graph.astream({"messages": lc_messages}):
        for node, update in chunk.items():
            if update["messages"]:
                last_msg = update["messages"][-1]
                if isinstance(last_msg, dict):
                    answer = last_msg.get("content", "")
                else:
                    answer = getattr(last_msg, "content", str(last_msg))
    CHAT_RESPONSES.inc()
    return JSONResponse({"answer": answer or "No answer generated."})

@app.websocket("/chat/ws")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    user_id = websocket.query_params.get("user_id", "anonymous")
    chat_history.setdefault(user_id, [])
    try:
        while True:
            data = await websocket.receive_text()
            chat_history[user_id].append({"role": "user", "content": data})
            # Integrate workflow logic
            user_messages = chat_history[user_id]
            lc_messages = convert_to_messages(user_messages)
            answer = None
            async for chunk in graph.astream({"messages": lc_messages}):
                for node, update in chunk.items():
                    if update["messages"]:
                        answer = update["messages"][-1].content
                        await websocket.send_text(answer)
    except WebSocketDisconnect:
        pass

@app.get("/health")
async def health():
    HEALTH_CHECKS.inc()
    return {"status": "ok"}

@app.get("/metrics")
async def metrics():
    return StreamingResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/history/{user_id}")
async def get_history(user_id: str):
    return {"history": chat_history.get(user_id, [])}

@app.post("/mcp/{tool_name}")
async def call_mcp_tool(tool_name: str, request: Request):
    payload = await request.json()
    mcp = MCPClient()
    result = await mcp.call_tool(tool_name, payload)
    return result

