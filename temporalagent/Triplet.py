from Predicate import Predicate


from pydantic import BaseModel, Field


import uuid


class Triplet(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique UUID for the triplet")
    subject_name: str = Field(..., description="Name of the subject entity")
    subject_id: uuid.UUID = Field(..., description="UUID of the subject entity")
    predicate: Predicate = Field(..., description="Relationship predicate")
    object_name: str = Field(..., description="Name of the object entity")
    object_id: uuid.UUID = Field(..., description="UUID of the object entity")
    value: str | None = Field(None, description="Optional value associated with the triplet")