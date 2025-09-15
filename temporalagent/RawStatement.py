# This model defines the structure for a single extracted statement
from StatementType import StatementType
from TemporalType import TemporalType


from pydantic import BaseModel


class RawStatement(BaseModel):
    statement: str
    statement_type: StatementType
    temporal_type: TemporalType