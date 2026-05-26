with open('calculator/static/calculator/js/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace('{% include "calculator/calculators_offline.js" %}', '''import {
    preciseRound,
    SPECIES_K_FACTORS,
    calculateCriLocal,
    calculateBsaLocal,
    calculateFluidLocal,
    calculatePotassiumLocal,
    calculateEmergencyLocal,
    calculateBicarbonateLocal,
    calculateAdjustedCalciumLocal,
    calculatePlasmaOsmolalityLocal,
    LOCAL_COMPATIBILITY_MATRIX
} from './calculators_offline.js';
''')

with open('calculator/static/calculator/js/main.js', 'w', encoding='utf-8') as f:
    f.write(js)
