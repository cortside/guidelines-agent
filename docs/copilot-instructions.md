# Copilot Instructions for guidelines-agent and chatbot

## Overview
This codebase implements an agent that answers questions about REST API and architecture guidelines by retrieving and summarizing content from markdown documents hosted on GitHub. It uses LangChain, LangGraph, and OpenAI models for retrieval, grading, rewriting, and answering user queries.

You are working in a 2-repo project:
- `agent` – Python 3.11 FastAPI agent that connects to an MCP server over HTTP
- `chatbot` – React 19 + TypeScript chat UI

## Main Components
- **main.py**: Main entry point. Loads documents, splits text, creates a vector store, sets up a retriever tool, and defines a workflow for question answering.
- **requirements.txt**: Lists all required Python packages.
- **README.md**: Setup and usage instructions.

## Key Libraries
- `langchain_community.document_loaders.WebBaseLoader`: Loads web documents (markdown from GitHub).
- `langchain_text_splitters.RecursiveCharacterTextSplitter`: Splits documents into chunks for embedding.
- `langchain_core.vectorstores.InMemoryVectorStore`: Stores document embeddings in memory.
- `langchain_openai.OpenAIEmbeddings`: Generates embeddings using OpenAI.
- `langchain.tools.retriever.create_retriever_tool`: Wraps the retriever for use in the workflow.
- `langgraph.graph`: Manages the workflow graph and state transitions.
- `langchain.chat_models.init_chat_model`: Initializes the OpenAI chat model.

## Workflow Logic
1. **Document Loading**: Loads markdown files from GitHub URLs.
2. **Text Splitting**: Splits documents into manageable chunks for embedding.
3. **Vector Store**: Embeds and stores document chunks for retrieval.
4. **Retriever Tool**: Enables semantic search over the guidelines.
5. **Workflow Graph**: Orchestrates the agent's decision-making:
   - Decides whether to retrieve information or answer directly.
   - Grades retrieved documents for relevance.
   - Optionally rewrites the user question for better retrieval.
   - Generates concise answers using retrieved context.

## Maintenance Guidelines
- **Add/Remove Guidelines**: Update the `urls` list in `main.py` to change the set of documents.
- **Dependencies**: Update `requirements.txt` when adding/removing libraries. Run `pip install -r requirements.txt` after changes.
- **Virtual Environment**: Use a Python virtual environment for isolation.
- **API Keys**: The agent prompts for the OpenAI API key if not set in the environment.
- **Error Handling**: Ensure all imports are valid and required packages are installed. Check for changes in LangChain/LangGraph APIs.
- **Extending Functionality**: Add new tools, prompts, or workflow nodes as needed. Follow the existing modular structure for new features.

## Best Practices
- Keep import statements at the top of files.
- Use clear, descriptive docstrings for all functions and classes.
- Modularize code for readability and maintainability.
- Document any workflow changes in this file and the README.

## Troubleshooting
- If you encounter missing module errors, check `requirements.txt` and install dependencies.
- For API changes, refer to the official documentation for LangChain, LangGraph, and OpenAI.
- For document loading issues, verify the URLs and network connectivity.

