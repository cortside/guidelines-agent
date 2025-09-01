from temporalagent.TemporalType import TemporalType
from temporalagent.StatementType import StatementType


from pydantic import BaseModel, Field


import uuid
from datetime import datetime


class TemporalEvent(BaseModel):
    """
    The central model that consolidates all extracted information.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    chunk_id: uuid.UUID # To link back to the original text chunk
    statement: str
    embedding: list[float] = [] # For similarity checks later

    # Information from our previous extraction steps
    statement_type: StatementType
    temporal_type: TemporalType
    valid_at: datetime | None = None
    invalid_at: datetime | None = None

    # A list of the IDs of the triplets associated with this event
    triplets: list[uuid.UUID]

    # Extra metadata for tracking changes over time
    created_at: datetime = Field(default_factory=datetime.now)
    expired_at: datetime | None = None
    invalidated_by: uuid.UUID | None = None