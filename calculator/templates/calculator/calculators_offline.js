/**
 * VetCalc - Автогенероване клієнтське математичне ядро (Офлайн-режим)
 * Згенеровано автоматично з core/calculators.py за допомогою core/transpiler.py.
 * ГАРАНТУЄ 100% ЄДИНЕ ДЖЕРЕЛО ПРАВДИ (SINGLE SOURCE OF TRUTH).
 * НЕ РЕДАГУЙТЕ ЦЕЙ ФАЙЛ ВРУЧНУ.
 */

// Точний аналог Python ROUND_HALF_UP округлення в JavaScript
function preciseRound(value, decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
}

// Константи видів тварин (K-фактори) для розрахунку BSA
const SPECIES_K_FACTORS = {
    "Собака": 10.1,
    "Кіт": 10.0,
    "Птах": 10.4,
    "Гризун": 9.0
};

function calculateCriLocal(weight_kg, bag_volume_ml, target_dose, target_dose_unit, ampoule_conc_mg_ml, drug_volume_added_ml, drip_factor) {
  let c_amp, c_bag, d_target, drip_rate_drops_min, f_drip, hourly_dose_mg, rate_ml_hr, total_drug_mg, v_add, v_bag, v_total, w;

  if ((weight_kg <= 0)) {
    throw new Error("Вага пацієнта повинна бути строго більше 0 кг.");
  }
  if ((bag_volume_ml <= 0)) {
    throw new Error("Об'єм флакону рідини повинен бути строго більше 0 мл.");
  }
  if ((target_dose < 0)) {
    throw new Error("Цільова доза не може бути від'ємною.");
  }
  if ((ampoule_conc_mg_ml <= 0)) {
    throw new Error("Концентрація препарату в ампулі повинна бути строго більше 0 мг/мл.");
  }
  if ((drug_volume_added_ml < 0)) {
    throw new Error("Об'єм доданого препарату не може бути від'ємним.");
  }
  if ((drip_factor <= 0)) {
    throw new Error("Фактор крапельниці повинен бути строго більше 0 крапель/мл.");
  }
  w = Number(String(weight_kg));
  v_bag = Number(String(bag_volume_ml));
  d_target = Number(String(target_dose));
  c_amp = Number(String(ampoule_conc_mg_ml));
  v_add = Number(String(drug_volume_added_ml));
  f_drip = Number(String(drip_factor));
  v_total = (v_bag + v_add);
  total_drug_mg = (v_add * c_amp);
  c_bag = ((v_total > 0) ? (total_drug_mg / v_total) : Number("0"));
  if (["mcg/kg/min", "мкг/кг/хв"].includes(target_dose_unit)) {
    hourly_dose_mg = (((d_target * w) * Number("60")) / Number("1000"));
  } else if (["mg/kg/hour", "mg/kg/hr", "мг/кг/год"].includes(target_dose_unit)) {
      hourly_dose_mg = (d_target * w);
    } else {
      throw new Error("Непідтримувана одиниця цільової дози. Виберіть 'мкг/кг/хв' або 'мг/кг/год'.");
    }
  if ((c_bag > 0)) {
    rate_ml_hr = (hourly_dose_mg / c_bag);
  } else {
    rate_ml_hr = Number("0");
  }
  drip_rate_drops_min = ((rate_ml_hr * f_drip) / Number("60"));
  return {
    bag_volume_total_ml: Number(preciseRound(v_total)),
    total_drug_added_mg: Number(preciseRound(total_drug_mg)),
    bag_concentration_mg_ml: Number(preciseRound(c_bag)),
    hourly_dose_mg_hr: Number(preciseRound(hourly_dose_mg)),
    infusion_rate_ml_hr: Number(preciseRound(rate_ml_hr)),
    drops_per_minute: Number(preciseRound(drip_rate_drops_min)),
    is_safe: (c_bag > 0)
  };
}

function calculateBsaLocal(weight_kg, species, target_dose_per_m2) {
  let absolute_dose, bsa, k, power_factor, w_g, w_g_float, w_kg;

  if ((weight_kg <= 0)) {
    throw new Error("Вага повинна бути строго більше 0 кг.");
  }
  if ((target_dose_per_m2 < 0)) {
    throw new Error("Цільова доза на м2 не може бути від'ємною.");
  }
  if (!Object.keys(SPECIES_K_FACTORS).includes(species)) {
    throw new Error(`Непідтримуваний вид тварини: ${species}. Доступні: ${Object.keys(SPECIES_K_FACTORS)}`);
  }
  k = Number(String(SPECIES_K_FACTORS[species]));
  w_kg = Number(String(weight_kg));
  w_g = (w_kg * Number("1000"));
  w_g_float = Number(w_g);
  power_factor = Number(String((w_g_float ** (2.0 / 3.0))));
  bsa = ((k * power_factor) / Number("10000"));
  absolute_dose = (bsa * Number(String(target_dose_per_m2)));
  return {
    weight_g: Number(preciseRound(w_g)),
    k_factor: Number(k),
    bsa_m2: Number(preciseRound(bsa)),
    absolute_dosage: Number(preciseRound(absolute_dose))
  };
}

function calculateFluidLocal(weight_kg, dehydration_percent, maintenance_rate_ml_kg_day, ongoing_losses_ml_day, drip_factor) {
  let dehyd, drip_rate_drops_min, f_drip, fluid_deficit_ml, infusion_rate_ml_hr, losses, maint_rate, maintenance_ml_day, total_volume_ml_day, w;

  if ((weight_kg <= 0)) {
    throw new Error("Вага пацієнта повинна бути строго більше 0 кг.");
  }
  if (((dehydration_percent < 0) || (dehydration_percent > 15))) {
    throw new Error("Відсоток зневоднення має бути в межах від 0% до 15%.");
  }
  if ((maintenance_rate_ml_kg_day < 0)) {
    throw new Error("Фізіологічна потреба не може бути від'ємною.");
  }
  if ((ongoing_losses_ml_day < 0)) {
    throw new Error("Поточні втрати не можуть бути від'ємними.");
  }
  if ((drip_factor <= 0)) {
    throw new Error("Фактор крапельниці повинен бути строго більше 0.");
  }
  w = Number(String(weight_kg));
  dehyd = Number(String(dehydration_percent));
  maint_rate = Number(String(maintenance_rate_ml_kg_day));
  losses = Number(String(ongoing_losses_ml_day));
  f_drip = Number(String(drip_factor));
  fluid_deficit_ml = ((w * dehyd) * Number("10"));
  maintenance_ml_day = (w * maint_rate);
  total_volume_ml_day = ((fluid_deficit_ml + maintenance_ml_day) + losses);
  infusion_rate_ml_hr = (total_volume_ml_day / Number("24"));
  drip_rate_drops_min = ((infusion_rate_ml_hr * f_drip) / Number("60"));
  const res = {
    fluid_deficit_ml: preciseRound(fluid_deficit_ml),
    maintenance_ml_day: preciseRound(maintenance_ml_day),
    total_volume_ml_day: preciseRound(total_volume_ml_day),
    infusion_rate_ml_hr: preciseRound(infusion_rate_ml_hr),
    drops_per_minute: preciseRound(drip_rate_drops_min)
  };
  return {
    ...res,
    dehydration_deficit_ml: res.fluid_deficit_ml,
    total_fluid_required_ml_day: res.total_volume_ml_day,
    hourly_fluid_rate_ml_hr: res.infusion_rate_ml_hr
  };
}

function calculatePotassiumLocal(weight_kg, bag_volume_ml, infusion_rate_ml_hr, target_k_dose_meq_kg_hr, k_ampoule_conc_meq_ml) {
  let c_amp, hourly_k_meq, is_safe, k_conc_in_fluid, k_dose, k_volume_added_ml, rate_ml_hr, total_k_needed_meq, v_bag, w;

  if ((weight_kg <= 0)) {
    throw new Error("Вага пацієнта повинна бути строго більше 0 кг.");
  }
  if ((bag_volume_ml <= 0)) {
    throw new Error("Об'єм флакону повинен бути строго більше 0 мл.");
  }
  if ((infusion_rate_ml_hr <= 0)) {
    throw new Error("Швидкість інфузії повинна бути строго більше 0 мл/год.");
  }
  if ((target_k_dose_meq_kg_hr < 0)) {
    throw new Error("Цільова доза калію не може бути від'ємною.");
  }
  if ((k_ampoule_conc_meq_ml <= 0)) {
    throw new Error("Концентрація калію в ампулі повинна бути строго більше 0 мЕкв/мл.");
  }
  w = Number(String(weight_kg));
  v_bag = Number(String(bag_volume_ml));
  rate_ml_hr = Number(String(infusion_rate_ml_hr));
  k_dose = Number(String(target_k_dose_meq_kg_hr));
  c_amp = Number(String(k_ampoule_conc_meq_ml));
  hourly_k_meq = (w * k_dose);
  k_conc_in_fluid = (hourly_k_meq / rate_ml_hr);
  total_k_needed_meq = (k_conc_in_fluid * v_bag);
  k_volume_added_ml = (total_k_needed_meq / c_amp);
  is_safe = (target_k_dose_meq_kg_hr <= 0.5);
  const res = {
    hourly_k_meq_hr: preciseRound(hourly_k_meq, 3),
    k_concentration_meq_ml: preciseRound(k_conc_in_fluid, 4),
    total_k_needed_meq: preciseRound(total_k_needed_meq, 3),
    k_volume_added_ml: preciseRound(k_volume_added_ml, 4),
    is_safe
  };
  return {
    ...res,
    hourly_k_delivered_meq_hr: res.hourly_k_meq_hr,
    required_k_concentration_meq_ml: res.k_concentration_meq_ml,
    total_k_needed_for_bag_meq: res.total_k_needed_meq,
    kcl_volume_to_add_ml: res.k_volume_added_ml
  };
}

function _calculateEmergencyLocal(weight_kg) {
  let atropine_mg, atropine_ml, dexa_mg, dexa_ml, epi_high_mg, epi_high_ml, epi_low_mg, epi_low_ml, lido_cat_mg, lido_cat_ml, lido_dog_mg, lido_dog_ml, naloxone_mg, naloxone_ml, w;

  if ((weight_kg <= 0)) {
    throw new Error("Вага пацієнта повинна бути строго більше 0 кг.");
  }
  w = Number(String(weight_kg));
  epi_low_mg = (w * Number("0.01"));
  epi_low_ml = (epi_low_mg / Number("1.0"));
  epi_high_mg = (w * Number("0.1"));
  epi_high_ml = (epi_high_mg / Number("1.0"));
  atropine_mg = (w * Number("0.04"));
  atropine_ml = (atropine_mg / Number("0.5"));
  lido_dog_mg = (w * Number("2.0"));
  lido_dog_ml = (lido_dog_mg / Number("20.0"));
  lido_cat_mg = (w * Number("0.2"));
  lido_cat_ml = (lido_cat_mg / Number("20.0"));
  naloxone_mg = (w * Number("0.04"));
  naloxone_ml = (naloxone_mg / Number("0.4"));
  dexa_mg = (w * Number("1.0"));
  dexa_ml = (dexa_mg / Number("4.0"));
  return {
    adrenaline_low: {
    dose_mg: Number(preciseRound(epi_low_mg, 4)),
    volume_ml: Number(preciseRound(epi_low_ml, 4)),
    info: "Низька доза CPR. Застосовується першочергово при зупинці серця кожні 3-5 хвилин."
  },
    adrenaline_high: {
    dose_mg: Number(preciseRound(epi_high_mg, 4)),
    volume_ml: Number(preciseRound(epi_high_ml, 4)),
    info: "Висока доза CPR. Застосовується виключно при тривалій реанімації (>10 хвилин)."
  },
    atropine: {
    dose_mg: Number(preciseRound(atropine_mg, 4)),
    volume_ml: Number(preciseRound(atropine_ml, 4)),
    info: "При вираженій брадикардії або асистолії. Концентрація розчину 0.5 мг/мл."
  },
    lidocaine_dog: {
    dose_mg: Number(preciseRound(lido_dog_mg, 4)),
    volume_ml: Number(preciseRound(lido_dog_ml, 4)),
    info: "Для собак при шлуночковій тахікардії. Концентрація 2% (20 мг/мл)."
  },
    lidocaine_cat: {
    dose_mg: Number(preciseRound(lido_cat_mg, 4)),
    volume_ml: Number(preciseRound(lido_cat_ml, 4)),
    info: "⚠️ ДЛЯ КОТІВ! Знижене дозування через кардіодепресивний ефект та високу чутливість."
  },
    naloxone: {
    dose_mg: Number(preciseRound(naloxone_mg, 4)),
    volume_ml: Number(preciseRound(naloxone_ml, 4)),
    info: "Антагоніст опіоїдів при передозуванні чи пригніченні дихання. Концентрація 0.4 мг/мл."
  },
    dexamethasone: {
    dose_mg: Number(preciseRound(dexa_mg, 4)),
    volume_ml: Number(preciseRound(dexa_ml, 4)),
    info: "Глюкокортикоїд при гострому анафілактичному шоці. Концентрація 4 мг/мл."
  }
  };
}

// Сумісність для розрахунку екстрених реанімаційних доз CPR
function calculateEmergencyLocal(weight_kg) {
    const orig = _calculateEmergencyLocal(weight_kg);
    const res = {};
    for (const k in orig) {
        res[k] = {
            ...orig[k],
            absolute_dose_mg: orig[k].dose_mg,
            safety_notes: orig[k].info
        };
    }
    return res;
}

// Клінічна матриця сумісності препаратів (для офлайн аудиту)
const LOCAL_COMPATIBILITY_MATRIX = {
  "Пропофол": {
    "Пропофол": {
      "status": "Сумісний",
      "reason": "Однорідна суміш одного препарату."
    },
    "Діазепам": {
      "status": "Несумісний",
      "reason": "Діазепам містить пропіленгліколь, який може дестабілізувати (зруйнувати) ліпідну емульсію Пропофолу, що призводить до злиття крапель жиру та викликає високий ризик жирової емболії судин."
    },
    "Кальцію глюконат": {
      "status": "Несумісний",
      "reason": "Двовалентні іони кальцію нейтралізують стабілізуючий негативний поверхневий заряд крапель Пропофолу, викликаючи миттєве розшарування (руйнування) емульсії."
    },
    "Мідазолам": {
      "status": "Несумісний",
      "reason": "Мідазолам (кислий pH ~3.0) зміщує водневий показник нейтрально-лужної емульсії Пропофолу, що дестабілізує ліпідну основу та призводить до розшарування емульсії."
    },
    "Фуросемід": {
      "status": "Несумісний",
      "reason": "Високолужний pH Фуросеміду (~8.5-9.0) дестабілізує чутливу ліпідну емульсію Пропофолу, що призводить до швидкого руйнування емульсійної форми."
    }
  },
  "Діазепам": {
    "Пропофол": {
      "status": "Несумісний",
      "reason": "Діазепам містить пропіленгліколь, який може дестабілізувати (зруйнувати) ліпідну emulsion Пропофолу, викликаючи високий ризик жирової емболії."
    },
    "Діазепам": {
      "status": "Сумісний",
      "reason": "Однорідна суміш одного препарату."
    },
    "Кальцію глюконат": {
      "status": "Несумісний",
      "reason": "Діазепам практично нерозчинний у водних розчинах і випадає в осад миттєво при змішуванні з препаратами на водній основі, такими як Кальцію глюконат."
    },
    "Мідазолам": {
      "status": "Несумісний",
      "reason": "Несумісність розчинників та ризик фізичного випадання в осад. Діазепам виготовлений на основі пропіленгліколю, тоді як Мідазолам має водну основу."
    },
    "Фуросемід": {
      "status": "Несумісний",
      "reason": "Миттєве випадання в осад. Різниця в pH та несумісність розчинників змушують Діазепам випадати з розчину у вигляді твердих кристалів."
    }
  },
  "Кальцію глюконат": {
    "Пропофол": {
      "status": "Несумісний",
      "reason": "Двовалентні іони кальцію нейтралізують стабілізуючий негативний поверхневий заряд крапель Пропофолу, викликаючи миттєве розшарування (руйнування) емульсії."
    },
    "Діазепам": {
      "status": "Несумісний",
      "reason": "Діазепам практично нерозчинний у водних розчинах і випадає в осад миттєво при змішуванні з препаратами на водній основі, такими як Кальцію глюконат."
    },
    "Кальцію глюконат": {
      "status": "Сумісний",
      "reason": "Однорідна суміш одного препарату."
    },
    "Мідазолам": {
      "status": "Несумісний",
      "reason": "Фізична несумісність. Ризик випадання в осад солі мідазоламу внаслідок зміни pH розчину та іонної взаємодії."
    },
    "Фуросемід": {
      "status": "Несумісний",
      "reason": "Миттєве утворення осаду. Іони кальцію вступають у реакцію з фуросемідом, утворюючи нерозчинні кристали фуросеміду кальцію, що повністю блокує інфузійні лінії та створює смертельний ризик емболії легеневої артерії."
    }
  },
  "Мідазолам": {
    "Пропофол": {
      "status": "Несумісний",
      "reason": "Мідазолам (кислий pH ~3.0) зміщує водневий показник нейтрально-лужної emulsions Пропофолу, що дестабілізує ліпідну основу та призводить до її розшарування."
    },
    "Діазепам": {
      "status": "Несумісний",
      "reason": "Несумісність розчинників та ризик фізичного випадання в осад. Діазепам виготовлений на основі пропіленгліколю, тоді як Мідазолам має водну основу."
    },
    "Кальцію глюконат": {
      "status": "Несумісний",
      "reason": "Фізична несумісність. Ризик випадання в осад солі мідазоламу внаслідок зміни pH розчину та іонної взаємодії."
    },
    "Мідазолам": {
      "status": "Сумісний",
      "reason": "Однорідна суміш одного препарату."
    },
    "Фуросемід": {
      "status": "Несумісний",
      "reason": "Миттєве і масивне випадання осаду. Мідазолам потребує кислого середовища (pH ~3.0) для збереження розчинності. Фуросемід є високолужним (pH ~8.5-9.0), що різко підвищує загальний pH суміші та викликає миттєву кристалізацію мідазоламу у вигляді голчастих кристалів."
    }
  },
  "Фуросемід": {
    "Пропофол": {
      "status": "Несумісний",
      "reason": "Високолужний pH Фуросеміду (~8.5-9.0) дестабілізує чутливу ліпідну емульсію Пропофолу, що призводить до швидкого руйнування емульсійної форми."
    },
    "Діазепам": {
      "status": "Несумісний",
      "reason": "Миттєве випадання в осад. Різниця в pH та несумісність розчинників змушують Діазепам випадати з розчину у вигляді твердих кристалів."
    },
    "Кальцію глюконат": {
      "status": "Несумісний",
      "reason": "Миттєве утворення осаду. Іони кальцію вступають у реакцію з фуросемідом, утворюючи нерозчинні кристали фуросеміду кальцію, що повністю блокує інфузійні лінії та створює смертельний ризик емболії."
    },
    "Мідазолам": {
      "status": "Несумісний",
      "reason": "Миттєве і масивне випадання осаду. Мідазолам потребує кислого середовища (pH ~3.0) для збереження розчинності. Фуросемід є високолужним (pH ~8.5-9.0), що різко підвищує загальний pH суміші та викликає миттєву кристалізацію мідазоламу у вигляді голчастих кристалів."
    },
    "Фуросемід": {
      "status": "Сумісний",
      "reason": "Однорідна суміш одного препарату."
    }
  }
};
