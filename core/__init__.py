"""
Core mathematical and data modules for the Veterinary Dosage & Infusion Auditor.
"""

from core.calculators import calculate_cri, calculate_bsa, precise_round
from core.database import SPECIES_K_FACTORS, SUPPORTED_DRUGS, COMPATIBILITY_MATRIX

__all__ = [
    "calculate_cri",
    "calculate_bsa",
    "precise_round",
    "SPECIES_K_FACTORS",
    "SUPPORTED_DRUGS",
    "COMPATIBILITY_MATRIX"
]
