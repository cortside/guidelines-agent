# Enum for statement labels classifying statement nature
from enum import Enum


class StatementType(str, Enum):
    FACT = "FACT"            # An objective, verifiable claim
    OPINION = "OPINION"      # A subjective belief or judgment
    PREDICTION = "PREDICTION"  # A statement about a future event