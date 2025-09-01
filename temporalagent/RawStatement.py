# This model defines the structure for a single extracted statement
from temporalagent.StatementType import StatementType
from temporalagent.TemporalType import TemporalType


from pydantic import BaseModel


class RawStatement(BaseModel):
    statement: str
    statement_type: StatementType
    temporal_type: TemporalType