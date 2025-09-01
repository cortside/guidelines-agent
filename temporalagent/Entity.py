# Final persistent model for an entity in your knowledge graph
from pydantic import BaseModel, Field


import uuid


class Entity(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique UUID for the entity")
    name: str = Field(..., description="The name of the entity")
    type: str = Field(..., description="Entity type, e.g., 'Organization', 'Person'")
    description: str = Field("", description="Brief description of the entity")
    resolved_id: uuid.UUID | None = Field(None, description="UUID of resolved entity if merged")