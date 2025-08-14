import httpx
import os
import time
from typing import Any

class MCPClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("MCP_BASE_URL", "http://localhost:8001")
        self.client = httpx.AsyncClient()

    async def call_tool(self, tool_name: str, payload: dict, retries: int = 3, timeout: int = 10) -> Any:
        url = f"{self.base_url}/tools/{tool_name}"
        for attempt in range(retries):
            try:
                response = await self.client.post(url, json=payload, timeout=timeout)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                if attempt == retries - 1:
                    raise
                time.sleep(2 ** attempt)
