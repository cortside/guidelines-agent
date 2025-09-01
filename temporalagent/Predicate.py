# Enum representing a fixed set of relationship predicates for graph consistency
from enum import Enum


class Predicate(str, Enum):
    # Each member of this Enum represents a specific type of relationship between entities
    IS_A = "IS_A"                # Represents an "is a" relationship (e.g., a Dog IS_A Animal)
    HAS_A = "HAS_A"              # Represents possession or composition (e.g., a Car HAS_A Engine)
    LOCATED_IN = "LOCATED_IN"    # Represents location relationship (e.g., Store LOCATED_IN City)
    HOLDS_ROLE = "HOLDS_ROLE"    # Represents role or position held (e.g., Person HOLDS_ROLE Manager)
    PRODUCES = "PRODUCES"        # Represents production or creation relationship
    SELLS = "SELLS"              # Represents selling relationship between entities
    LAUNCHED = "LAUNCHED"        # Represents launch events (e.g., Product LAUNCHED by Company)
    DEVELOPED = "DEVELOPED"      # Represents development relationship (e.g., Software DEVELOPED by Team)
    ADOPTED_BY = "ADOPTED_BY"    # Represents adoption relationship (e.g., Policy ADOPTED_BY Organization)
    INVESTS_IN = "INVESTS_IN"    # Represents investment relationships (e.g., Company INVESTS_IN Startup)
    COLLABORATES_WITH = "COLLABORATES_WITH"  # Represents collaboration between entities
    SUPPLIES = "SUPPLIES"        # Represents supplier relationship (e.g., Supplier SUPPLIES Parts)
    HAS_REVENUE = "HAS_REVENUE"  # Represents revenue relationship for entities
    INCREASED = "INCREASED"      # Represents an increase event or metric change
    DECREASED = "DECREASED"      # Represents a decrease event or metric change
    RESULTED_IN = "RESULTED_IN"  # Represents causal relationship (e.g., Event RESULTED_IN Outcome)
    TARGETS = "TARGETS"          # Represents target or goal relationship
    PART_OF = "PART_OF"          # Represents part-whole relationship (e.g., Wheel PART_OF Car)
    DISCONTINUED = "DISCONTINUED" # Represents discontinued status or event
    SECURED = "SECURED"          # Represents secured or obtained relationship (e.g., Funding SECURED by Company)