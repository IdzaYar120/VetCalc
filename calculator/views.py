import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core import (
    calculate_cri, 
    calculate_bsa, 
    calculate_fluid_therapy,
    calculate_potassium,
    calculate_emergency_doses,
    SPECIES_K_FACTORS, 
    SUPPORTED_DRUGS, 
    COMPATIBILITY_MATRIX
)

def dashboard_view(request):
    """
    Відображає головну сторінку панелі керування.
    Передає список видів, ліків та матрицю сумісності в контекст шаблону.
    """
    context = {
        "species_list": list(SPECIES_K_FACTORS.keys()),
        "supported_drugs": SUPPORTED_DRUGS,
        "compatibility_matrix": COMPATIBILITY_MATRIX,
        "species_k_factors": SPECIES_K_FACTORS,
    }
    return render(request, "calculator/dashboard.html", context)

@csrf_exempt
def api_calculate_cri(request):
    """
    JSON API для розрахунку CRI (постійної інфузії).
    Приймає параметри у форматі JSON за допомогою запиту POST.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Дозволено лише запити POST."}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Вилучення та перевірка вхідних даних
        weight_kg = float(data.get("weight_kg", 0))
        bag_volume_ml = float(data.get("bag_volume_ml", 0))
        target_dose = float(data.get("target_dose", 0))
        target_dose_unit = data.get("target_dose_unit", "мкг/кг/хв")
        ampoule_conc_mg_ml = float(data.get("ampoule_conc_mg_ml", 0))
        drug_volume_added_ml = float(data.get("drug_volume_added_ml", 0))
        drip_factor = int(data.get("drip_factor", 20))
        
        # Обчислення через ядро
        results = calculate_cri(
            weight_kg=weight_kg,
            bag_volume_ml=bag_volume_ml,
            target_dose=target_dose,
            target_dose_unit=target_dose_unit,
            ampoule_conc_mg_ml=ampoule_conc_mg_ml,
            drug_volume_added_ml=drug_volume_added_ml,
            drip_factor=drip_factor
        )
        return JsonResponse(results)
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Помилка при розрахунку: {str(e)}"}, status=500)

@csrf_exempt
def api_calculate_bsa(request):
    """
    JSON API для розрахунку площі поверхні тіла (BSA) та дози.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Дозволено лише запити POST."}, status=405)
    
    try:
        data = json.loads(request.body)
        
        weight_kg = float(data.get("weight_kg", 0))
        species = data.get("species", "")
        target_dose_per_m2 = float(data.get("target_dose_per_m2", 0))
        
        results = calculate_bsa(
            weight_kg=weight_kg,
            species=species,
            target_dose_per_m2=target_dose_per_m2
        )
        return JsonResponse(results)
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Помилка при розрахунку BSA: {str(e)}"}, status=500)

@csrf_exempt
def api_audit_compatibility(request):
    """
    JSON API для аудиту сумісності суміші препаратів.
    Приймає список вибраних препаратів.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Дозволено лише запити POST."}, status=405)
        
    try:
        data = json.loads(request.body)
        selected_drugs = data.get("selected_drugs", [])
        
        if len(selected_drugs) < 2:
            return JsonResponse({
                "status": "Info",
                "message": "Виберіть щонайменше два препарати для аудиту сумісності.",
                "incompatibilities": []
            })
            
        incompatibilities = []
        for i in range(len(selected_drugs)):
            for j in range(i + 1, len(selected_drugs)):
                d1 = selected_drugs[i]
                d2 = selected_drugs[j]
                
                # Перехресний перевірка сумісності у базі даних
                audit = COMPATIBILITY_MATRIX.get(d1, {}).get(d2, {})
                if audit and audit.get("status") == "Несумісний":
                    incompatibilities.append({
                        "drug1": d1,
                        "drug2": d2,
                        "reason": audit.get("reason", "Невідома несумісність.")
                    })
                    
        if incompatibilities:
            return JsonResponse({
                "status": "Incompatible",
                "incompatibilities": incompatibilities
            })
        else:
            return JsonResponse({
                "status": "Compatible",
                "message": f"Суміш препаратів ({', '.join(selected_drugs)}) є хімічно та фізично сумісною за базовою матрицею."
            })
            
    except Exception as e:
        return JsonResponse({"error": f"Помилка при аудиті: {str(e)}"}, status=500)

@csrf_exempt
def api_calculate_fluid_therapy(request):
    """
    JSON API для розрахунку інфузійної терапії (відновлення дегідратації).
    """
    if request.method != "POST":
        return JsonResponse({"error": "Дозволено лише запити POST."}, status=405)
    
    try:
        data = json.loads(request.body)
        weight_kg = float(data.get("weight_kg", 0))
        dehydration_percent = float(data.get("dehydration_percent", 0))
        maintenance_rate_ml_kg_day = float(data.get("maintenance_rate_ml_kg_day", 50))
        ongoing_losses_ml_day = float(data.get("ongoing_losses_ml_day", 0))
        drip_factor = int(data.get("drip_factor", 20))
        
        results = calculate_fluid_therapy(
            weight_kg=weight_kg,
            dehydration_percent=dehydration_percent,
            maintenance_rate_ml_kg_day=maintenance_rate_ml_kg_day,
            ongoing_losses_ml_day=ongoing_losses_ml_day,
            drip_factor=drip_factor
        )
        
        # Забезпечуємо підтримку обох варіантів ключів (для повної сумісності)
        mapped = {
            "fluid_deficit_ml": results["fluid_deficit_ml"],
            "dehydration_deficit_ml": results["fluid_deficit_ml"],
            "maintenance_ml_day": results["maintenance_ml_day"],
            "total_volume_ml_day": results["total_volume_ml_day"],
            "total_fluid_required_ml_day": results["total_volume_ml_day"],
            "infusion_rate_ml_hr": results["infusion_rate_ml_hr"],
            "hourly_fluid_rate_ml_hr": results["infusion_rate_ml_hr"],
            "drops_per_minute": results["drops_per_minute"]
        }
        return JsonResponse(mapped)
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Помилка при розрахунку інфузійної терапії: {str(e)}"}, status=500)

@csrf_exempt
def api_calculate_potassium(request):
    """
    JSON API для розрахунку безпечного введення калію.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Дозволено лише запити POST."}, status=405)
    
    try:
        data = json.loads(request.body)
        weight_kg = float(data.get("weight_kg", 0))
        bag_volume_ml = float(data.get("bag_volume_ml", 0))
        infusion_rate_ml_hr = float(data.get("infusion_rate_ml_hr", 0))
        target_k_dose_meq_kg_hr = float(data.get("target_k_dose_meq_kg_hr", 0))
        k_ampoule_conc_meq_ml = float(data.get("k_ampoule_conc_meq_ml", 2.0))
        
        results = calculate_potassium(
            weight_kg=weight_kg,
            bag_volume_ml=bag_volume_ml,
            infusion_rate_ml_hr=infusion_rate_ml_hr,
            target_k_dose_meq_kg_hr=target_k_dose_meq_kg_hr,
            k_ampoule_conc_meq_ml=k_ampoule_conc_meq_ml
        )
        
        # Забезпечуємо підтримку обох варіантів ключів (для повної сумісності)
        mapped = {
            "hourly_k_meq_hr": results["hourly_k_meq_hr"],
            "hourly_k_delivered_meq_hr": results["hourly_k_meq_hr"],
            "k_concentration_meq_ml": results["k_concentration_meq_ml"],
            "required_k_concentration_meq_ml": results["k_concentration_meq_ml"],
            "total_k_needed_meq": results["total_k_needed_meq"],
            "total_k_needed_for_bag_meq": results["total_k_needed_meq"],
            "k_volume_added_ml": results["k_volume_added_ml"],
            "kcl_volume_to_add_ml": results["k_volume_added_ml"],
            "is_safe": results["is_safe"]
        }
        return JsonResponse(mapped)
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Помилка при розрахунку безпеки калію: {str(e)}"}, status=500)

@csrf_exempt
def api_calculate_emergency(request):
    """
    JSON API для розрахунку екстрених реанімаційних доз CPR.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Дозволено лише запити POST."}, status=405)
    
    try:
        data = json.loads(request.body)
        weight_kg = float(data.get("weight_kg", 0))
        
        results = calculate_emergency_doses(weight_kg=weight_kg)
        
        # Перетворюємо підтримувану структуру для фронтенду, щоб уникнути помилок key mismatch
        mapped_drugs = {}
        for drug_key, drug_data in results.items():
            mapped_drugs[drug_key] = {
                "dose_mg": drug_data["dose_mg"],
                "absolute_dose_mg": drug_data["dose_mg"],
                "volume_ml": drug_data["volume_ml"],
                "info": drug_data["info"],
                "safety_notes": drug_data["info"]
            }
            
        return JsonResponse({"emergency_drugs": mapped_drugs})
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Помилка при розрахунку екстрених доз: {str(e)}"}, status=500)

def pwa_manifest(request):
    """
    Повертає PWA manifest.json для встановлення застосунку.
    """
    return render(request, "calculator/manifest.json", content_type="application/json")

def pwa_service_worker(request):
    """
    Повертає Service Worker JS файл.
    """
    return render(request, "calculator/service-worker.js", content_type="application/javascript")

def pwa_logo(request):
    """
    Повертає SVG логотип для PWA.
    """
    return render(request, "calculator/vet_logo.svg", content_type="image/svg+xml")
