# Model representing an entity extracted by the LLM
from pydantic import BaseModel, Field


class RawEntity(BaseModel):
    entity_idx: int = Field(description="A temporary, 0-indexed ID for this entity.")
    name: str = Field(description="The name of the entity, e.g., 'AMD' or 'Lisa Su'.")
    type: str = Field("Unknown", description="The type of entity, e.g., 'Organization', 'Person'.")
    description: str = Field("", description="A brief description of the entity.")