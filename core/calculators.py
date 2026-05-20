"""
Модуль розрахунків для ветеринарного аудитора дозування та інфузій.
Реалізує формули CRI (постійної інфузії) та BSA (площі поверхні тіла) 
з використанням високоточних обчислень Decimal та округлення ROUND_HALF_UP.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Union
from core.database import SPECIES_K_FACTORS

def precise_round(value: Union[float, Decimal, str]) -> Decimal:
    """
    Округляє значення строго до 2 десяткових знаків за допомогою ROUND_HALF_UP.
    Це запобігає похибкам двійкового представлення з рухомою комою в Python.
    """
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def calculate_cri(
    weight_kg: float,
    bag_volume_ml: float,
    target_dose: float,
    target_dose_unit: str,
    ampoule_conc_mg_ml: float,
    drug_volume_added_ml: float,
    drip_factor: int
) -> Dict[str, Any]:
    """
    Розраховує швидкість постійної інфузії (CRI) та швидкість крапель.
    
    Математичні формули:
      1. Загальний об'єм флакону (мл) = Об'єм флакону + Об'єм доданого препарату
      2. Загальна кількість доданого препарату (мг) = Об'єм доданого препарату * Концентрація в ампулі
      3. Концентрація у флаконі (мг/мл) = Загальна кількість доданого препарату / Загальний об'єм флакону
      4. Годинна доза пацієнта (мг/год):
         - Для 'мкг/кг/хв' (або 'mcg/kg/min'): Доза * Вага * 60 / 1000
         - Для 'мг/кг/год' (або 'mg/kg/hour'): Доза * Вага
      5. Швидкість інфузії (мл/год) = Годинна доза пацієнта / Концентрація у флаконі
      6. Швидкість крапель (крапель/хв) = (Швидкість інфузії * Фактор крапельниці) / 60
    """
    # Строгі перевірки меж
    if weight_kg <= 0:
        raise ValueError("Вага пацієнта повинна бути строго більше 0 кг.")
    if bag_volume_ml <= 0:
        raise ValueError("Об'єм флакону рідини повинен бути строго більше 0 мл.")
    if target_dose < 0:
        raise ValueError("Цільова доза не може бути від'ємною.")
    if ampoule_conc_mg_ml <= 0:
        raise ValueError("Концентрація препарату в ампулі повинна бути строго більше 0 мг/мл.")
    if drug_volume_added_ml < 0:
        raise ValueError("Об'єм доданого препарату не може бути від'ємним.")
    if drip_factor <= 0:
        raise ValueError("Фактор крапельниці повинен бути строго більше 0 крапель/мл.")

    # Переведення в Decimal для медичної точності розрахунків
    w = Decimal(str(weight_kg))
    v_bag = Decimal(str(bag_volume_ml))
    d_target = Decimal(str(target_dose))
    c_amp = Decimal(str(ampoule_conc_mg_ml))
    v_add = Decimal(str(drug_volume_added_ml))
    f_drip = Decimal(str(drip_factor))

    # Загальний фізичний об'єм у флаконі після додавання препарату
    v_total = v_bag + v_add
    
    # Загальна кількість доданого препарату (мг)
    total_drug_mg = v_add * c_amp
    
    # Концентрація препарату у флаконі (мг/мл)
    c_bag = total_drug_mg / v_total if v_total > 0 else Decimal('0')

    # Розрахунок годинної дози пацієнта (мг/годину)
    if target_dose_unit in ["mcg/kg/min", "мкг/кг/хв"]:
        # доза * вага * 60 хв / 1000 мкг в мг
        hourly_dose_mg = (d_target * w * Decimal('60')) / Decimal('1000')
    elif target_dose_unit in ["mg/kg/hour", "mg/kg/hr", "мг/кг/год"]:
        # доза * вага
        hourly_dose_mg = d_target * w
    else:
        raise ValueError("Непідтримувана одиниця цільової дози. Виберіть 'мкг/кг/хв' або 'мг/кг/год'.")

    # Швидкість у мл/годину
    if c_bag > 0:
        rate_ml_hr = hourly_dose_mg / c_bag
    else:
        rate_ml_hr = Decimal('0')

    # Швидкість крапель у краплях/хвилину
    drip_rate_drops_min = (rate_ml_hr * f_drip) / Decimal('60')

    # Повертаємо результати, округлені за допомогою Decimal ROUND_HALF_UP
    return {
        "bag_volume_total_ml": float(precise_round(v_total)),
        "total_drug_added_mg": float(precise_round(total_drug_mg)),
        "bag_concentration_mg_ml": float(precise_round(c_bag)),
        "hourly_dose_mg_hr": float(precise_round(hourly_dose_mg)),
        "infusion_rate_ml_hr": float(precise_round(rate_ml_hr)),
        "drops_per_minute": float(precise_round(drip_rate_drops_min)),
        "is_safe": c_bag > 0
    }

def calculate_bsa(
    weight_kg: float,
    species: str,
    target_dose_per_m2: float
) -> Dict[str, Any]:
    """
    Розраховує площу поверхні тіла (BSA) в м2 та абсолютну токсикологічну дозу.
    
    Формула:
      BSA (м2) = (K * (Вага_в_грамах ** (2/3))) / 10000
      Вага_в_грамах = Вага_в_кг * 1000
      Абсолютна доза = BSA * Цільова доза на м2
    """
    if weight_kg <= 0:
        raise ValueError("Вага повинна бути строго більше 0 кг.")
    if target_dose_per_m2 < 0:
        raise ValueError("Цільова доза на м2 не може бути від'ємною.")
    if species not in SPECIES_K_FACTORS:
        raise ValueError(f"Непідтримуваний вид тварини: {species}. Доступні: {list(SPECIES_K_FACTORS.keys())}")

    # Отримуємо коефіцієнт K для виду
    k = Decimal(str(SPECIES_K_FACTORS[species]))
    w_kg = Decimal(str(weight_kg))
    w_g = w_kg * Decimal('1000')

    # Розрахунок степеня 2/3 у float контексті, потім переведення назад у Decimal
    w_g_float = float(w_g)
    power_factor = Decimal(str(w_g_float ** (2.0 / 3.0)))

    # Розрахунок BSA в м2 (поділ на 10000 для грамів)
    bsa = (k * power_factor) / Decimal('10000')
    
    # Абсолютна доза в мг
    absolute_dose = bsa * Decimal(str(target_dose_per_m2))

    return {
        "weight_g": float(precise_round(w_g)),
        "k_factor": float(k),
        "bsa_m2": float(precise_round(bsa)),
        "absolute_dosage": float(precise_round(absolute_dose))
    }
