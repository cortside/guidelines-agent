# This model is a container for the list of statements from one chunk
from RawStatement import RawStatement


from pydantic import BaseModel


class RawStatementList(BaseModel):
    statements: list[RawStatement]