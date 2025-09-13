from RawTriplet import RawTriplet
from RawEntity import RawEntity


from pydantic import BaseModel


from typing import List


class RawExtraction(BaseModel):
    entities: List[RawEntity]
    triplets: List[RawTriplet]