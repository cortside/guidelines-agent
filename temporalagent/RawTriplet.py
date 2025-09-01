from temporalagent.Predicate import Predicate


from pydantic import BaseModel, Field


class RawTriplet(BaseModel):
    subject_name: str
    subject_id: int = Field(description="The entity_idx of the subject.")
    predicate: Predicate
    object_name: str
    object_id: int = Field(description="The entity_idx of the object.")
    value: Optional[str] = Field(None, description="An optional value, e.g., '10%'.")