# Enum for temporal labels describing time sensitivity
from enum import Enum


class TemporalType(str, Enum):
    ATEMPORAL = "ATEMPORAL"  # Facts that are always true (e.g., "Earth is a planet")
    STATIC = "STATIC"        # Facts about a single point in time (e.g., "Product X launched on Jan 1st")
    DYNAMIC = "DYNAMIC"      # Facts describing an ongoing state (e.g., "Lisa Su is the CEO")