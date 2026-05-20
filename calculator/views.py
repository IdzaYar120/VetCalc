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
        return JsonResponse(results)
        
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
        return JsonResponse(results)
        
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
        return JsonResponse(results)
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Помилка при розрахунку екстрених доз: {str(e)}"}, status=500)
