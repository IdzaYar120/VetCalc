"""
Core mathematical and data modules for the Veterinary Dosage & Infusion Auditor.
"""

from core.calculators import (
    calculate_cri, 
    calculate_bsa, 
    precise_round,
    calculate_fluid_therapy,
    calculate_potassium,
    calculate_emergency_doses,
    calculate_bicarbonate,
    calculate_adjusted_calcium,
    calculate_plasma_osmolality,
    calculate_anesthesia_doses
)
from core.database import SPECIES_K_FACTORS, SUPPORTED_DRUGS, COMPATIBILITY_MATRIX

__all__ = [
    "calculate_cri",
    "calculate_bsa",
    "precise_round",
    "calculate_fluid_therapy",
    "calculate_potassium",
    "calculate_emergency_doses",
    "calculate_bicarbonate",
    "calculate_adjusted_calcium",
    "calculate_plasma_osmolality",
    "calculate_anesthesia_doses",
    "SPECIES_K_FACTORS",
    "SUPPORTED_DRUGS",
    "COMPATIBILITY_MATRIX"
]
