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

def calculate_fluid_therapy(
    weight_kg: float,
    dehydration_percent: float,
    maintenance_rate_ml_kg_day: float,
    ongoing_losses_ml_day: float,
    drip_factor: int
) -> Dict[str, Any]:
    """
    Розраховує об'єм інфузійної терапії для відновлення гідратації.
    
    Формули:
      1. Дефіцит рідини (мл) = Вага (кг) * Зневоднення (%) * 10
      2. Фізіологічна потреба (мл/добу) = Вага (кг) * Норма (мл/кг/добу)
      3. Загальний добовий об'єм (мл/добу) = Дефіцит + Потреба + Втрати
      4. Швидкість інфузії (мл/год) = Загальний добовий об'єм / 24
      5. Швидкість крапель (крапель/хв) = (Швидкість інфузії * Фактор крапельниці) / 60
    """
    if weight_kg <= 0:
        raise ValueError("Вага пацієнта повинна бути строго більше 0 кг.")
    if dehydration_percent < 0 or dehydration_percent > 15:
        raise ValueError("Відсоток зневоднення має бути в межах від 0% до 15%.")
    if maintenance_rate_ml_kg_day < 0:
        raise ValueError("Фізіологічна потреба не може бути від'ємною.")
    if ongoing_losses_ml_day < 0:
        raise ValueError("Поточні втрати не можуть бути від'ємними.")
    if drip_factor <= 0:
        raise ValueError("Фактор крапельниці повинен бути строго більше 0.")

    w = Decimal(str(weight_kg))
    dehyd = Decimal(str(dehydration_percent))
    maint_rate = Decimal(str(maintenance_rate_ml_kg_day))
    losses = Decimal(str(ongoing_losses_ml_day))
    f_drip = Decimal(str(drip_factor))

    # Рохунок складових частин
    fluid_deficit_ml = w * dehyd * Decimal('10')
    maintenance_ml_day = w * maint_rate
    total_volume_ml_day = fluid_deficit_ml + maintenance_ml_day + losses
    
    infusion_rate_ml_hr = total_volume_ml_day / Decimal('24')
    drip_rate_drops_min = (infusion_rate_ml_hr * f_drip) / Decimal('60')

    return {
        "fluid_deficit_ml": float(precise_round(fluid_deficit_ml)),
        "maintenance_ml_day": float(precise_round(maintenance_ml_day)),
        "total_volume_ml_day": float(precise_round(total_volume_ml_day)),
        "infusion_rate_ml_hr": float(precise_round(infusion_rate_ml_hr)),
        "drops_per_minute": float(precise_round(drip_rate_drops_min))
    }

def calculate_potassium(
    weight_kg: float,
    bag_volume_ml: float,
    infusion_rate_ml_hr: float,
    target_k_dose_meq_kg_hr: float,
    k_ampoule_conc_meq_ml: float
) -> Dict[str, Any]:
    """
    Розраховує об'єм калію хлориду для безпечного додавання у флакон.
    
    Формули:
      1. Годинна доза калію пацієнту (мЕкв/год) = Вага * Доза
      2. Необхідна концентрація калію в інфузії (мЕкв/мл) = Годинна доза калію / Швидкість інфузії
      3. Загальний калій на весь флакон (мЕкв) = Необхідна концентрація * Об'єм флакону
      4. Об'єм KCl для додавання (мл) = Загальний калій / Концентрація KCl в ампулі
      5. Ліміт K-max = 0.5 мЕкв/кг/год (якщо доза вища - позначається як небезпечна).
    """
    if weight_kg <= 0:
        raise ValueError("Вага пацієнта повинна бути строго більше 0 кг.")
    if bag_volume_ml <= 0:
        raise ValueError("Об'єм флакону повинен бути строго більше 0 мл.")
    if infusion_rate_ml_hr <= 0:
        raise ValueError("Швидкість інфузії повинна бути строго більше 0 мл/год.")
    if target_k_dose_meq_kg_hr < 0:
        raise ValueError("Цільова доза калію не може бути від'ємною.")
    if k_ampoule_conc_meq_ml <= 0:
        raise ValueError("Концентрація калію в ампулі повинна бути строго більше 0 мЕкв/мл.")

    w = Decimal(str(weight_kg))
    v_bag = Decimal(str(bag_volume_ml))
    rate_ml_hr = Decimal(str(infusion_rate_ml_hr))
    k_dose = Decimal(str(target_k_dose_meq_kg_hr))
    c_amp = Decimal(str(k_ampoule_conc_meq_ml))

    # Розрахунки
    hourly_k_meq = w * k_dose
    k_conc_in_fluid = hourly_k_meq / rate_ml_hr
    total_k_needed_meq = k_conc_in_fluid * v_bag
    k_volume_added_ml = total_k_needed_meq / c_amp

    is_safe = target_k_dose_meq_kg_hr <= 0.5

    return {
        "hourly_k_meq_hr": float(precise_round(hourly_k_meq)),
        "k_concentration_meq_ml": float(precise_round(k_conc_in_fluid)),
        "total_k_needed_meq": float(precise_round(total_k_needed_meq)),
        "k_volume_added_ml": float(precise_round(k_volume_added_ml)),
        "is_safe": is_safe
    }

def calculate_emergency_doses(weight_kg: float) -> Dict[str, Any]:
    """
    Швидкий розрахунок екстрених реанімаційних доз лікарських засобів.
    
    Словник дозування (за рекомендаціями RECOVER Initiative):
      - Адреналін (1 мг/мл): низька доза (0.01 мг/кг), висока доза (0.1 мг/кг)
      - Атропін (0.5 мг/мл): 0.04 мг/кг
      - Лідокаїн 2% (20 мг/мл): для собак (2.0 мг/кг), для котів (0.2 мг/кг)
      - Налоксон (0.4 мг/мл): 0.04 мг/кг
      - Дексаметазон (4 мг/мл): 1.0 мг/кг
    """
    if weight_kg <= 0:
        raise ValueError("Вага пацієнта повинна бути строго більше 0 кг.")

    w = Decimal(str(weight_kg))

    # Адреналін 1 мг/мл
    epi_low_mg = w * Decimal('0.01')
    epi_low_ml = epi_low_mg / Decimal('1.0')
    epi_high_mg = w * Decimal('0.1')
    epi_high_ml = epi_high_mg / Decimal('1.0')

    # Атропін 0.5 мг/мл
    atropine_mg = w * Decimal('0.04')
    atropine_ml = atropine_mg / Decimal('0.5')

    # Лідокаїн 20 мг/мл
    lido_dog_mg = w * Decimal('2.0')
    lido_dog_ml = lido_dog_mg / Decimal('20.0')
    lido_cat_mg = w * Decimal('0.2')
    lido_cat_ml = lido_cat_mg / Decimal('20.0')

    # Налоксон 0.4 мг/мл
    naloxone_mg = w * Decimal('0.04')
    naloxone_ml = naloxone_mg / Decimal('0.4')

    # Дексаметазон 4 мг/мл
    dexa_mg = w * Decimal('1.0')
    dexa_ml = dexa_mg / Decimal('4.0')

    return {
        "adrenaline_low": {
            "dose_mg": float(precise_round(epi_low_mg)),
            "volume_ml": float(precise_round(epi_low_ml)),
            "info": "Низька доза CPR. Застосовується першочергово при зупинці серця кожні 3-5 хвилин."
        },
        "adrenaline_high": {
            "dose_mg": float(precise_round(epi_high_mg)),
            "volume_ml": float(precise_round(epi_high_ml)),
            "info": "Висока доза CPR. Застосовується виключно при тривалій реанімації (>10 хвилин)."
        },
        "atropine": {
            "dose_mg": float(precise_round(atropine_mg)),
            "volume_ml": float(precise_round(atropine_ml)),
            "info": "При вираженій брадикардії або асистолії. Концентрація розчину 0.5 мг/мл."
        },
        "lidocaine_dog": {
            "dose_mg": float(precise_round(lido_dog_mg)),
            "volume_ml": float(precise_round(lido_dog_ml)),
            "info": "Для собак при шлуночковій тахікардії. Концентрація 2% (20 мг/мл)."
        },
        "lidocaine_cat": {
            "dose_mg": float(precise_round(lido_cat_mg)),
            "volume_ml": float(precise_round(lido_cat_ml)),
            "info": "⚠️ ДЛЯ КОТІВ! Знижене дозування через кардіодепресивний ефект та високу чутливість."
        },
        "naloxone": {
            "dose_mg": float(precise_round(naloxone_mg)),
            "volume_ml": float(precise_round(naloxone_ml)),
            "info": "Антагоніст опіоїдів при передозуванні чи пригніченні дихання. Концентрація 0.4 мг/мл."
        },
        "dexamethasone": {
            "dose_mg": float(precise_round(dexa_mg)),
            "volume_ml": float(precise_round(dexa_ml)),
            "info": "Глюкокортикоїд при гострому анафілактичному шоці. Концентрація 4 мг/мл."
        }
    }
