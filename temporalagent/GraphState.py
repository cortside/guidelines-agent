from temporalagent.Entity import Entity
from temporalagent.TemporalEvent import TemporalEvent
from temporalagent.Triplet import Triplet


from langchain_core.documents import Document


from typing import List, TypedDict


class GraphState(TypedDict):
    """
    TypedDict representing the overall state of the knowledge graph ingestion.

    Attributes:
        chunks: List of Document chunks being processed.
        temporal_events: List of TemporalEvent objects extracted from chunks.
        entities: List of Entity objects in the graph.
        triplets: List of Triplet objects representing relationships.
    """
    chunks: List[Document]
    temporal_events: List[TemporalEvent]
    entities: List[Entity]
    triplets: List[Triplet]