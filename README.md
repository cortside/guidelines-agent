# guidelines-agent

## Setup

1. Install Python 3.8 or newer.

2. (Recommended) Create and activate a virtual environment:

   ```pwsh
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install dependencies:

   ```pwsh
   pip install -r requirements.txt
   ```

## Running the Agent

1. Set your OpenAI API key when prompted.

2. Run the agent script:

   ```pwsh
   python main.py
   ```

## Description

This agent loads and processes web documents using LangChain and related libraries. Make sure your environment has internet access for document loading.

## Requirements

- Python 3.8+
- See `requirements.txt` for required packages.

Based on example from LangGraph docs:

- <https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_agentic_rag/>
