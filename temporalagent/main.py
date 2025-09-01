## https://github.com/FareedKhan-dev/temporal-ai-agent-pipeline?tab=readme-ov-file

# Import loader for Hugging Face datasets
from langchain_community.document_loaders import HuggingFaceDatasetLoader

from temporalagent.Entity import Entity
from temporalagent.GraphState import GraphState
from temporalagent.RawExtraction import RawExtraction
from temporalagent.RawStatementList import RawStatementList
from temporalagent.StatementType import StatementType
from temporalagent.TemporalEvent import TemporalEvent
from temporalagent.TemporalType import TemporalType
from temporalagent.Triplet import Triplet

# Dataset configuration
hf_dataset_name = "jlh-ibm/earnings_call"  # HF dataset name
subset_name = "transcripts"                # Dataset subset to load

# Create the loader (defaults to 'train' split)
loader = HuggingFaceDatasetLoader(
    path=hf_dataset_name,
    name=subset_name,
    page_content_column="transcript"  # Column containing the main text
)

# This is the key step. The loader processes the dataset and returns a list of LangChain Document objects.
documents = loader.load()

# Let's inspect the result to see the difference
print(f"Loaded {len(documents)} documents.")

# Count how many documents each company has
company_counts = {}

# Loop over all loaded documents
for doc in documents:
    company = doc.metadata.get("company")  # Extract company from metadata
    if company:
        company_counts[company] = company_counts.get(company, 0) + 1

# Display the counts
print("Total company counts:")
for company, count in company_counts.items():
    print(f" - {company}: {count}")

# Print metadata for two sample documents (index 0 and 33)
print("Metadata for document[0]:")
print(documents[0].metadata)

print("\nMetadata for document[33]:")
print(documents[33].metadata)

## Print the first 200 characters of the first document's content
#first_doc = documents[0]
#print(first_doc.page_content[:200])

# Calculate the average number of words per document
total_words = sum(len(doc.page_content.split()) for doc in documents)
average_words = total_words / len(documents) if documents else 0

print(f"Average number of words in documents: {average_words:.2f}")

import os
import re
from datetime import datetime

# Helper function to extract a quarter string (e.g., "Q1 2023") from text
def find_quarter(text: str) -> str | None:
    """Return the first quarter-year match found in the text, or None if absent."""
    # Match pattern: 'Q' followed by 1 digit, a space, and a 4-digit year
    match = re.findall(r"Q\d\s\d{4}", text)
    return match[0] if match else None

# Test on the first document
quarter = find_quarter(documents[0].page_content)
print(f"Extracted Quarter for the first document: {quarter}")

#from langchain_nebius import NebiusEmbeddings
from langchain_openai import OpenAIEmbeddings

# Set Nebius API key (⚠️ Avoid hardcoding secrets in production code)
#os.environ["NEBIUS_API_KEY"] = "key-gotes-here"

# 1. Initialize Nebius embedding model
#embeddings = NebiusEmbeddings(model="Qwen/Qwen3-Embedding-8B")
# embeddings = OpenAIEmbeddings(
#     model="text-embedding-3-small",
# )

embeddings = OpenAIEmbeddings(
    model="text-embedding-qwen3-embedding-0.6b",
    base_url="http://localhost:1234/v1",
    api_key=None, # Placeholder API key
    check_embedding_ctx_length=False
)

# Disable LangSmith tracing to avoid unnecessary overhead during chunking
os.environ["LANGSMITH_TRACING"] = "false"

from langchain_experimental.text_splitter import SemanticChunker

# Create a semantic chunker using percentile thresholding
langchain_semantic_chunker = SemanticChunker(
    embeddings,
    breakpoint_threshold_type="percentile",  # Use percentile-based splitting
    breakpoint_threshold_amount=95           # split at 95th percentile
)

# Store the new, smaller chunk documents
chunked_documents_lc = []

# Printing total number of docs (188) We already know that
#print(f"Processing {len(documents)} documents using LangChain's SemanticChunker...")

from tqdm import tqdm

# Chunk each transcript document
#docs_to_process = documents[:3]  # Uncomment for quick testing

# get documents where metadata company is "AMD"
docs_to_process = [doc for doc in documents if doc.metadata.get("company") == "AMD"]

#docs_to_process = documents  # Uncomment to process all documents

print(f"Processing {len(docs_to_process)} documents using LangChain's SemanticChunker...")
for doc in tqdm(docs_to_process, desc="Chunking Transcripts with LangChain"):
    # Extract quarter info and copy existing metadata
    quarter = find_quarter(doc.page_content)
    parent_metadata = doc.metadata.copy()
    parent_metadata["quarter"] = quarter

    # Perform semantic chunking (returns Document objects with metadata attached)
    chunks = langchain_semantic_chunker.create_documents(
        [doc.page_content],
        metadatas=[parent_metadata]
    )

    # Collect all chunks
    chunked_documents_lc.extend(chunks)

print(f"Total chunks created: {len(chunked_documents_lc)}")

# Analyze the results of the LangChain chunking process
original_doc_count = len(docs_to_process)
chunked_doc_count = len(chunked_documents_lc)

print(f"Original number of documents (transcripts): {original_doc_count}")
print(f"Number of new documents (chunks): {chunked_doc_count}")
print(f"Average chunks per transcript: {chunked_doc_count / original_doc_count:.2f}")

# Inspect the 11th chunk (index 10)
sample_chunk = chunked_documents_lc[10]
print("Sample Chunk Content (first 30 chars):")
print(sample_chunk.page_content[:30] + "...")

print("\nSample Chunk Metadata:")
print(sample_chunk.metadata)

# Calculate average word count per chunk
total_chunk_words = sum(len(doc.page_content.split()) for doc in chunked_documents_lc)
average_chunk_words = total_chunk_words / chunked_doc_count if chunked_documents_lc else 0

print(f"\nAverage number of words per chunk: {average_chunk_words:.2f}")


from pydantic import BaseModel, field_validator

# These definitions provide the necessary context for the LLM to understand the labels.
LABEL_DEFINITIONS: dict[str, dict[str, dict[str, str]]] = {
    "episode_labelling": {
        "FACT": dict(definition="Statements that are objective and can be independently verified or falsified through evidence."),
        "OPINION": dict(definition="Statements that contain personal opinions, feelings, values, or judgments that are not independently verifiable."),
        "PREDICTION": dict(definition="Uncertain statements about the future on something that might happen, a hypothetical outcome, unverified claims."),
    },
    "temporal_labelling": {
        "STATIC": dict(definition="Often past tense, think -ed verbs, describing single points-in-time."),
        "DYNAMIC": dict(definition="Often present tense, think -ing verbs, describing a period of time."),
        "ATEMPORAL": dict(definition="Statements that will always hold true regardless of time."),
    },
}

# Format label definitions into a clean string for prompt injection
definitions_text = ""

for section_key, section_dict in LABEL_DEFINITIONS.items():
    # Add a section header with underscores replaced by spaces and uppercased
    definitions_text += f"==== {section_key.replace('_', ' ').upper()} DEFINITIONS ====\n"
    
    # Add each category and its definition under the section
    for category, details in section_dict.items():
        definitions_text += f"- {category}: {details.get('definition', '')}\n"

from langchain_core.prompts import ChatPromptTemplate

# Define the prompt template for statement extraction and labeling
statement_extraction_prompt_template = """
You are an expert extracting atomic statements from text.

Inputs:
- main_entity: {main_entity}
- document_chunk: {document_chunk}

Tasks:
1. Extract clear, single-subject statements.
2. Label each as FACT, OPINION, or PREDICTION.
3. Label each temporally as STATIC, DYNAMIC, or ATEMPORAL.
4. Resolve references to main_entity and include dates/quantities.

Return ONLY a JSON object with the statements and labels.
"""

# Create a ChatPromptTemplate from the string template
prompt = ChatPromptTemplate.from_template(statement_extraction_prompt_template)

#from langchain_nebius import ChatNebius
import json

# Initialize our LLM
#llm = ChatNebius(model="deepseek-ai/DeepSeek-V3")
from langchain_openai import ChatOpenAI

# llm = ChatOpenAI(
#     model="gpt-4o-mini",
#     temperature=0,
#     max_retries=2,
# )

# Replace with your LM Studio server address and port
lm_studio_endpoint = "http://localhost:1234/v1" 

llm = ChatOpenAI(
    model="qwen/qwen3-8b",
    base_url=lm_studio_endpoint,
    api_key=None,  # LM Studio doesn't require an API key
)

# Create the chain: prompt -> LLM -> structured output parser
statement_extraction_chain = prompt | llm.with_structured_output(RawStatementList)

# Select the sample chunk we inspected earlier for testing extraction
sample_chunk_for_extraction = chunked_documents_lc[10]

print("--- Running statement extraction on a sample chunk ---")
print(f"Chunk Content:\n{sample_chunk_for_extraction.page_content}")
print("\nInvoking LLM for extraction...")

# Call the extraction chain with necessary inputs
extracted_statements_list = statement_extraction_chain.invoke({
    "main_entity": sample_chunk_for_extraction.metadata["company"],
    "publication_date": sample_chunk_for_extraction.metadata["date"].isoformat(),
    "document_chunk": sample_chunk_for_extraction.page_content,
    "definitions": definitions_text
})

print("\n--- Extraction Result ---")
# Pretty-print the output JSON from the model response
print(extracted_statements_list.model_dump_json(indent=2))

from datetime import datetime, timezone
from dateutil.parser import parse
import re

def parse_date_str(value: str | datetime | None) -> datetime | None:
    """
    Parse a string or datetime into a timezone-aware datetime object (UTC).
    Returns None if parsing fails or input is None.
    """
    if not value:
        return None

    # If already a datetime, ensure it has timezone info (UTC if missing)
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    try:
        # Handle year-only strings like "2023"
        if re.fullmatch(r"\d{4}", value.strip()):
            year = int(value.strip())
            return datetime(year, 1, 1, tzinfo=timezone.utc)

        # Parse more complex date strings with dateutil
        dt: datetime = parse(value)

        # Ensure timezone-aware, default to UTC if missing
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        return dt
    except Exception:
        return None
    
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

# Model for raw temporal range with date strings as ISO 8601
class RawTemporalRange(BaseModel):
    valid_at: str | None = Field(None, description="The start date/time in ISO 8601 format.")
    invalid_at: str | None = Field(None, description="The end date/time in ISO 8601 format.")

# Model for validated temporal range with datetime objects
class TemporalValidityRange(BaseModel):
    valid_at: datetime | None = None
    invalid_at: datetime | None = None

    # Validator to parse date strings into datetime objects before assignment
    @field_validator("valid_at", "invalid_at", mode="before")
    @classmethod
    def _parse_date_string(cls, value: str | datetime | None) -> datetime | None:
        return parse_date_str(value)
    
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

# Model for raw temporal range with date strings as ISO 8601
class RawTemporalRange(BaseModel):
    valid_at: str | None = Field(None, description="The start date/time in ISO 8601 format.")
    invalid_at: str | None = Field(None, description="The end date/time in ISO 8601 format.")

# Model for validated temporal range with datetime objects
class TemporalValidityRange(BaseModel):
    valid_at: datetime | None = None
    invalid_at: datetime | None = None

    # Validator to parse date strings into datetime objects before assignment
    @field_validator("valid_at", "invalid_at", mode="before")
    @classmethod
    def _parse_date_string(cls, value: str | datetime | None) -> datetime | None:
        return parse_date_str(value)
    
# Prompt guiding the LLM to extract temporal validity ranges from statements
date_extraction_prompt_template = """
You are a temporal information extraction specialist.

INPUTS:
- statement: "{statement}"
- statement_type: "{statement_type}"
- temporal_type: "{temporal_type}"
- publication_date: "{publication_date}"
- quarter: "{quarter}"

TASK:
- Analyze the statement and determine the temporal validity range (valid_at, invalid_at).
- Use the publication date as the reference point for relative expressions (e.g., "currently").
- If a relationship is ongoing or its end is not specified, `invalid_at` should be null.

GUIDANCE:
- For STATIC statements, `valid_at` is the date the event occurred, and `invalid_at` is null.
- For DYNAMIC statements, `valid_at` is when the state began, and `invalid_at` is when it ended.
- Return dates in ISO 8601 format (e.g., YYYY-MM-DDTHH:MM:SSZ).

**Output format**
Return ONLY a valid JSON object matching the schema for `RawTemporalRange`.
"""

# Create a LangChain prompt template from the string
date_extraction_prompt = ChatPromptTemplate.from_template(date_extraction_prompt_template)

# Reuse the existing LLM instance.
# Create a chain by connecting the date extraction prompt
# with the LLM configured to output structured RawTemporalRange objects.
date_extraction_chain = date_extraction_prompt | llm.with_structured_output(RawTemporalRange)

# Take the first extracted statement for date extraction testing
sample_statement = extracted_statements_list.statements[0]
chunk_metadata = sample_chunk_for_extraction.metadata

print(f"--- Running date extraction for statement ---")
print(f'Statement: "{sample_statement.statement}"')
print(f"Reference Publication Date: {chunk_metadata['date'].isoformat()}")

# Invoke the date extraction chain with relevant inputs
raw_temporal_range = date_extraction_chain.invoke({
    "statement": sample_statement.statement,
    "statement_type": sample_statement.statement_type.value,
    "temporal_type": sample_statement.temporal_type.value,
    "publication_date": chunk_metadata["date"].isoformat(),
    "quarter": chunk_metadata["quarter"]
})

# Parse and validate raw LLM output into a structured TemporalValidityRange model
final_temporal_range = TemporalValidityRange.model_validate(raw_temporal_range.model_dump())

print("\n--- Parsed & Validated Result ---")
print(f"Valid At: {final_temporal_range.valid_at}")
print(f"Invalid At: {final_temporal_range.invalid_at}")


from pydantic import BaseModel, Field
from typing import Optional

# Model representing a single subject-predicate-object triplet
# Container for all entities and triplets extracted from a single statement
# These definitions guide the LLM in choosing the correct predicate.
PREDICATE_DEFINITIONS = {
    "IS_A": "Denotes a class-or-type relationship (e.g., 'Model Y IS_A electric-SUV').",
    "HAS_A": "Denotes a part-whole relationship (e.g., 'Model Y HAS_A electric-engine').",
    "LOCATED_IN": "Specifies geographic or organisational containment.",
    "HOLDS_ROLE": "Connects a person to a formal office or title.",
}

# Format the predicate instructions into a string for the prompt.
predicate_instructions_text = "\n".join(f"- {pred}: {desc}" for pred, desc in PREDICATE_DEFINITIONS.items())

# Prompt for extracting entities and subject-predicate-object triplets from a statement
triplet_extraction_prompt_template = """
You are an information-extraction assistant.

Task: From the statement, identify all entities (people, organizations, products, concepts) and all triplets (subject, predicate, object) describing their relationships.

Statement: "{statement}"

Predicate list:
{predicate_instructions}

Guidelines:
- List entities with unique `entity_idx`.
- List triplets linking subjects and objects by `entity_idx`.
- Exclude temporal expressions from entities and triplets.

Example:
Statement: "Google's revenue increased by 10% from January through March."
Output: {{
  "entities": [
    {{"entity_idx": 0, "name": "Google", "type": "Organization", "description": "A multinational technology company."}},
    {{"entity_idx": 1, "name": "Revenue", "type": "Financial Metric", "description": "Income from normal business."}}
  ],
  "triplets": [
    {{"subject_name": "Google", "subject_id": 0, "predicate": "INCREASED", "object_name": "Revenue", "object_id": 1, "value": "10%"}}
  ]
}}

Return ONLY a valid JSON object matching `RawExtraction`.
"""

# Initializing the prompt template
triplet_extraction_prompt = ChatPromptTemplate.from_template(triplet_extraction_prompt_template)

# Create the chain for triplet and entity extraction.
triplet_extraction_chain = triplet_extraction_prompt | llm.with_structured_output(RawExtraction)

# Let's use the same statement we've been working with.
sample_statement_for_triplets = extracted_statements_list.statements[0]

print(f"--- Running triplet extraction for statement ---")
print(f'Statement: "{sample_statement_for_triplets.statement}"')

# Invoke the chain.
raw_extraction_result = triplet_extraction_chain.invoke({
    "statement": sample_statement_for_triplets.statement,
    "predicate_instructions": predicate_instructions_text
})

print("\n--- Triplet Extraction Result ---")
print(raw_extraction_result.model_dump_json(indent=2))

import uuid
from pydantic import BaseModel, Field

# Final persistent model for a triplet relationship
# Assume these are already defined from previous steps:
# sample_statement, final_temporal_range, raw_extraction_result

print("--- Assembling the final TemporalEvent ---")

# 1. Convert raw entities to persistent Entity objects with UUIDs
idx_to_entity_map: dict[int, Entity] = {}
final_entities: list[Entity] = []

for raw_entity in raw_extraction_result.entities:
    entity = Entity(
        name=raw_entity.name,
        type=raw_entity.type,
        description=raw_entity.description
    )
    idx_to_entity_map[raw_entity.entity_idx] = entity
    final_entities.append(entity)

print(f"Created {len(final_entities)} persistent Entity objects.")

# 2. Convert raw triplets to persistent Triplet objects, linking entities via UUIDs
final_triplets: list[Triplet] = []

for raw_triplet in raw_extraction_result.triplets:
    subject_entity = idx_to_entity_map[raw_triplet.subject_id]
    object_entity = idx_to_entity_map[raw_triplet.object_id]

    triplet = Triplet(
        subject_name=subject_entity.name,
        subject_id=subject_entity.id,
        predicate=raw_triplet.predicate,
        object_name=object_entity.name,
        object_id=object_entity.id,
        value=raw_triplet.value
    )
    final_triplets.append(triplet)

print(f"Created {len(final_triplets)} persistent Triplet objects.")

# 3. Create the final TemporalEvent object
# We'll generate a dummy chunk_id for this example.
temporal_event = TemporalEvent(
    chunk_id=uuid.uuid4(), # Placeholder ID
    statement=sample_statement.statement,
    statement_type=sample_statement.statement_type,
    temporal_type=sample_statement.temporal_type,
    valid_at=final_temporal_range.valid_at,
    invalid_at=final_temporal_range.invalid_at,
    triplets=[t.id for t in final_triplets]
)

print("\n--- Final Assembled TemporalEvent ---")
print(temporal_event.model_dump_json(indent=2))

print("\n--- Associated Entities ---")
for entity in final_entities:
    print(entity.model_dump_json(indent=2))

print("\n--- Associated Triplets ---")
for triplet in final_triplets:
    print(triplet.model_dump_json(indent=2))


def extract_events_from_chunks(state: GraphState) -> GraphState:
    chunks = state["chunks"]

    # Extract raw statements from each chunk
    raw_stmts = statement_extraction_chain.batch([{
        "main_entity": c.metadata["company"],
        "publication_date": c.metadata["date"].isoformat(),
        "document_chunk": c.page_content,
        "definitions": definitions_text
    } for c in chunks])

    # Flatten statements, attach metadata and unique chunk IDs
    stmts = [{"raw": s, "meta": chunks[i].metadata, "cid": uuid.uuid4()} 
             for i, rs in enumerate(raw_stmts) for s in rs.statements]

    # Prepare inputs and batch extract temporal data
    dates = date_extraction_chain.batch([{
        "statement": s["raw"].statement,
        "statement_type": s["raw"].statement_type.value,
        "temporal_type": s["raw"].temporal_type.value,
        "publication_date": s["meta"]["date"].isoformat(),
        "quarter": s["meta"]["quarter"]
    } for s in stmts])

    # Prepare inputs and batch extract triplets
    trips = triplet_extraction_chain.batch([{
        "statement": s["raw"].statement,
        "predicate_instructions": predicate_instructions_text
    } for s in stmts])

    events, entities, triplets = [], [], []

    for i, s in enumerate(stmts):
        # Validate temporal range data
        tr = TemporalValidityRange.model_validate(dates[i].model_dump())
        ext = trips[i]

        # Map entities by index and collect them
        idx_map = {e.entity_idx: Entity(name=e.name, type=e.type, description=e.description, resolved_id=None) for e in ext.entities}
        entities.extend(idx_map.values())

        # Build triplets only if subject and object entities exist
        tpls = [Triplet(
            subject_name=idx_map[t.subject_id].name,
            subject_id=idx_map[t.subject_id].id,
            predicate=t.predicate,
            object_name=idx_map[t.object_id].name,
            object_id=idx_map[t.object_id].id,
            value=t.value
        ) for t in ext.triplets if t.subject_id in idx_map and t.object_id in idx_map]
        triplets.extend(tpls)

        # Create TemporalEvent with linked triplet IDs
        events.append(TemporalEvent(
            chunk_id=s["cid"], statement=s["raw"].statement,
            statement_type=s["raw"].statement_type, temporal_type=s["raw"].temporal_type,
            valid_at=tr.valid_at, invalid_at=tr.invalid_at,
            triplets=[t.id for t in tpls]
        ))

    return {"chunks": chunks, "temporal_events": events, "entities": entities, "triplets": triplets}

from langgraph.graph import StateGraph, END

# # Define a new graph using our state
# workflow = StateGraph(GraphState)

# # Add our function as a node named "extract_events"
# workflow.add_node("extract_events", extract_events_from_chunks)

# # Define the starting point of the graph
# workflow.set_entry_point("extract_events")

# # Define the end point of the graph
# workflow.add_edge("extract_events", END)

# # Compile the graph into a runnable application
# app = workflow.compile()

# # The input is a dictionary matching our GraphState, providing the initial chunks
# graph_input = {"chunks": chunked_documents_lc}

# # Invoke the graph. This will run our entire extraction pipeline in one call.
# final_state = app.invoke(graph_input)

# # Check the number of objects created in the final state
# num_events = len(final_state['temporal_events'])
# num_entities = len(final_state['entities'])
# num_triplets = len(final_state['triplets'])

# print(f"Total TemporalEvents created: {num_events}")
# print(f"Total Entities created: {num_entities}")
# print(f"Total Triplets created: {num_triplets}")

# print("\n--- Sample TemporalEvent from the final state ---")
# # Print a sample event to see the fully assembled object
# print(final_state['temporal_events'][5].model_dump_json(indent=2))

import sqlite3

def setup_in_memory_db():
    """
    Sets up an in-memory SQLite database and creates the 'entities' table.

    The 'entities' table schema:
    - id: TEXT, Primary Key
    - name: TEXT, name of the entity
    - type: TEXT, type/category of the entity
    - description: TEXT, description of the entity
    - is_canonical: INTEGER, flag to indicate if entity is canonical (default 1)
    
    Returns:
        sqlite3.Connection: A connection object to the in-memory database.
    """
    # Establish connection to an in-memory SQLite database
    conn = sqlite3.connect(":memory:")

    # Create a cursor object to execute SQL commands
    cursor = conn.cursor()

    # Create the 'entities' table if it doesn't already exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            description TEXT,
            is_canonical INTEGER DEFAULT 1
        )
    """)

    # Commit changes to save the table schema
    conn.commit()

    # Return the connection object for further use
    return conn

# Create the database connection and set up the entities table
db_conn = setup_in_memory_db()

import string
from rapidfuzz import fuzz
from collections import defaultdict

def resolve_entities_in_state(state: GraphState) -> GraphState:
    """
    A LangGraph node to perform entity resolution on the extracted entities.
    """
    print("\n--- Entering Node: resolve_entities_in_state ---")
    entities = state["entities"]
    triplets = state["triplets"]
    
    cursor = db_conn.cursor()
    cursor.execute("SELECT id, name FROM entities WHERE is_canonical = 1")
    global_canonicals = {row[1]: uuid.UUID(row[0]) for row in cursor.fetchall()}
    
    print(f"Starting resolution with {len(entities)} entities. Found {len(global_canonicals)} canonicals in DB.")

    # Group entities by type (e.g., 'Person', 'Organization') for more accurate matching
    type_groups = defaultdict(list)
    for entity in entities:
        type_groups[entity.type].append(entity)

    resolved_id_map = {} # Maps an old entity ID to its new canonical ID
    newly_created_canonicals = {}

    for entity_type, group in type_groups.items():
        if not group: continue
        
        # Cluster entities in the group by fuzzy name matching
        clusters = []
        used_indices = set()
        for i in range(len(group)):
            if i in used_indices: continue
            current_cluster = [group[i]]
            used_indices.add(i)
            for j in range(i + 1, len(group)):
                if j in used_indices: continue
                # Use partial_ratio for flexible matching (e.g., "AMD" vs "Advanced Micro Devices, Inc.")
                score = fuzz.partial_ratio(group[i].name.lower(), group[j].name.lower())
                if score >= 80.0: # A similarity threshold of 80%
                    current_cluster.append(group[j])
                    used_indices.add(j)
            clusters.append(current_cluster)

        # For each cluster, find the best canonical representation (the "medoid")
        for cluster in clusters:
            scores = {e.name: sum(fuzz.ratio(e.name.lower(), other.name.lower()) for other in cluster) for e in cluster}
            medoid_entity = max(cluster, key=lambda e: scores[e.name])
            canonical_name = medoid_entity.name
            
            # Check if this canonical name already exists or was just created in this run
            if canonical_name in global_canonicals:
                canonical_id = global_canonicals[canonical_name]
            elif canonical_name in newly_created_canonicals:
                canonical_id = newly_created_canonicals[canonical_name].id
            else:
                # Create a new canonical entity
                canonical_id = medoid_entity.id
                newly_created_canonicals[canonical_name] = medoid_entity
            
            # Map all entities in this cluster to the single canonical ID
            for entity in cluster:
                entity.resolved_id = canonical_id
                resolved_id_map[entity.id] = canonical_id

    # Update the triplets in our state to use the new canonical IDs
    for triplet in triplets:
        if triplet.subject_id in resolved_id_map:
            triplet.subject_id = resolved_id_map[triplet.subject_id]
        if triplet.object_id in resolved_id_map:
            triplet.object_id = resolved_id_map[triplet.object_id]

    # Add any newly created canonical entities to our database
    if newly_created_canonicals:
        print(f"Adding {len(newly_created_canonicals)} new canonical entities to the DB.")
        new_data = [(str(e.id), e.name, e.type, e.description, 1) for e in newly_created_canonicals.values()]
        cursor.executemany("INSERT INTO entities (id, name, type, description, is_canonical) VALUES (?, ?, ?, ?, ?)", new_data)
        db_conn.commit()

    print("Entity resolution complete.")
    return state

# # Re-define the graph to include the new node
# workflow = StateGraph(GraphState)

# # Add our two nodes to the graph
# workflow.add_node("extract_events", extract_events_from_chunks)
# workflow.add_node("resolve_entities", resolve_entities_in_state)

# # Define the new sequence of steps
# workflow.set_entry_point("extract_events")
# workflow.add_edge("extract_events", "resolve_entities")
# workflow.add_edge("resolve_entities", END)

# # Compile the updated workflow
# app_with_resolution = workflow.compile()

# # Use the same input as before
# graph_input = {"chunks": chunked_documents_lc}

# # Invoke the new graph
# final_state_with_resolution = app_with_resolution.invoke(graph_input)

# # Find a sample entity that has been resolved (i.e., has a resolved_id)
# sample_resolved_entity = next((e for e in final_state_with_resolution['entities'] if e.resolved_id is not None and e.id != e.resolved_id), None)

# if sample_resolved_entity:
#     print("\n--- Sample of a Resolved Entity ---")
#     print(sample_resolved_entity.model_dump_json(indent=2))
# else:
#     print("\nNo sample resolved entity found (all entities were unique in this small run).")
    
# # Check a triplet to see its updated canonical IDs
# sample_resolved_triplet = final_state_with_resolution['triplets'][0]
# print("\n--- Sample Triplet with Resolved IDs ---")
# print(sample_resolved_triplet.model_dump_json(indent=2))

# Obtain a cursor from the existing database connection
cursor = db_conn.cursor()

# Create the 'events' table to store event-related data
cursor.execute("""
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,         -- Unique identifier for each event
    chunk_id TEXT,               -- Identifier for the chunk this event belongs to
    statement TEXT,              -- Textual representation of the event
    statement_type TEXT,         -- Type/category of the statement (e.g., assertion, question)
    temporal_type TEXT,          -- Temporal classification (e.g., past, present, future)
    valid_at TEXT,               -- Timestamp when the event becomes valid
    invalid_at TEXT,             -- Timestamp when the event becomes invalid
    embedding BLOB               -- Optional embedding data stored as binary (e.g., vector)
)
""")

# Create the 'triplets' table to store relations between entities for events
cursor.execute("""
CREATE TABLE IF NOT EXISTS triplets (
    id TEXT PRIMARY KEY,         -- Unique identifier for each triplet
    event_id TEXT,               -- Foreign key referencing 'events.id'
    subject_id TEXT,             -- Subject entity ID in the triplet
    predicate TEXT               -- Predicate describing relation or action
)
""")

# Commit all changes to the in-memory database
db_conn.commit()

# This prompt asks the LLM to act as a referee between two events.
event_invalidation_prompt_template = """
Task: Analyze the primary event against the secondary event and determine if the primary event is invalidated by the secondary event.
Return "True" if the primary event is invalidated, otherwise return "False".

Invalidation Guidelines:
1. An event can only be invalidated if it is DYNAMIC and its `invalid_at` is currently null.
2. A STATIC event (e.g., "X was hired on date Y") can invalidate a DYNAMIC event (e.g., "Z is the current employee").
3. Invalidation must be a direct contradiction. For example, "Lisa Su is CEO" is contradicted by "Someone else is CEO".
4. The invalidating event (secondary) must occur at or after the start of the primary event.

---
Primary Event (the one that might be invalidated):
- Statement: {primary_statement}
- Type: {primary_temporal_type}
- Valid From: {primary_valid_at}
- Valid To: {primary_invalid_at}

Secondary Event (the new fact that might cause invalidation):
- Statement: {secondary_statement}
- Type: {secondary_temporal_type}
- Valid From: {secondary_valid_at}
---

Is the primary event invalidated by the secondary event? Answer with only "True" or "False".
"""

invalidation_prompt = ChatPromptTemplate.from_template(event_invalidation_prompt_template)

# This chain will output a simple string: "True" or "False".
invalidation_chain = invalidation_prompt | llm

from scipy.spatial.distance import cosine

def invalidate_events_in_state(state: GraphState) -> GraphState:
    """Mark dynamic events invalidated by later similar facts."""
    events = state["temporal_events"]
    
    # Embed all event statements
    embeds = embeddings.embed_documents([e.statement for e in events])
    for e, emb in zip(events, embeds):
        e.embedding = emb

    updates = {}
    for i, e1 in enumerate(events):
        # Skip non-dynamic or already invalidated events
        if e1.temporal_type != TemporalType.DYNAMIC or e1.invalid_at:
            continue
        
        # Find candidate events: facts starting at or after e1 with high similarity
        cands = [
            e2 for j, e2 in enumerate(events) if j != i and
            e2.statement_type == StatementType.FACT and e2.valid_at and e1.valid_at and
            e2.valid_at >= e1.valid_at and 1 - cosine(e1.embedding, e2.embedding) > 0.5
        ]
        if not cands:
            continue

        # Prepare inputs for LLM invalidation check
        inputs = [{
            "primary_statement": e1.statement, "primary_temporal_type": e1.temporal_type.value,
            "primary_valid_at": e1.valid_at.isoformat(), "primary_invalid_at": "None",
            "secondary_statement": c.statement, "secondary_temporal_type": c.temporal_type.value,
            "secondary_valid_at": c.valid_at.isoformat()
        } for c in cands]

        # Ask LLM which candidates invalidate the event
        results = invalidation_chain.batch(inputs)
        
        # Record earliest invalidation info
        for c, r in zip(cands, results):
            if r.content.strip().lower() == "true" and (e1.id not in updates or c.valid_at < updates[e1.id]["invalid_at"]):
                updates[e1.id] = {"invalid_at": c.valid_at, "invalidated_by": c.id}

    # Apply invalidations to events
    for e in events:
        if e.id in updates:
            e.invalid_at = updates[e.id]["invalid_at"]
            e.invalidated_by = updates[e.id]["invalidated_by"]

    return state

# Re-define the graph to include all three nodes
workflow = StateGraph(GraphState)

workflow.add_node("extract_events", extract_events_from_chunks)
workflow.add_node("resolve_entities", resolve_entities_in_state)
workflow.add_node("invalidate_events", invalidate_events_in_state)

# Define the complete pipeline flow
workflow.set_entry_point("extract_events")
workflow.add_edge("extract_events", "resolve_entities")
workflow.add_edge("resolve_entities", "invalidate_events")
workflow.add_edge("invalidate_events", END)

# Compile the final ingestion workflow
ingestion_app = workflow.compile()

# Use the same input as before
graph_input = {"chunks": chunked_documents_lc}

# Invoke the final graph
final_ingested_state = ingestion_app.invoke(graph_input)
print("\n--- Full graph execution with invalidation complete ---")

# Find and print an invalidated event from the final state
invalidated_event = next((e for e in final_ingested_state['temporal_events'] if e.invalidated_by is not None), None)

if invalidated_event:
    print("\n--- Sample of an Invalidated Event ---")
    print(invalidated_event.model_dump_json(indent=2))
    
    # Find the event that caused the invalidation
    invalidating_event = next((e for e in final_ingested_state['temporal_events'] if e.id == invalidated_event.invalidated_by), None)
    
    if invalidating_event:
        print("\n--- Was Invalidated By this Event ---")
        print(invalidating_event.model_dump_json(indent=2))
else:
    print("\nNo invalidated events were found in this run.")

import networkx as nx
import uuid

def build_graph_from_state(state: GraphState) -> nx.MultiDiGraph:
    """
    Builds a NetworkX graph from the final state of our ingestion pipeline.
    """
    print("--- Building Knowledge Graph from final state ---")
    
    entities = state["entities"]
    triplets = state["triplets"]
    temporal_events = state["temporal_events"]
    
    # Create a quick-lookup map from an entity's ID to the entity object itself
    entity_map = {entity.id: entity for entity in entities}
    
    graph = nx.MultiDiGraph() # A directed graph that allows multiple edges
    
    # 1. Add a node for each unique, canonical entity
    canonical_ids = {e.resolved_id if e.resolved_id else e.id for e in entities}
    for canonical_id in canonical_ids:
        # Find the entity object that represents this canonical ID
        canonical_entity_obj = entity_map.get(canonical_id)
        if canonical_entity_obj:
            graph.add_node(
                str(canonical_id), # Node names in NetworkX are typically strings
                name=canonical_entity_obj.name,
                type=canonical_entity_obj.type,
                description=canonical_entity_obj.description
            )
            
    print(f"Added {graph.number_of_nodes()} canonical entity nodes to the graph.")

    # 2. Add an edge for each triplet, decorated with temporal info
    edges_added = 0
    event_map = {event.id: event for event in temporal_events}
    for triplet in triplets:
        # Find the parent event that this triplet belongs to
        parent_event = next((ev for ev in temporal_events if triplet.id in ev.triplets), None)
        if not parent_event: continue
            
        # Get the canonical IDs for the subject and object
        subject_canonical_id = str(triplet.subject_id)
        object_canonical_id = str(triplet.object_id)
        
        # Add the edge to the graph
        if graph.has_node(subject_canonical_id) and graph.has_node(object_canonical_id):
            edge_attrs = {
                "predicate": triplet.predicate.value, "value": triplet.value,
                "statement": parent_event.statement, "valid_at": parent_event.valid_at,
                "invalid_at": parent_event.invalid_at,
                "statement_type": parent_event.statement_type.value
            }
            graph.add_edge(
                subject_canonical_id, object_canonical_id,
                key=triplet.predicate.value, **edge_attrs
            )
            edges_added += 1

    print(f"Added {edges_added} edges (relationships) to the graph.")
    return graph

# Let's build the graph from the state we got from our LangGraph app
knowledge_graph = build_graph_from_state(final_ingested_state)

print(f"Graph has {knowledge_graph.number_of_nodes()} nodes and {knowledge_graph.number_of_edges()} edges.")

# Let's find the node for "AMD" by searching its 'name' attribute
amd_node_id = None
for node, data in knowledge_graph.nodes(data=True):
    if data.get('name', '').lower() == 'amd':
        amd_node_id = node
        break

if amd_node_id:
    print("\n--- Inspecting the 'AMD' node ---")
    print(f"Attributes: {knowledge_graph.nodes[amd_node_id]}")
    
    print("\n--- Sample Outgoing Edges from 'AMD' ---")
    for i, (u, v, data) in enumerate(knowledge_graph.out_edges(amd_node_id, data=True)):
        if i >= 3: break # Show the first 3 for brevity
        object_name = knowledge_graph.nodes[v]['name']
        print(f"Edge {i+1}: AMD --[{data['predicate']}]--> {object_name} (Valid From: {data['valid_at'].date()})")
else:
    print("Could not find a node for 'AMD'.")

import matplotlib.pyplot as plt

# Find the 15 most connected nodes to visualize
degrees = dict(knowledge_graph.degree())
top_nodes = sorted(degrees, key=degrees.get, reverse=True)[:15]

# Create a smaller graph containing only these top nodes
subgraph = knowledge_graph.subgraph(top_nodes)

# Draw the graph
plt.figure(figsize=(12, 12))
pos = nx.spring_layout(subgraph, k=0.8, iterations=50)
labels = {node: data['name'] for node, data in subgraph.nodes(data=True)}
nx.draw(subgraph, pos, labels=labels, with_labels=True, node_color='skyblue', 
        node_size=2500, edge_color='#666666', font_size=10)
plt.title("Subgraph of Top 15 Most Connected Entities", size=16)
#plt.show()
plt.savefig("knowledge_graph.png")

