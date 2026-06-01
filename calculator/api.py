from typing import List, Optional
from ninja import Schema, NinjaAPI
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from datetime import datetime
from .models import ArchiveRecord

from core import (
    calculate_cri, 
    calculate_bsa, 
    calculate_fluid_therapy,
    calculate_potassium,
    calculate_emergency_doses,
    calculate_bicarbonate,
    calculate_adjusted_calcium,
    calculate_plasma_osmolality,
    calculate_anesthesia_doses,
    calculate_transfusion,
    COMPATIBILITY_MATRIX
)
from pydantic import Field

# Inicitalize Ninja API
api = NinjaAPI(title="VetCalc Professional API")

def rate_limit(func):
    return ratelimit(key='ip', rate='60/m', block=True)(func)

# --------- SCHEMAS ---------

class CriInput(Schema):
    weight_kg: float = Field(..., gt=0)
    bag_volume_ml: float = Field(..., gt=0)
    target_dose: float = Field(..., gt=0)
    target_dose_unit: str = "мкг/кг/хв"
    ampoule_conc_mg_ml: float = Field(..., gt=0)
    drug_volume_added_ml: float = Field(..., gt=0)
    drip_factor: int = 20

class BsaInput(Schema):
    weight_kg: float = Field(..., gt=0)
    species: str
    target_dose_per_m2: float = Field(..., gt=0)

class CompatibilityInput(Schema):
    selected_drugs: List[str]

class FluidInput(Schema):
    weight_kg: float = Field(..., gt=0)
    dehydration_percent: float = Field(0, ge=0)
    maintenance_rate_ml_kg_day: float = Field(50, gt=0)
    ongoing_losses_ml_day: float = Field(0, ge=0)
    drip_factor: int = 20

class PotassiumInput(Schema):
    weight_kg: float = Field(..., gt=0)
    bag_volume_ml: float = Field(..., gt=0)
    infusion_rate_ml_hr: float = Field(..., gt=0)
    target_k_dose_meq_kg_hr: float = Field(..., gt=0)
    k_ampoule_conc_meq_ml: float = Field(2.0, gt=0)

class EmergencyInput(Schema):
    weight_kg: float = Field(..., gt=0)

class BicarbonateInput(Schema):
    weight_kg: float = Field(..., gt=0)
    input_type: str = "base_deficit"
    input_value: float

class CalciumInput(Schema):
    species: str = "Собака"
    total_calcium: float = Field(..., gt=0)
    albumin: float = Field(..., gt=0)

class OsmolalityInput(Schema):
    sodium: float = Field(..., gt=0)
    glucose: float = Field(..., ge=0)
    glucose_unit: str = "ммоль/л"
    bun: float = Field(..., ge=0)
    bun_unit: str = "ммоль/л"

class AnesthesiaInput(Schema):
    weight_kg: float = Field(..., gt=0)
    species: str = "Собака"
    premedicated: bool = False

class TransfusionInput(Schema):
    weight_kg: float = Field(..., gt=0)
    species: str = "Собака"
    patient_ht: float = Field(..., ge=0, lt=100)
    target_ht: float = Field(..., ge=0, lt=100)
    donor_ht: float = Field(..., gt=0, lt=100)
    blood_volume_factor: float = Field(90.0, gt=0)

class LoginInput(Schema):
    username: str
    password: str

class SyncRecordInput(Schema):
    id: int
    patient_name: str
    owner_name: Optional[str] = ""
    ward_box: Optional[str] = ""
    notes: Optional[str] = ""
    calculator_type: str
    weight: Optional[float] = None
    species: Optional[str] = ""
    inputs: Optional[dict] = {}
    results: Optional[dict] = {}
    audit: Optional[str] = ""
    timestamp: str

class SyncPayloadInput(Schema):
    records: List[SyncRecordInput]

# --------- ENDPOINTS ---------

@api.post("/calculate-cri/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_cri(request, data: CriInput):
    results = calculate_cri(
        weight_kg=data.weight_kg,
        bag_volume_ml=data.bag_volume_ml,
        target_dose=data.target_dose,
        target_dose_unit=data.target_dose_unit,
        ampoule_conc_mg_ml=data.ampoule_conc_mg_ml,
        drug_volume_added_ml=data.drug_volume_added_ml,
        drip_factor=data.drip_factor
    )
    return results

@api.post("/calculate-bsa/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_bsa(request, data: BsaInput):
    results = calculate_bsa(
        weight_kg=data.weight_kg,
        species=data.species,
        target_dose_per_m2=data.target_dose_per_m2
    )
    return results

@api.post("/audit-compatibility/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_audit_compatibility(request, data: CompatibilityInput):
    if len(data.selected_drugs) < 2:
        return {
            "status": "Info",
            "message": "Виберіть щонайменше два препарати для аудиту сумісності.",
            "incompatibilities": []
        }
        
    incompatibilities = []
    for i in range(len(data.selected_drugs)):
        for j in range(i + 1, len(data.selected_drugs)):
            d1 = data.selected_drugs[i]
            d2 = data.selected_drugs[j]
            
            audit = COMPATIBILITY_MATRIX.get(d1, {}).get(d2, {})
            if audit and audit.get("status") == "Несумісний":
                incompatibilities.append({
                    "drug1": d1,
                    "drug2": d2,
                    "reason": audit.get("reason", "Невідома несумісність.")
                })
                
    if incompatibilities:
        return {
            "status": "Incompatible",
            "incompatibilities": incompatibilities
        }
    else:
        return {
            "status": "Compatible",
            "message": f"Суміш препаратів ({', '.join(data.selected_drugs)}) є хімічно та фізично сумісною за базовою матрицею."
        }

@api.post("/calculate-fluid-therapy/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_fluid_therapy(request, data: FluidInput):
    results = calculate_fluid_therapy(
        weight_kg=data.weight_kg,
        dehydration_percent=data.dehydration_percent,
        maintenance_rate_ml_kg_day=data.maintenance_rate_ml_kg_day,
        ongoing_losses_ml_day=data.ongoing_losses_ml_day,
        drip_factor=data.drip_factor
    )
    # Ensure backwards compatible keys
    results["dehydration_deficit_ml"] = results["fluid_deficit_ml"]
    results["total_fluid_required_ml_day"] = results["total_volume_ml_day"]
    results["hourly_fluid_rate_ml_hr"] = results["infusion_rate_ml_hr"]
    return results

@api.post("/calculate-potassium/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_potassium(request, data: PotassiumInput):
    results = calculate_potassium(
        weight_kg=data.weight_kg,
        bag_volume_ml=data.bag_volume_ml,
        infusion_rate_ml_hr=data.infusion_rate_ml_hr,
        target_k_dose_meq_kg_hr=data.target_k_dose_meq_kg_hr,
        k_ampoule_conc_meq_ml=data.k_ampoule_conc_meq_ml
    )
    # Ensure backwards compatible keys
    results["hourly_k_delivered_meq_hr"] = results["hourly_k_meq_hr"]
    results["required_k_concentration_meq_ml"] = results["k_concentration_meq_ml"]
    results["total_k_needed_for_bag_meq"] = results["total_k_needed_meq"]
    results["kcl_volume_to_add_ml"] = results["k_volume_added_ml"]
    return results

@api.post("/calculate-emergency/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_emergency(request, data: EmergencyInput):
    results = calculate_emergency_doses(weight_kg=data.weight_kg)
    mapped_drugs = {}
    for drug_key, drug_data in results.items():
        mapped_drugs[drug_key] = {
            "dose_mg": drug_data["dose_mg"],
            "absolute_dose_mg": drug_data["dose_mg"],
            "volume_ml": drug_data["volume_ml"],
            "info": drug_data["info"],
            "safety_notes": drug_data["info"]
        }
    return {"emergency_drugs": mapped_drugs}

@api.post("/calculate-bicarbonate/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_bicarbonate(request, data: BicarbonateInput):
    results = calculate_bicarbonate(
        weight_kg=data.weight_kg,
        input_type=data.input_type,
        input_value=data.input_value
    )
    return results

@api.post("/calculate-adjusted-calcium/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_adjusted_calcium(request, data: CalciumInput):
    results = calculate_adjusted_calcium(
        species=data.species,
        total_calcium=data.total_calcium,
        albumin=data.albumin
    )
    return results

@api.post("/calculate-plasma-osmolality/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_plasma_osmolality(request, data: OsmolalityInput):
    results = calculate_plasma_osmolality(
        sodium=data.sodium,
        glucose=data.glucose,
        glucose_unit=data.glucose_unit,
        bun=data.bun,
        bun_unit=data.bun_unit
    )
    return results

@api.post("/calculate-anesthesia/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_anesthesia(request, data: AnesthesiaInput):
    results = calculate_anesthesia_doses(
        weight_kg=data.weight_kg,
        species=data.species,
        premedicated=data.premedicated
    )
    return results

@api.post("/calculate-transfusion/")
@ratelimit(key='ip', rate='60/m', block=True)
def api_calculate_transfusion(request, data: TransfusionInput):
    results = calculate_transfusion(
        weight_kg=data.weight_kg,
        species=data.species,
        patient_ht=data.patient_ht,
        target_ht=data.target_ht,
        donor_ht=data.donor_ht,
        blood_volume_factor=data.blood_volume_factor
    )
    return results

@api.post("/auth/login/")
@ratelimit(key='ip', rate='10/m', block=True)
def api_login(request, data: LoginInput):
    user = authenticate(request, username=data.username, password=data.password)
    if user is not None:
        auth_login(request, user)
        return {"status": "success", "username": user.username}
    return api.create_response(request, {"status": "error", "message": "Невірний логін або пароль"}, status=401)

@api.post("/auth/logout/")
def api_logout(request):
    auth_logout(request)
    return {"status": "success"}

@api.get("/auth/status/")
def api_auth_status(request):
    if request.user.is_authenticated:
        return {"authenticated": True, "username": request.user.username}
    return {"authenticated": False}

@api.post("/archive/sync/")
def api_sync_archive(request, data: SyncPayloadInput):
    if not request.user.is_authenticated:
        return api.create_response(request, {"status": "error", "message": "Необхідна авторизація"}, status=401)
    
    synced_ids = []
    for rec in data.records:
        try:
            dt = datetime.fromisoformat(rec.timestamp.replace('Z', '+00:00'))
        except:
            dt = datetime.now()
            
        ArchiveRecord.objects.update_or_create(
            user=request.user,
            local_id=rec.id,
            defaults={
                'patient_name': rec.patient_name,
                'owner_name': rec.owner_name,
                'ward_box': rec.ward_box,
                'notes': rec.notes,
                'calculator_type': rec.calculator_type,
                'weight': rec.weight,
                'species': rec.species,
                'inputs': rec.inputs,
                'results': rec.results,
                'audit': rec.audit,
                'timestamp': dt
            }
        )
        synced_ids.append(rec.id)
    return {"status": "success", "synced_ids": synced_ids}

@api.get("/archive/")
def api_get_archive(request):
    if not request.user.is_authenticated:
        return api.create_response(request, {"status": "error", "message": "Необхідна авторизація"}, status=401)
    
    records = ArchiveRecord.objects.filter(user=request.user).values()
    return {"status": "success", "records": list(records)}

