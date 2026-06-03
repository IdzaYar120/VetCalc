import './modules/theme.js';
import './modules/legal.js';
import './modules/pwa.js';

import {
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
    calculateAnesthesiaLocal,
    calculateTransfusionLocal,
    calculateToxicityLocal,
    LOCAL_COMPATIBILITY_MATRIX
} from './calculators_offline.js';

const SVG_ICONS = {
    wifiOff: `<svg class="lucide-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"></path><path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.5 8"></path><path d="M1.5 8a15.93 15.93 0 0 1 7.27-2.58"></path><path d="M8.58 8.58A5 5 0 0 1 12 7.5a4.91 4.91 0 0 1 3.42 1.08"></path></svg>`,
    wifi: `<svg class="lucide-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M5 12.5a10.87 10.87 0 0 1 14 0"></path><path d="M1.5 8a15.89 15.89 0 0 1 21 0"></path><path d="M8.5 17a4.86 4.86 0 0 1 7 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`,
    wifiOffLarge: `<svg class="lucide-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"></path><path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.5 8"></path><path d="M1.5 8a15.93 15.93 0 0 1 7.27-2.58"></path><path d="M8.58 8.58A5 5 0 0 1 12 7.5a4.91 4.91 0 0 1 3.42 1.08"></path></svg>`,
    checkCircle: `<svg class="lucide-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    xCircle: `<svg class="lucide-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    alertTriangle: `<svg class="lucide-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg class="lucide-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

    // Дебаунс функція для усунення затримок інтерфейсу при швидкому введенні даних
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Дебаунс перемальовування іконок для запобігання лагам інтерфейсу
    if (window.lucide && !window.lucide.isOverridden) {
        const originalCreateIcons = window.lucide.createIcons;
        let lucideTimeout = null;
        window.lucide.createIcons = function(options) {
            clearTimeout(lucideTimeout);
            lucideTimeout = setTimeout(() => {
                originalCreateIcons(options);
            }, 60);
        };
        window.lucide.isOverridden = true;
    }

    // Зміна категорії
    window.switchCategory = function(categoryId, btn) {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.sub-chips-wrapper').forEach(w => w.classList.remove('active'));
        const activeWrapper = document.getElementById(`chips-${categoryId}`);
        if (activeWrapper) {
            activeWrapper.classList.add('active');
            
            const firstChip = activeWrapper.querySelector('.sub-chip-btn');
            if (firstChip) {
                firstChip.click();
            }
        }
        if (window.lucide) lucide.createIcons();
    };

    // Зміна вкладок
    window.switchTab = function(tabId, btn) {
        document.querySelectorAll('.sub-chip-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        if (window.lucide) lucide.createIcons();
    };

    // Керування чекбоксами вибору препаратів
    function toggleDrugCheckbox(card) {
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        triggerAudit();
    }

    document.querySelectorAll('.checkbox-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const card = this.closest('.checkbox-card');
            if (this.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
            triggerAudit();
        });
    });

    // Клієнтські калькулятори тепер імпортуються автоматично з автогенерованого ядра


    // ---------------- РЕАКТИВНА AJAX-ВЗАЄМОДІЯ З BACKEND ----------------

    // 1. Розрахунок CRI
    function runCriCalculation() {
        const weight = parseFloat(document.getElementById('cri-weight').value) || 0;
        const bagVolume = parseFloat(document.getElementById('cri-bag-volume').value) || 0;
        const dose = parseFloat(document.getElementById('cri-dose').value) || 0;
        const doseUnit = document.getElementById('cri-dose-unit').value;
        const ampConc = parseFloat(document.getElementById('cri-amp-conc').value) || 0;
        const addVol = parseFloat(document.getElementById('cri-add-vol').value) || 0;
        const dripFactor = parseInt(document.getElementById('cri-drip-factor').value) || 20;
        const errorBanner = document.getElementById('cri-error-banner');
        
        if (weight <= 0) {
            showCriError("❌ Помилка валідації: Вага тварини повинна бути строго більше 0 кг.");
            return;
        }
        if (bagVolume <= 0) {
            showCriError("❌ Помилка валідації: Об'єм флакону розчину повинен бути строго більше 0 мл.");
            return;
        }
        if (ampConc <= 0) {
            showCriError("❌ Помилка валідації: Концентрація препарату в ампулі повинна бути строго більше 0 мг/мл.");
            return;
        }
        if (addVol === 0) {
            showCriWarning("⚠️ Попередження: Об'єм доданого препарату дорівнює 0 мл. Концентрація і швидкість інфузії рівні нулю.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculateCriLocal(weight, bagVolume, dose, doseUnit, ampConc, addVol, dripFactor);
            document.getElementById('cri-res-bag-conc').innerHTML = `${data.bag_concentration_mg_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мг/мл</span>`;
            document.getElementById('cri-res-infusion-rate').innerHTML = `${data.infusion_rate_ml_hr.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/год</span>`;
            document.getElementById('cri-res-drip-rate').innerHTML = `${data.drops_per_minute.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">крапель/хв</span>`;

            let hourlyDoseFormula = "";
            if (doseUnit === "мкг/кг/хв") {
                hourlyDoseFormula = `D_hr = (${dose} мкг/кг/хв * ${weight} кг * 60 хв) / 1000 = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год`;
            } else {
                hourlyDoseFormula = `D_hr = ${dose} мг/кг/год * ${weight} кг = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год`;
            }
            document.getElementById('math-hourly-dose').textContent = hourlyDoseFormula;
            document.getElementById('math-bag-conc').innerHTML = `C_bag = (${addVol} мл * ${ampConc} мг/мл) / (${bagVolume} мл + ${addVol} мл) = ${data.bag_concentration_mg_ml.toFixed(2)} мг/мл <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;
            document.getElementById('math-flow-rate').textContent = `Rate = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год / ${data.bag_concentration_mg_ml.toFixed(2)} мг/мл = ${data.infusion_rate_ml_hr.toFixed(2)} мл/год`;
            document.getElementById('math-drip-rate').textContent = `Drops = (${data.infusion_rate_ml_hr.toFixed(2)} мл/год * ${dripFactor} кр/мл) / 60 = ${data.drops_per_minute.toFixed(2)} крапель/хв`;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-cri/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                bag_volume_ml: bagVolume,
                target_dose: dose,
                target_dose_unit: doseUnit,
                ampoule_conc_mg_ml: ampConc,
                drug_volume_added_ml: addVol,
                drip_factor: dripFactor
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            document.getElementById('cri-res-bag-conc').innerHTML = `${data.bag_concentration_mg_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мг/мл</span>`;
            document.getElementById('cri-res-infusion-rate').innerHTML = `${data.infusion_rate_ml_hr.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/год</span>`;
            document.getElementById('cri-res-drip-rate').innerHTML = `${data.drops_per_minute.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">крапель/хв</span>`;

            let hourlyDoseFormula = "";
            if (doseUnit === "мкг/кг/хв" || doseUnit === "mcg/kg/min") {
                hourlyDoseFormula = `D_hr = (${dose} мкг/кг/хв * ${weight} кг * 60 хв) / 1000 = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год`;
            } else {
                hourlyDoseFormula = `D_hr = ${dose} мг/кг/год * ${weight} кг = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год`;
            }
            document.getElementById('math-hourly-dose').textContent = hourlyDoseFormula;
            document.getElementById('math-bag-conc').textContent = `C_bag = (${addVol} мл * ${ampConc} мг/мл) / (${bagVolume} мл + ${addVol} мл) = ${data.bag_concentration_mg_ml.toFixed(2)} мг/мл`;
            document.getElementById('math-flow-rate').textContent = `Rate = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год / ${data.bag_concentration_mg_ml.toFixed(2)} мг/мл = ${data.infusion_rate_ml_hr.toFixed(2)} мл/год`;
            document.getElementById('math-drip-rate').textContent = `Drops = (${data.infusion_rate_ml_hr.toFixed(2)} мл/год * ${dripFactor} кр/мл) / 60 = ${data.drops_per_minute.toFixed(2)} крапель/хв`;
        })
        .catch(err => {
            console.warn("Помилка CRI API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showCriError(msg) {
        const errorBanner = document.getElementById('cri-error-banner');
        errorBanner.style.backgroundColor = 'var(--danger-light)';
        errorBanner.style.color = 'var(--danger-dark)';
        errorBanner.style.border = '1px solid rgba(229, 62, 62, 0.2)';
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetCriResults();
    }

    function showCriWarning(msg) {
        const errorBanner = document.getElementById('cri-error-banner');
        errorBanner.style.backgroundColor = '#fff9e6';
        errorBanner.style.color = '#7a5c00';
        errorBanner.style.border = '1px solid rgba(255, 179, 0, 0.2)';
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetCriResults();
    }

    function resetCriResults() {
        document.getElementById('cri-res-bag-conc').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мг/мл</span>`;
        document.getElementById('cri-res-infusion-rate').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл/год</span>`;
        document.getElementById('cri-res-drip-rate').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">крапель/хв</span>`;
        document.getElementById('math-hourly-dose').textContent = "Розрахунок припинено через некоректні дані.";
        document.getElementById('math-bag-conc').textContent = "Розрахунок припинено.";
        document.getElementById('math-flow-rate').textContent = "Розрахунок припинено.";
        document.getElementById('math-drip-rate').textContent = "Розрахунок припинено.";
    }

    // 2. Розрахунок BSA
    function runBsaCalculation() {
        const species = document.getElementById('bsa-species').value;
        const weight = parseFloat(document.getElementById('bsa-weight').value) || 0;
        const dose = parseFloat(document.getElementById('bsa-dose').value) || 0;
        const errorBanner = document.getElementById('bsa-error-banner');

        if (weight <= 0) {
            errorBanner.textContent = "❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.";
            errorBanner.style.display = 'block';
            resetBsaResults();
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculateBsaLocal(weight, species, dose);
            document.getElementById('bsa-res-m2').innerHTML = `${data.bsa_m2.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">м²</span>`;
            document.getElementById('bsa-res-dose').innerHTML = `${data.absolute_dosage.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мг</span>`;

            document.getElementById('math-bsa-weight-g').textContent = `W_g = ${weight} кг * 1000 = ${data.weight_g.toFixed(0)} г`;
            document.getElementById('math-bsa-calc').innerHTML = `BSA = (${data.k_factor} * (${data.weight_g.toFixed(0)} ** 2/3)) / 10000 = ${data.bsa_m2.toFixed(2)} м² <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;
            document.getElementById('math-bsa-dose').textContent = `Доза = ${data.bsa_m2.toFixed(2)} м² * ${dose} мг/м² = ${data.absolute_dosage.toFixed(2)} мг`;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-bsa/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                species: species,
                target_dose_per_m2: dose
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            document.getElementById('bsa-res-m2').innerHTML = `${data.bsa_m2.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">м²</span>`;
            document.getElementById('bsa-res-dose').innerHTML = `${data.absolute_dosage.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мг</span>`;

            document.getElementById('math-bsa-weight-g').textContent = `W_g = ${weight} кг * 1000 = ${data.weight_g.toFixed(0)} г`;
            document.getElementById('math-bsa-calc').textContent = `BSA = (${data.k_factor} * (${data.weight_g.toFixed(0)} ** 2/3)) / 10000 = ${data.bsa_m2.toFixed(2)} м²`;
            document.getElementById('math-bsa-dose').textContent = `Доза = ${data.bsa_m2.toFixed(2)} м² * ${dose} мг/м² = ${data.absolute_dosage.toFixed(2)} мг`;
        })
        .catch(err => {
            console.warn("Помилка BSA API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function resetBsaResults() {
        document.getElementById('bsa-res-m2').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">м²</span>`;
        document.getElementById('bsa-res-dose').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мг</span>`;
        document.getElementById('math-bsa-weight-g').textContent = "Розрахунок скасовано.";
        document.getElementById('math-bsa-calc').textContent = "Розрахунок скасовано.";
        document.getElementById('math-bsa-dose').textContent = "Розрахунок скасовано.";
    }

    // 2-2. Розрахунок Токсичності
    function runToxicityCalculation() {
        const weight = parseFloat(document.getElementById('toxicity-weight').value) || 0;
        const poisonType = document.getElementById('toxicity-poison-type').value;
        const amount = parseFloat(document.getElementById('toxicity-amount').value) || 0;
        const errorBanner = document.getElementById('toxicity-error-banner');

        if (weight <= 0) {
            showToxicityError("❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.");
            return;
        }
        if (amount <= 0) {
            showToxicityError("❌ Помилка валідації: Кількість отрути повинна бути строго більше 0 г.");
            return;
        }

        errorBanner.style.display = 'none';

        const updateUI = (data, isOffline = false) => {
            document.getElementById('toxicity-res-dose').innerHTML = `${data.dose_mg_kg.toFixed(2)} <span id="toxicity-res-unit" style="font-size: 1rem; color: var(--gray-text);">${data.unit}</span>`;
            document.getElementById('toxicity-res-active').textContent = data.active_substance;
            
            const card = document.getElementById('toxicity-severity-card');
            const icon = document.getElementById('toxicity-severity-icon');
            const severityEl = document.getElementById('toxicity-res-severity');
            const recEl = document.getElementById('toxicity-res-recommendations');
            
            severityEl.textContent = data.severity;
            recEl.textContent = data.recommendations;
            
            card.style.backgroundColor = "";
            card.style.color = "";
            
            if (data.color === 'green') {
                card.className = "success-card";
                card.style.borderLeft = "4px solid var(--success)";
                icon.setAttribute("data-lucide", "check-circle");
            } else if (data.color === 'yellow') {
                card.className = "success-card";
                card.style.borderLeft = "4px solid #eab308";
                icon.setAttribute("data-lucide", "info");
            } else if (data.color === 'orange') {
                card.className = "danger-card";
                card.style.borderLeft = "4px solid #f97316";
                card.style.backgroundColor = "rgba(249, 115, 22, 0.1)";
                card.style.color = "#c2410c";
                icon.setAttribute("data-lucide", "alert-triangle");
            } else { // red
                card.className = "danger-card";
                card.style.borderLeft = "4px solid var(--danger)";
                card.style.backgroundColor = "var(--danger-light)";
                card.style.color = "var(--danger-dark)";
                icon.setAttribute("data-lucide", "alert-triangle");
            }
            if (window.lucide) lucide.createIcons();

            let formulaStr = "";
            if (poisonType.includes("шоколад") || poisonType.includes("порошок") || poisonType.includes("випікання")) {
                let factor = 5.5;
                if (poisonType === "Молочний шоколад") factor = 2.0;
                else if (poisonType === "Білий шоколад") factor = 0.25;
                else if (poisonType === "Какао-порошок") factor = 26.0;
                else if (poisonType === "Шоколад для випікання") factor = 16.0;

                formulaStr = `Доза = (Кількість (${amount} г) * Концентрація (${factor} мг/г)) / Вага (${weight} кг) = ${data.dose_mg_kg.toFixed(2)} мг/кг`;
            } else if (poisonType === "Ксилітол") {
                formulaStr = `Доза = (Кількість ксилітолу (${amount} г) * 1000) / Вага (${weight} кг) = ${data.dose_mg_kg.toFixed(2)} мг/кг`;
            } else if (poisonType === "Виноград / Родзинки") {
                formulaStr = `Доза = Кількість (${amount} г) / Вага (${weight} кг) = ${data.dose_mg_kg.toFixed(2)} г/кг`;
            }
            
            if (isOffline) {
                formulaStr += ` [${SVG_ICONS.wifiOff} Автономно]`;
            }
            document.getElementById('math-toxicity-formula').innerHTML = formulaStr;
        };

        const runLocal = () => {
            try {
                const data = calculateToxicityLocal(weight, poisonType, amount);
                updateUI(data, true);
            } catch (err) {
                showToxicityError("❌ Помилка: " + err.message);
            }
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-toxicity/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                poison_type: poisonType,
                amount_g: amount
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            updateUI(data, false);
        })
        .catch(err => {
            console.warn("Помилка Toxicity API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showToxicityError(msg) {
        const errorBanner = document.getElementById('toxicity-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetToxicityResults();
    }

    function resetToxicityResults() {
        document.getElementById('toxicity-res-dose').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мг/кг</span>`;
        document.getElementById('toxicity-res-active').textContent = "Невідомо";
        
        const card = document.getElementById('toxicity-severity-card');
        const icon = document.getElementById('toxicity-severity-icon');
        const severityEl = document.getElementById('toxicity-res-severity');
        const recEl = document.getElementById('toxicity-res-recommendations');
        
        severityEl.textContent = "Розрахунок припинено";
        recEl.textContent = "Введіть коректні параметри пацієнта.";
        card.className = "success-card";
        card.style.borderLeft = "4px solid var(--primary)";
        card.style.backgroundColor = "";
        card.style.color = "";
        icon.setAttribute("data-lucide", "info");
        if (window.lucide) lucide.createIcons();
        
        document.getElementById('math-toxicity-formula').textContent = "Розрахунок припинено.";
    }

    // 3. Аудит сумісності ліків
    function triggerAudit() {
        const checkedBoxes = document.querySelectorAll('input[name="audit-drugs"]:checked');
        const selectedDrugs = Array.from(checkedBoxes).map(cb => cb.value);
        const resultContainer = document.getElementById('compat-audit-result');

        if (selectedDrugs.length < 2) {
            resultContainer.innerHTML = `
                <div class="success-card" style="background-color: var(--dark-light); border-left-color: var(--gray-text);">
                    <div class="success-title" style="color: var(--dark); display: flex; align-items: center; gap: 8px;">${SVG_ICONS.info} <span>Очікування вибору</span></div>
                    <div class="success-text" style="color: var(--gray-text);">Виберіть щонайменше два препарати вище для запуску аудиту сумісності.</div>
                </div>
            `;
            return;
        }

        const runLocal = () => {
            const incompatibilities = [];
            for (let i = 0; i < selectedDrugs.length; i++) {
                for (let j = i + 1; j < selectedDrugs.length; j++) {
                    const d1 = selectedDrugs[i];
                    const d2 = selectedDrugs[j];
                    const audit = (LOCAL_COMPATIBILITY_MATRIX[d1] || {})[d2] || {};
                    if (audit && audit.status === "Несумісний") {
                        incompatibilities.push({
                            drug1: d1,
                            drug2: d2,
                            reason: audit.reason || "Невідома несумісність."
                        });
                    }
                }
            }

            if (incompatibilities.length > 0) {
                let html = `<h3 style="margin: 15px 0 10px 0; color: var(--danger-dark); display: flex; align-items: center; gap: 8px;">${SVG_ICONS.alertTriangle} <span>Виявлені загрози несумісності</span> <span class="offline-notice">[🔌 Автономно]</span>:</h3>`;
                incompatibilities.forEach(inc => {
                    html += `
                        <div class="danger-card">
                            <div class="danger-title" style="display: flex; align-items: center; gap: 8px;">${SVG_ICONS.xCircle} <span>КРИТИЧНИЙ КОНФЛІКТ: ${inc.drug1} + ${inc.drug2}</span></div>
                            <div class="danger-text"><strong>Клінічне обґрунтування несумісності:</strong> ${inc.reason}</div>
                        </div>
                    `;
                });
                resultContainer.innerHTML = html;
            } else {
                resultContainer.innerHTML = `
                    <div class="success-card">
                        <div class="success-title" style="display: flex; align-items: center; gap: 8px;">${SVG_ICONS.checkCircle} <span>Безпечна комбінація підтверджена</span> <span class="offline-notice">[🔌 Автономно]</span></div>
                        <div class="success-text">Суміш препаратів (${selectedDrugs.join(', ')}) є хімічно та фізично сумісною за базовою матрицею.</div>
                    </div>
                `;
            }
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/audit-compatibility/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selected_drugs: selectedDrugs })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "Incompatible") {
                let html = `<h3 style="margin: 15px 0 10px 0; color: var(--danger-dark); display: flex; align-items: center; gap: 8px;">${SVG_ICONS.alertTriangle} <span>Виявлені загрози несумісності:</span></h3>`;
                data.incompatibilities.forEach(inc => {
                    html += `
                        <div class="danger-card">
                            <div class="danger-title" style="display: flex; align-items: center; gap: 8px;">${SVG_ICONS.xCircle} <span>КРИТИЧНИЙ КОНФЛІКТ: ${inc.drug1} + ${inc.drug2}</span></div>
                            <div class="danger-text"><strong>Клінічне обґрунтування несумісності:</strong> ${inc.reason}</div>
                        </div>
                    `;
                });
                resultContainer.innerHTML = html;
            } else {
                resultContainer.innerHTML = `
                    <div class="success-card">
                        <div class="success-title" style="display: flex; align-items: center; gap: 8px;">${SVG_ICONS.checkCircle} <span>Безпечна комбінація підтверджена</span></div>
                        <div class="success-text">${data.message}</div>
                    </div>
                `;
            }
        })
        .catch(err => {
            console.warn("Помилка сумісності API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    // 4. Розрахунок інфузійної терапії (Гідратація)
    function runFluidCalculation() {
        const weight = parseFloat(document.getElementById('fluid-weight').value) || 0;
        const dehydration = parseFloat(document.getElementById('fluid-dehydration').value) || 0;
        const maintenance = parseFloat(document.getElementById('fluid-maintenance').value) || 0;
        const losses = parseFloat(document.getElementById('fluid-losses').value) || 0;
        const dripFactor = parseInt(document.getElementById('fluid-drip-factor').value) || 20;
        const errorBanner = document.getElementById('fluid-error-banner');

        if (weight <= 0) {
            showFluidError("❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.");
            return;
        }
        if (dehydration < 0 || dehydration > 15) {
            showFluidError("❌ Помилка валідації: Дефіцит зневоднення має бути в межах від 0% до 15%.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculateFluidLocal(weight, dehydration, maintenance, losses, dripFactor);
            document.getElementById('fluid-res-deficit').innerHTML = `${data.dehydration_deficit_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
            document.getElementById('fluid-res-maintenance').innerHTML = `${data.maintenance_ml_day.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/добу</span>`;
            document.getElementById('fluid-res-total').innerHTML = `${data.total_fluid_required_ml_day.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/добу</span>`;
            document.getElementById('fluid-res-rate').innerHTML = `${data.hourly_fluid_rate_ml_hr.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/год</span>`;
            document.getElementById('fluid-res-drip').innerHTML = `${data.drops_per_minute.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">крапель/хв</span>`;

            document.getElementById('math-fluid-deficit').innerHTML = `Deficit = ${weight} кг * (${dehydration} / 100) * 1000 = ${data.dehydration_deficit_ml.toFixed(2)} мл рідини <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;
            document.getElementById('math-fluid-maintenance').textContent = `Maintenance = ${weight} кг * ${maintenance} мл/кг/добу = ${data.maintenance_ml_day.toFixed(2)} мл/добу`;
            document.getElementById('math-fluid-total').textContent = `Total = ${data.dehydration_deficit_ml.toFixed(2)} мл (дефіцит) + ${data.maintenance_ml_day.toFixed(2)} мл (потреба) + ${losses} мл (втрати) = ${data.total_fluid_required_ml_day.toFixed(2)} мл/добу`;
            document.getElementById('math-fluid-rate-drip').innerHTML = `Потік = ${data.total_fluid_required_ml_day.toFixed(2)} мл / 24 год = <strong>${data.hourly_fluid_rate_ml_hr.toFixed(2)} мл/год</strong><br>` +
                `Краплі = (${data.hourly_fluid_rate_ml_hr.toFixed(2)} мл/год * ${dripFactor} кр/мл) / 60 = <strong>${data.drops_per_minute.toFixed(2)} крапель/хв</strong>`;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-fluid-therapy/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                dehydration_percent: dehydration,
                maintenance_rate_ml_kg_day: maintenance,
                ongoing_losses_ml_day: losses,
                drip_factor: dripFactor
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            const deficit = data.dehydration_deficit_ml !== undefined ? data.dehydration_deficit_ml : data.fluid_deficit_ml;
            const total = data.total_fluid_required_ml_day !== undefined ? data.total_fluid_required_ml_day : data.total_volume_ml_day;
            const rate = data.hourly_fluid_rate_ml_hr !== undefined ? data.hourly_fluid_rate_ml_hr : data.infusion_rate_ml_hr;

            document.getElementById('fluid-res-deficit').innerHTML = `${deficit.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
            document.getElementById('fluid-res-maintenance').innerHTML = `${data.maintenance_ml_day.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/добу</span>`;
            document.getElementById('fluid-res-total').innerHTML = `${total.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/добу</span>`;
            document.getElementById('fluid-res-rate').innerHTML = `${rate.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл/год</span>`;
            document.getElementById('fluid-res-drip').innerHTML = `${data.drops_per_minute.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">крапель/хв</span>`;

            document.getElementById('math-fluid-deficit').textContent = `Deficit = ${weight} кг * (${dehydration} / 100) * 1000 = ${deficit.toFixed(2)} мл рідини`;
            document.getElementById('math-fluid-maintenance').textContent = `Maintenance = ${weight} кг * ${maintenance} мл/кг/добу = ${data.maintenance_ml_day.toFixed(2)} мл/добу`;
            document.getElementById('math-fluid-total').textContent = `Total = ${deficit.toFixed(2)} мл (дефіцит) + ${data.maintenance_ml_day.toFixed(2)} мл (потреба) + ${losses} мл (втрати) = ${total.toFixed(2)} мл/добу`;
            document.getElementById('math-fluid-rate-drip').innerHTML = `Потік = ${total.toFixed(2)} мл / 24 год = <strong>${rate.toFixed(2)} мл/год</strong><br>` +
                `Краплі = (${rate.toFixed(2)} мл/год * ${dripFactor} кр/мл) / 60 = <strong>${data.drops_per_minute.toFixed(2)} крапель/хв</strong>`;
        })
        .catch(err => {
            console.warn("Помилка рідини API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showFluidError(msg) {
        const errorBanner = document.getElementById('fluid-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetFluidResults();
    }

    function resetFluidResults() {
        document.getElementById('fluid-res-deficit').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
        document.getElementById('fluid-res-maintenance').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл/добу</span>`;
        document.getElementById('fluid-res-total').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл/добу</span>`;
        document.getElementById('fluid-res-rate').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл/год</span>`;
        document.getElementById('fluid-res-drip').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">крапель/хв</span>`;
        document.getElementById('math-fluid-deficit').textContent = "Розрахунок скасовано.";
        document.getElementById('math-fluid-maintenance').textContent = "Розрахунок скасовано.";
        document.getElementById('math-fluid-total').textContent = "Розрахунок скасовано.";
        document.getElementById('math-fluid-rate-drip').textContent = "Розрахунок скасовано.";
    }

    // 5. Розрахунок безпеки калію (K-max)
    function runPotassiumCalculation() {
        const weight = parseFloat(document.getElementById('k-weight').value) || 0;
        const bagVolume = parseFloat(document.getElementById('k-bag-volume').value) || 0;
        const infusionRate = parseFloat(document.getElementById('k-infusion-rate').value) || 0;
        const targetDose = parseFloat(document.getElementById('k-target-dose').value) || 0;
        const ampouleConc = parseFloat(document.getElementById('k-ampoule-conc').value) || 2.0;

        const errorBanner = document.getElementById('potassium-error-banner');
        const safetyAlert = document.getElementById('k-safety-alert');

        if (weight <= 0) {
            showPotassiumError("❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.");
            return;
        }
        if (bagVolume <= 0) {
            showPotassiumError("❌ Помилка валідації: Об'єм флакону розчину повинен бути строго більше 0 мл.");
            return;
        }
        if (infusionRate <= 0) {
            showPotassiumError("❌ Помилка валідації: Швидкість інфузії повинна бути строго більше 0 мл/год.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculatePotassiumLocal(weight, bagVolume, infusionRate, targetDose, ampouleConc);
            document.getElementById('k-res-hourly-dose').innerHTML = `${data.hourly_k_delivered_meq_hr.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв/год</span>`;
            document.getElementById('k-res-conc-in-fluid').innerHTML = `${data.required_k_concentration_meq_ml.toFixed(4)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв/мл</span>`;
            document.getElementById('k-res-total-needed').innerHTML = `${data.total_k_needed_for_bag_meq.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв</span>`;
            document.getElementById('k-res-volume-added').innerHTML = `${data.kcl_volume_to_add_ml.toFixed(2)} <span style="font-size: 1.1rem; color: var(--gray-text);">мл</span>`;

            if (data.is_safe) {
                safetyAlert.className = "success-card";
                safetyAlert.style.borderLeft = "4px solid var(--success)";
                safetyAlert.innerHTML = `
                    <div class="success-title">${SVG_ICONS.checkCircle} <span>Показники безпеки в межах норми</span> <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span></div>
                    <div class="success-text">Введена швидкість калію (${targetDose.toFixed(2)} мЕкв/кг/год) не перевищує ліміт K-max (0.5 мЕкв/кг/год). Серцевий ритм у безпеці.</div>
                `;
            } else {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
                safetyAlert.innerHTML = `
                    <div class="danger-title" style="color: var(--danger-dark); font-weight: bold;">${SVG_ICONS.alertTriangle} <span>КРИТИЧНЕ ПОПЕРЕДЖЕННЯ: ПЕРЕВИЩЕНО K-MAX ЛІМІТ!</span> <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span></div>
                    <div class="danger-text" style="color: var(--danger-dark); font-weight: 500;">
                        Розраховане введення калію становить <strong>${targetDose.toFixed(2)} мЕкв/кг/год</strong>, що ПЕРЕВИЩУЄ кардіологічний ліміт безпеки <strong>0.5 мЕкв/кг/год</strong>!<br>
                        Негайне введення цієї суміші може спровокувати смертельну аритмію або зупинку серця! Будь ласка, зменшіть цільову дозу або швидкість інфузії!
                    </div>
                `;
            }

            document.getElementById('math-k-hourly').innerHTML = `D_K = ${targetDose} мЕкв/кг/год * ${weight} кг = ${data.hourly_k_delivered_meq_hr.toFixed(2)} мЕкв/год <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;
            document.getElementById('math-k-conc').textContent = `C_K = ${data.hourly_k_delivered_meq_hr.toFixed(2)} мЕкв/год / ${infusionRate} мл/год = ${data.required_k_concentration_meq_ml.toFixed(4)} мЕкв/мл`;
            document.getElementById('math-k-volume').textContent = `V_KCl = (${data.required_k_concentration_meq_ml.toFixed(4)} мЕкв/мл * ${bagVolume} мл) / ${ampouleConc} мЕкв/мл = ${data.kcl_volume_to_add_ml.toFixed(2)} мл`;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-potassium/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                bag_volume_ml: bagVolume,
                infusion_rate_ml_hr: infusionRate,
                target_k_dose_meq_kg_hr: targetDose,
                k_ampoule_conc_meq_ml: ampouleConc
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            const hourlyK = data.hourly_k_delivered_meq_hr !== undefined ? data.hourly_k_delivered_meq_hr : data.hourly_k_meq_hr;
            const concK = data.required_k_concentration_meq_ml !== undefined ? data.required_k_concentration_meq_ml : data.k_concentration_meq_ml;
            const totalK = data.total_k_needed_for_bag_meq !== undefined ? data.total_k_needed_for_bag_meq : data.total_k_needed_meq;
            const volK = data.kcl_volume_to_add_ml !== undefined ? data.kcl_volume_to_add_ml : data.k_volume_added_ml;

            document.getElementById('k-res-hourly-dose').innerHTML = `${hourlyK.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв/год</span>`;
            document.getElementById('k-res-conc-in-fluid').innerHTML = `${concK.toFixed(4)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв/мл</span>`;
            document.getElementById('k-res-total-needed').innerHTML = `${totalK.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв</span>`;
            document.getElementById('k-res-volume-added').innerHTML = `${volK.toFixed(2)} <span style="font-size: 1.1rem; color: var(--gray-text);">мл</span>`;

            if (data.is_safe) {
                safetyAlert.className = "success-card";
                safetyAlert.style.borderLeft = "4px solid var(--success)";
                safetyAlert.innerHTML = `
                    <div class="success-title">${SVG_ICONS.checkCircle} <span>Показники безпеки в межах норми</span></div>
                    <div class="success-text">Введена швидкість калію (${targetDose.toFixed(2)} мЕкв/кг/год) не перевищує ліміт K-max (0.5 мЕкв/кг/год). Серцевий ритм у безпеці.</div>
                `;
            } else {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
                safetyAlert.innerHTML = `
                    <div class="danger-title" style="color: var(--danger-dark); font-weight: bold;">${SVG_ICONS.alertTriangle} <span>КРИТИЧНЕ ПОПЕРЕДЖЕННЯ: ПЕРЕВИЩЕНО K-MAX ЛІМІТ!</span></div>
                    <div class="danger-text" style="color: var(--danger-dark); font-weight: 500;">
                        Розраховане введення калію становить <strong>${targetDose.toFixed(2)} мЕкв/кг/год</strong>, що ПЕРЕВИЩУЄ кардіологічний ліміт безпеки <strong>0.5 мЕкв/кг/год</strong>!<br>
                        Негайне введення цієї суміші може спровокувати смертельну аритмію або зупинку серця! Будь ласка, зменшіть цільову дозу або швидкість інфузії!
                    </div>
                `;
            }

            document.getElementById('math-k-hourly').textContent = `D_K = ${targetDose} мЕкв/кг/год * ${weight} кг = ${hourlyK.toFixed(2)} мЕкв/год`;
            document.getElementById('math-k-conc').textContent = `C_K = ${hourlyK.toFixed(2)} мЕкв/год / ${infusionRate} мл/год = ${concK.toFixed(4)} мЕкв/мл`;
            document.getElementById('math-k-volume').textContent = `V_KCl = (${concK.toFixed(4)} мЕкв/мл * ${bagVolume} мл) / ${ampouleConc} мЕкв/мл = ${volK.toFixed(2)} мл`;
        })
        .catch(err => {
            console.warn("Помилка калію API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showPotassiumError(msg) {
        const errorBanner = document.getElementById('potassium-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetPotassiumResults();
    }

    function resetPotassiumResults() {
        document.getElementById('k-res-hourly-dose').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мЕкв/год</span>`;
        document.getElementById('k-res-conc-in-fluid').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мЕкв/мл</span>`;
        document.getElementById('k-res-total-needed').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мЕкв</span>`;
        document.getElementById('k-res-volume-added').innerHTML = `0.00 <span style="font-size: 1.1rem; color: var(--gray-text);">мл</span>`;
        document.getElementById('math-k-hourly').textContent = "Розрахунок скасовано.";
        document.getElementById('math-k-conc').textContent = "Розрахунок скасовано.";
        document.getElementById('math-k-volume').textContent = "Розрахунок скасовано.";

        const safetyAlert = document.getElementById('k-safety-alert');
        safetyAlert.className = "success-card";
        safetyAlert.innerHTML = `
            <div class="success-title">${SVG_ICONS.info} <span>Очікування коректних даних</span></div>
            <div class="success-text">Введіть коректні параметри пацієнта для розрахунку калійної безпеки.</div>
        `;
    }

    // 6. Розрахунок CPR (Emergency)
    function runEmergencyCalculation() {
        const weight = parseFloat(document.getElementById('emergency-weight').value) || 0;
        const errorBanner = document.getElementById('emergency-error-banner');

        if (weight <= 0) {
            errorBanner.textContent = "❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.";
            errorBanner.style.display = 'block';
            resetEmergencyResults();
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const drugs = calculateEmergencyLocal(weight);
            
            const adrLow = drugs.adrenaline_low;
            document.getElementById('em-adr-low-mg').textContent = `${adrLow.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-adr-low-ml').textContent = `${adrLow.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-adr-low-info').innerHTML = `${adrLow.safety_notes} <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;

            const adrHigh = drugs.adrenaline_high;
            document.getElementById('em-adr-high-mg').textContent = `${adrHigh.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-adr-high-ml').textContent = `${adrHigh.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-adr-high-info').textContent = adrHigh.safety_notes;

            const atr = drugs.atropine;
            document.getElementById('em-atr-mg').textContent = `${atr.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-atr-ml').textContent = `${atr.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-atr-info').textContent = atr.safety_notes;

            const lidoDog = drugs.lidocaine_dog;
            document.getElementById('em-lido-dog-mg').textContent = `${lidoDog.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-lido-dog-ml').textContent = `${lidoDog.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-lido-dog-info').textContent = lidoDog.safety_notes;

            const lidoCat = drugs.lidocaine_cat;
            document.getElementById('em-lido-cat-mg').textContent = `${lidoCat.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-lido-cat-ml').textContent = `${lidoCat.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-lido-cat-info').textContent = lidoCat.safety_notes;

            const nal = drugs.naloxone;
            document.getElementById('em-nal-mg').textContent = `${nal.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-nal-ml').textContent = `${nal.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-nal-info').textContent = nal.safety_notes;

            const dex = drugs.dexamethasone;
            document.getElementById('em-dex-mg').textContent = `${dex.absolute_dose_mg.toFixed(3)} мг`;
            document.getElementById('em-dex-ml').textContent = `${dex.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-dex-info').textContent = dex.safety_notes;

            const nor = drugs.noradrenaline;
            document.getElementById('em-nor-mg').textContent = nor.absolute_dose_mg.toFixed(3);
            document.getElementById('em-nor-ml').textContent = nor.volume_ml.toFixed(3);
            document.getElementById('em-nor-info').innerHTML = `${nor.safety_notes} <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;

            const dop = drugs.dopamine;
            document.getElementById('em-dop-mg').textContent = dop.absolute_dose_mg.toFixed(3);
            document.getElementById('em-dop-ml').textContent = dop.volume_ml.toFixed(3);
            document.getElementById('em-dop-info').textContent = dop.safety_notes;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-emergency/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight_kg: weight })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            const drugs = data.emergency_drugs || data;
            
            const adrLow = drugs.adrenaline_low;
            const doseLow = adrLow.absolute_dose_mg !== undefined ? adrLow.absolute_dose_mg : adrLow.dose_mg;
            const infoLow = adrLow.safety_notes !== undefined ? adrLow.safety_notes : adrLow.info;
            document.getElementById('em-adr-low-mg').textContent = `${doseLow.toFixed(3)} мг`;
            document.getElementById('em-adr-low-ml').textContent = `${adrLow.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-adr-low-info').textContent = infoLow;

            const adrHigh = drugs.adrenaline_high;
            const doseHigh = adrHigh.absolute_dose_mg !== undefined ? adrHigh.absolute_dose_mg : adrHigh.dose_mg;
            const infoHigh = adrHigh.safety_notes !== undefined ? adrHigh.safety_notes : adrHigh.info;
            document.getElementById('em-adr-high-mg').textContent = `${doseHigh.toFixed(3)} мг`;
            document.getElementById('em-adr-high-ml').textContent = `${adrHigh.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-adr-high-info').textContent = infoHigh;

            const atr = drugs.atropine;
            const doseAtr = atr.absolute_dose_mg !== undefined ? atr.absolute_dose_mg : atr.dose_mg;
            const infoAtr = atr.safety_notes !== undefined ? atr.safety_notes : atr.info;
            document.getElementById('em-atr-mg').textContent = `${doseAtr.toFixed(3)} мг`;
            document.getElementById('em-atr-ml').textContent = `${atr.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-atr-info').textContent = infoAtr;

            const lidoDog = drugs.lidocaine_dog;
            const doseLidoDog = lidoDog.absolute_dose_mg !== undefined ? lidoDog.absolute_dose_mg : lidoDog.dose_mg;
            const infoLidoDog = lidoDog.safety_notes !== undefined ? lidoDog.safety_notes : lidoDog.info;
            document.getElementById('em-lido-dog-mg').textContent = `${doseLidoDog.toFixed(3)} мг`;
            document.getElementById('em-lido-dog-ml').textContent = `${lidoDog.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-lido-dog-info').textContent = infoLidoDog;

            const lidoCat = drugs.lidocaine_cat;
            const doseLidoCat = lidoCat.absolute_dose_mg !== undefined ? lidoCat.absolute_dose_mg : lidoCat.dose_mg;
            const infoLidoCat = lidoCat.safety_notes !== undefined ? lidoCat.safety_notes : lidoCat.info;
            document.getElementById('em-lido-cat-mg').textContent = `${doseLidoCat.toFixed(3)} мг`;
            document.getElementById('em-lido-cat-ml').textContent = `${lidoCat.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-lido-cat-info').textContent = infoLidoCat;

            const nal = drugs.naloxone;
            const doseNal = nal.absolute_dose_mg !== undefined ? nal.absolute_dose_mg : nal.dose_mg;
            const infoNal = nal.safety_notes !== undefined ? nal.safety_notes : nal.info;
            document.getElementById('em-nal-mg').textContent = `${doseNal.toFixed(3)} мг`;
            document.getElementById('em-nal-ml').textContent = `${nal.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-nal-info').textContent = infoNal;

            const dex = drugs.dexamethasone;
            const doseDex = dex.absolute_dose_mg !== undefined ? dex.absolute_dose_mg : dex.dose_mg;
            const infoDex = dex.safety_notes !== undefined ? dex.safety_notes : dex.info;
            document.getElementById('em-dex-mg').textContent = `${doseDex.toFixed(3)} мг`;
            document.getElementById('em-dex-ml').textContent = `${dex.volume_ml.toFixed(3)} мл`;
            document.getElementById('em-dex-info').textContent = infoDex;

            const nor = drugs.noradrenaline;
            const doseNor = nor.absolute_dose_mg !== undefined ? nor.absolute_dose_mg : nor.dose_mg;
            const infoNor = nor.safety_notes !== undefined ? nor.safety_notes : nor.info;
            document.getElementById('em-nor-mg').textContent = doseNor.toFixed(3);
            document.getElementById('em-nor-ml').textContent = nor.volume_ml.toFixed(3);
            document.getElementById('em-nor-info').textContent = infoNor;

            const dop = drugs.dopamine;
            const doseDop = dop.absolute_dose_mg !== undefined ? dop.absolute_dose_mg : dop.dose_mg;
            const infoDop = dop.safety_notes !== undefined ? dop.safety_notes : dop.info;
            document.getElementById('em-dop-mg').textContent = doseDop.toFixed(3);
            document.getElementById('em-dop-ml').textContent = dop.volume_ml.toFixed(3);
            document.getElementById('em-dop-info').textContent = infoDop;
        })
        .catch(err => {
            console.warn("Помилка реанімації API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function resetEmergencyResults() {
        const ids = [
            'em-adr-low-mg', 'em-adr-low-ml',
            'em-adr-high-mg', 'em-adr-high-ml',
            'em-atr-mg', 'em-atr-ml',
            'em-lido-dog-mg', 'em-lido-dog-ml',
            'em-lido-cat-mg', 'em-lido-cat-ml',
            'em-nal-mg', 'em-nal-ml',
            'em-dex-mg', 'em-dex-ml',
            'em-nor-mg', 'em-nor-ml',
            'em-dop-mg', 'em-dop-ml'
        ];
        ids.forEach(id => {
            if (id.includes('nor') || id.includes('dop')) {
                document.getElementById(id).textContent = "0.00";
            } else {
                document.getElementById(id).textContent = id.endsWith('mg') ? "0.00 мг" : "0.00 мл";
            }
        });
        
        const infoIds = [
            'em-adr-low-info', 'em-adr-high-info', 'em-atr-info',
            'em-lido-dog-info', 'em-lido-cat-info', 'em-nal-info', 'em-dex-info',
            'em-nor-info', 'em-dop-info'
        ];
        infoIds.forEach(id => {
            document.getElementById(id).textContent = "Очікування...";
        });
    }

    // 10. Розрахунок наркозу (Anesthesia)
    function runAnesthesiaCalculation() {
        const weight = parseFloat(document.getElementById('anesthesia-weight').value) || 0;
        const species = document.getElementById('anesthesia-species').value;
        const premedicated = document.getElementById('anesthesia-premedicated').checked;
        const errorBanner = document.getElementById('anesthesia-error-banner');

        if (weight <= 0) {
            errorBanner.textContent = "❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.";
            errorBanner.style.display = 'block';
            resetAnesthesiaResults();
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const drugs = calculateAnesthesiaLocal(weight, species, premedicated);
            
            const prop = drugs.propofol;
            document.getElementById('anes-prop-dose-kg').textContent = `${prop.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-prop-mg').textContent = `${prop.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-prop-ml').textContent = `${prop.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-prop-info').innerHTML = `${prop.info} <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span>`;

            const alfax = drugs.alfaxalone;
            document.getElementById('anes-alfax-dose-kg').textContent = `${alfax.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-alfax-mg').textContent = `${alfax.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-alfax-ml').textContent = `${alfax.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-alfax-info').textContent = alfax.info;

            const ket = drugs.ketamine;
            document.getElementById('anes-ket-dose-kg').textContent = `${ket.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-ket-mg').textContent = `${ket.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-ket-ml').textContent = `${ket.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-ket-info').textContent = ket.info;

            const dex = drugs.dexmedetomidine;
            document.getElementById('anes-dex-dose-kg').textContent = `${dex.dose_mg_kg.toFixed(1)} мкг/кг`;
            document.getElementById('anes-dex-mg').textContent = `${dex.dose_mg.toFixed(2)} мкг`;
            document.getElementById('anes-dex-ml').textContent = `${dex.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-dex-info').textContent = dex.info;

            const but = drugs.butorphanol;
            document.getElementById('anes-but-dose-kg').textContent = `${but.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-but-mg').textContent = `${but.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-but-ml').textContent = `${but.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-but-info').textContent = but.info;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-anesthesia/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                species: species,
                premedicated: premedicated
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(drugs => {
            const prop = drugs.propofol;
            document.getElementById('anes-prop-dose-kg').textContent = `${prop.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-prop-mg').textContent = `${prop.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-prop-ml').textContent = `${prop.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-prop-info').textContent = prop.info;

            const alfax = drugs.alfaxalone;
            document.getElementById('anes-alfax-dose-kg').textContent = `${alfax.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-alfax-mg').textContent = `${alfax.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-alfax-ml').textContent = `${alfax.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-alfax-info').textContent = alfax.info;

            const ket = drugs.ketamine;
            document.getElementById('anes-ket-dose-kg').textContent = `${ket.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-ket-mg').textContent = `${ket.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-ket-ml').textContent = `${ket.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-ket-info').textContent = ket.info;

            const dex = drugs.dexmedetomidine;
            document.getElementById('anes-dex-dose-kg').textContent = `${dex.dose_mg_kg.toFixed(1)} мкг/кг`;
            document.getElementById('anes-dex-mg').textContent = `${dex.dose_mg.toFixed(2)} мкг`;
            document.getElementById('anes-dex-ml').textContent = `${dex.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-dex-info').textContent = dex.info;

            const but = drugs.butorphanol;
            document.getElementById('anes-but-dose-kg').textContent = `${but.dose_mg_kg.toFixed(1)} мг/кг`;
            document.getElementById('anes-but-mg').textContent = `${but.dose_mg.toFixed(2)} мг`;
            document.getElementById('anes-but-ml').textContent = `${but.volume_ml.toFixed(2)} мл`;
            document.getElementById('anes-but-info').textContent = but.info;
        })
        .catch(err => {
            console.warn("Помилка наркозу API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function resetAnesthesiaResults() {
        const ids = [
            'anes-prop-mg', 'anes-prop-ml',
            'anes-alfax-mg', 'anes-alfax-ml',
            'anes-ket-mg', 'anes-ket-ml',
            'anes-dex-mg', 'anes-dex-ml',
            'anes-but-mg', 'anes-but-ml'
        ];
        ids.forEach(id => {
            document.getElementById(id).textContent = id.includes('dex-mg') ? "0.00 мкг" : (id.endsWith('mg') ? "0.00 мг" : "0.00 мл");
        });

        const infoIds = [
            'anes-prop-info', 'anes-alfax-info', 'anes-ket-info', 'anes-dex-info', 'anes-but-info'
        ];
        infoIds.forEach(id => {
            document.getElementById(id).textContent = "Очікування...";
        });
    }

    // 11. Розрахунок гемотрансфузії (Blood Transfusion)
    function runTransfusionCalculation() {
        const weight = parseFloat(document.getElementById('transfusion-weight').value) || 0;
        const species = document.getElementById('transfusion-species').value;
        const patientHt = parseFloat(document.getElementById('transfusion-patient-ht').value) || 0;
        const targetHt = parseFloat(document.getElementById('transfusion-target-ht').value) || 0;
        const donorHt = parseFloat(document.getElementById('transfusion-donor-ht').value) || 0;
        const factor = parseFloat(document.getElementById('transfusion-factor').value) || 0;
        const errorBanner = document.getElementById('transfusion-error-banner');

        if (weight <= 0) {
            showTransfusionError("❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.");
            return;
        }
        if (patientHt < 0 || patientHt >= 100) {
            showTransfusionError("❌ Помилка валідації: Гематокрит пацієнта має бути в межах від 0% до 99%.");
            return;
        }
        if (targetHt <= patientHt || targetHt >= 100) {
            showTransfusionError("❌ Помилка валідації: Цільовий гематокрит має бути більше почного та менше 100%.");
            return;
        }
        if (donorHt <= 0 || donorHt >= 100) {
            showTransfusionError("❌ Помилка валідації: Гематокрит донорської крові має бути строго більше 0% та менше 100%.");
            return;
        }
        if (factor <= 0) {
            showTransfusionError("❌ Помилка валідації: Коефіцієнт об'єму крові має бути строго більше 0 мл/кг.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculateTransfusionLocal(weight, species, patientHt, targetHt, donorHt, factor);
            document.getElementById('transfusion-res-volume').innerHTML = `${data.required_volume_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
            document.getElementById('transfusion-res-deficit-ratio').innerHTML = `${data.hematocrit_deficit_pct.toFixed(1)} <span style="font-size: 1rem; color: var(--gray-text);">%</span>`;

            const formulaText = `Об'єм = ${weight} кг * ${factor} мл/кг * ((${targetHt}% - ${patientHt}%) / ${donorHt}%) <span class="offline-notice">[🔌 Автономно]</span><br>` +
                                `Об'єм = ${weight} кг * ${factor} * (${data.hematocrit_deficit_pct.toFixed(1)} / ${donorHt}) = ${data.required_volume_ml.toFixed(2)} мл`;
            document.getElementById('math-transfusion-formula').innerHTML = formulaText;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-transfusion/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                species: species,
                patient_ht: patientHt,
                target_ht: targetHt,
                donor_ht: donorHt,
                blood_volume_factor: factor
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            document.getElementById('transfusion-res-volume').innerHTML = `${data.required_volume_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
            document.getElementById('transfusion-res-deficit-ratio').innerHTML = `${data.hematocrit_deficit_pct.toFixed(1)} <span style="font-size: 1rem; color: var(--gray-text);">%</span>`;

            const formulaText = `Об'єм = ${weight} кг * ${factor} мл/кг * ((${targetHt}% - ${patientHt}%) / ${donorHt}%)<br>` +
                                `Об'єм = ${weight} кг * ${factor} * (${data.hematocrit_deficit_pct.toFixed(1)} / ${donorHt}) = ${data.required_volume_ml.toFixed(2)} мл`;
            document.getElementById('math-transfusion-formula').innerHTML = formulaText;
        })
        .catch(err => {
            console.warn("Помилка трансфузії API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showTransfusionError(msg) {
        const errorBanner = document.getElementById('transfusion-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetTransfusionResults();
    }

    function resetTransfusionResults() {
        document.getElementById('transfusion-res-volume').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
        document.getElementById('transfusion-res-deficit-ratio').innerHTML = `0.0 <span style="font-size: 1rem; color: var(--gray-text);">%</span>`;
        document.getElementById('math-transfusion-formula').innerHTML = "Розрахунок...";
    }

    // 7. Розрахунок дефіциту бікарбонату NaHCO3
    function runBicarbonateCalculation() {
        const weight = parseFloat(document.getElementById('bicarbonate-weight').value) || 0;
        const inputType = document.getElementById('bicarbonate-input-type').value;
        const value = parseFloat(document.getElementById('bicarbonate-value').value) || 0;
        const errorBanner = document.getElementById('bicarbonate-error-banner');
        const safetyAlert = document.getElementById('bicarbonate-safety-alert');
        const safetyText = document.getElementById('bicarbonate-safety-text');
        
        // Оновлюємо текст лебеля відповідно до типу вхідного показника
        const valueLabel = document.getElementById('bicarbonate-value-label');
        if (inputType === 'base_deficit') {
            valueLabel.textContent = "Значення дефіциту основ (мЕкв/л)";
        } else {
            valueLabel.textContent = "Виміряний рівень HCO3 (мЕкв/л)";
        }

        if (weight <= 0) {
            showBicarbonateError("❌ Помилка валідації: Вага пацієнта повинна бути строго більше 0 кг.");
            return;
        }
        if (value < 0) {
            showBicarbonateError("❌ Помилка валідації: Введене клінічне значення не може бути меншим за 0.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculateBicarbonateLocal(weight, inputType, value);
            document.getElementById('bicarbonate-res-deficit').innerHTML = `${data.bicarbonate_deficit_meq.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв</span>`;
            document.getElementById('bicarbonate-res-volume').innerHTML = `${data.bicarbonate_volume_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
            
            safetyAlert.className = "success-card";
            safetyAlert.style.borderLeft = "4px solid var(--primary)";
            safetyText.innerHTML = `${SVG_ICONS.info} <span><strong>Протокол корекції:</strong> ${data.safety_notes} <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span></span>`;

            let formulaText = "";
            if (inputType === "base_deficit") {
                formulaText = `Deficit = 0.3 * ${weight} кг * ${value} мЕкв/л = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            } else {
                formulaText = `Deficit = 0.3 * ${weight} кг * (24 - ${value} мЕкв/л) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            }
            document.getElementById('math-bicarbonate-formula').innerHTML = formulaText;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-bicarbonate/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weight_kg: weight,
                input_type: inputType,
                input_value: value
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            document.getElementById('bicarbonate-res-deficit').innerHTML = `${data.bicarbonate_deficit_meq.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мЕкв</span>`;
            document.getElementById('bicarbonate-res-volume').innerHTML = `${data.bicarbonate_volume_ml.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
            
            safetyAlert.className = "success-card";
            safetyAlert.style.borderLeft = "4px solid var(--primary)";
            safetyText.innerHTML = `${SVG_ICONS.info} <span><strong>Протокол корекції:</strong> ${data.safety_notes}</span>`;

            let formulaText = "";
            if (inputType === "base_deficit") {
                formulaText = `Deficit = 0.3 * ${weight} кг * ${value} мЕкв/л = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв<br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            } else {
                formulaText = `Deficit = 0.3 * ${weight} кг * (24 - ${value} мЕкв/л) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв<br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            }
            document.getElementById('math-bicarbonate-formula').innerHTML = formulaText;
        })
        .catch(err => {
            console.warn("Помилка бікарбонату API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showBicarbonateError(msg) {
        const errorBanner = document.getElementById('bicarbonate-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetBicarbonateResults();
    }

    function resetBicarbonateResults() {
        document.getElementById('bicarbonate-res-deficit').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мЕкв</span>`;
        document.getElementById('bicarbonate-res-volume').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мл</span>`;
        document.getElementById('math-bicarbonate-formula').textContent = "Розрахунок припинено.";
        document.getElementById('bicarbonate-safety-text').textContent = "Введіть параметри пацієнта для формування протоколу.";
    }

    // 8. Розрахунок коригованого кальцію за альбуміном
    function runCalciumCalculation() {
        const species = document.getElementById('calcium-species').value;
        const totalCa = parseFloat(document.getElementById('calcium-total-ca').value) || 0;
        const albumin = parseFloat(document.getElementById('calcium-albumin').value) || 0;
        const errorBanner = document.getElementById('calcium-error-banner');
        const safetyAlert = document.getElementById('calcium-safety-alert');
        const safetyText = document.getElementById('calcium-safety-text');

        if (totalCa <= 0 || albumin <= 0) {
            showCalciumError("❌ Помилка валідації: Показники загального кальцію та альбуміну мають бути строго більше 0.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculateAdjustedCalciumLocal(species, totalCa, albumin);
            document.getElementById('calcium-res-mg').innerHTML = `${data.adjusted_calcium_mg_dl.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мг/дл</span>`;
            document.getElementById('calcium-res-mmol').innerHTML = `${data.adjusted_calcium_mmol_l.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">ммоль/л</span>`;
            
            if (data.status === "Гіпокальціємія") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger)";
            } else if (data.status === "Гіперкальціємія") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
            } else {
                safetyAlert.className = "success-card";
                safetyAlert.style.borderLeft = "4px solid var(--success)";
            }
            safetyText.innerHTML = `${SVG_ICONS.info} <span><strong>[${data.status}]</strong> ${data.notes} <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span></span>`;

            let formulaText = "";
            if (species === "Кіт") {
                formulaText = `Ca_adj = ${totalCa} мг/дл - (0.63 * ${albumin} г/дл) + 2.1 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            } else {
                formulaText = `Ca_adj = ${totalCa} мг/дл - ${albumin} г/дл + 3.5 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            }
            document.getElementById('math-calcium-formula').innerHTML = formulaText;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-adjusted-calcium/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                species: species,
                total_calcium: totalCa,
                albumin: albumin
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            document.getElementById('calcium-res-mg').innerHTML = `${data.adjusted_calcium_mg_dl.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">мг/дл</span>`;
            document.getElementById('calcium-res-mmol').innerHTML = `${data.adjusted_calcium_mmol_l.toFixed(2)} <span style="font-size: 1rem; color: var(--gray-text);">ммоль/л</span>`;
            
            if (data.status === "Гіпокальціємія") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger)";
            } else if (data.status === "Гіперкальціємія") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
            } else {
                safetyAlert.className = "success-card";
                safetyAlert.style.borderLeft = "4px solid var(--success)";
            }
            safetyText.innerHTML = `${SVG_ICONS.info} <span><strong>[${data.status}]</strong> ${data.notes}</span>`;

            let formulaText = "";
            if (species === "Кіт") {
                formulaText = `Ca_adj = ${totalCa} мг/дл - (0.63 * ${albumin} г/дл) + 2.1 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл<br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            } else {
                formulaText = `Ca_adj = ${totalCa} мг/дл - ${albumin} г/дл + 3.5 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл<br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            }
            document.getElementById('math-calcium-formula').innerHTML = formulaText;
        })
        .catch(err => {
            console.warn("Помилка кальцію API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showCalciumError(msg) {
        const errorBanner = document.getElementById('calcium-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetCalciumResults();
    }

    function resetCalciumResults() {
        document.getElementById('calcium-res-mg').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">мг/дл</span>`;
        document.getElementById('calcium-res-mmol').innerHTML = `0.00 <span style="font-size: 1rem; color: var(--gray-text);">ммоль/л</span>`;
        document.getElementById('math-calcium-formula').textContent = "Розрахунок припинено.";
        document.getElementById('calcium-safety-text').textContent = "Введіть показники кальцію та альбуміну тварини.";
    }

    // 9. Розрахунок осмолярності плазми
    function runOsmolalityCalculation() {
        const sodium = parseFloat(document.getElementById('osmolality-sodium').value) || 0;
        const glucose = parseFloat(document.getElementById('osmolality-glucose').value) || 0;
        const glucoseUnit = document.getElementById('osmolality-glucose-unit').value;
        const bun = parseFloat(document.getElementById('osmolality-bun').value) || 0;
        const bunUnit = document.getElementById('osmolality-bun-unit').value;
        const errorBanner = document.getElementById('osmolality-error-banner');
        const safetyAlert = document.getElementById('osmolality-safety-alert');
        const safetyText = document.getElementById('osmolality-safety-text');

        if (sodium <= 0 || glucose < 0 || bun < 0) {
            showOsmolalityError("❌ Помилка валідації: Показники натрію мають бути більше 0, глюкоза та сечовина не можуть бути меншими за 0.");
            return;
        }

        errorBanner.style.display = 'none';

        const runLocal = () => {
            const data = calculatePlasmaOsmolalityLocal(sodium, glucose, glucoseUnit, bun, bunUnit);
            document.getElementById('osmolality-res').innerHTML = `${data.osmolality_mosm_kg.toFixed(2)} <span style="font-size: 1.1rem; color: var(--gray-text);">мОсм/кг</span>`;
            
            if (data.status === "Гіпоосмолярність") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger)";
            } else if (data.status === "Гіперосмолярність") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
            } else {
                safetyAlert.className = "success-card";
                safetyAlert.style.borderLeft = "4px solid var(--success)";
            }
            safetyText.innerHTML = `${SVG_ICONS.info} <span><strong>[${data.status}]</strong> ${data.notes} <span class="offline-notice">[${SVG_ICONS.wifiOff} Автономно]</span></span>`;

            let formulaText = `Na_part = 2 * ${sodium} = ${(2 * sodium).toFixed(1)} мЕкв/л<br>` +
                              `Glucose_part = ${glucose} ${glucoseUnit} = ${data.glucose_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `BUN_part = ${bun} ${bunUnit} = ${data.bun_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `Osmolality = 2*Na + Glucose + BUN = ${data.osmolality_mosm_kg.toFixed(2)} мОсм/кг <span class="offline-notice">[🔌 Автономно]</span>`;
            document.getElementById('math-osmolality-formula').innerHTML = formulaText;
        };

        if (!navigator.onLine) {
            runLocal();
            return;
        }

        fetch('/api/calculate-plasma-osmolality/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sodium: sodium,
                glucose: glucose,
                glucose_unit: glucoseUnit,
                bun: bun,
                bun_unit: bunUnit
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("Невідома помилка");
            return response.json();
        })
        .then(data => {
            document.getElementById('osmolality-res').innerHTML = `${data.osmolality_mosm_kg.toFixed(2)} <span style="font-size: 1.1rem; color: var(--gray-text);">мОсм/кг</span>`;
            
            if (data.status === "Гіпоосмолярність") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger)";
            } else if (data.status === "Гіперосмолярність") {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
            } else {
                safetyAlert.className = "success-card";
                safetyAlert.style.borderLeft = "4px solid var(--success)";
            }
            safetyText.innerHTML = `${SVG_ICONS.info} <span><strong>[${data.status}]</strong> ${data.notes}</span>`;

            let formulaText = `Na_part = 2 * ${sodium} = ${(2 * sodium).toFixed(1)} мЕкв/л<br>` +
                              `Glucose_part = ${glucose} ${glucoseUnit} = ${data.glucose_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `BUN_part = ${bun} ${bunUnit} = ${data.bun_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `Osmolality = 2*Na + Glucose + BUN = ${data.osmolality_mosm_kg.toFixed(2)} мОсм/кг`;
            document.getElementById('math-osmolality-formula').innerHTML = formulaText;
        })
        .catch(err => {
            console.warn("Помилка осмолярності API, перехід на офлайн-режим:", err);
            runLocal();
        });
    }

    function showOsmolalityError(msg) {
        const errorBanner = document.getElementById('osmolality-error-banner');
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
        resetOsmolalityResults();
    }

    function resetOsmolalityResults() {
        document.getElementById('osmolality-res').innerHTML = `0.00 <span style="font-size: 1.1rem; color: var(--gray-text);">мОсм/кг</span>`;
        document.getElementById('math-osmolality-formula').textContent = "Розрахунок припинено.";
        document.getElementById('osmolality-safety-text').textContent = "Введіть показники електролітів плазми для розрахунку.";
    }

    // Дебаунс-копії функцій для запобігання перевантаженню процесора при введенні даних
    const debouncedRunCri = debounce(runCriCalculation, 200);
    const debouncedRunBsa = debounce(runBsaCalculation, 200);
    const debouncedRunFluid = debounce(runFluidCalculation, 200);
    const debouncedRunPotassium = debounce(runPotassiumCalculation, 200);
    const debouncedRunEmergency = debounce(runEmergencyCalculation, 200);
    const debouncedRunBicarbonate = debounce(runBicarbonateCalculation, 200);
    const debouncedRunCalcium = debounce(runCalciumCalculation, 200);
    const debouncedRunOsmolality = debounce(runOsmolalityCalculation, 200);
    const debouncedRunAnesthesia = debounce(runAnesthesiaCalculation, 200);
    const debouncedRunTransfusion = debounce(runTransfusionCalculation, 200);
    const debouncedRunToxicity = debounce(runToxicityCalculation, 200);

    // Слухачі подій для реактивних авто-розрахунків при введенні
    const criInputIds = ['cri-weight', 'cri-bag-volume', 'cri-dose', 'cri-dose-unit', 'cri-amp-conc', 'cri-add-vol', 'cri-drip-factor'];
    criInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunCri);
        document.getElementById(id).addEventListener('change', runCriCalculation);
    });

    const bsaInputIds = ['bsa-species', 'bsa-weight', 'bsa-dose'];
    bsaInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunBsa);
        document.getElementById(id).addEventListener('change', runBsaCalculation);
    });

    const fluidInputIds = ['fluid-weight', 'fluid-dehydration', 'fluid-maintenance', 'fluid-losses', 'fluid-drip-factor'];
    fluidInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunFluid);
        document.getElementById(id).addEventListener('change', runFluidCalculation);
    });

    const potassiumInputIds = ['k-weight', 'k-bag-volume', 'k-infusion-rate', 'k-target-dose', 'k-ampoule-conc'];
    potassiumInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunPotassium);
        document.getElementById(id).addEventListener('change', runPotassiumCalculation);
    });

    const kDoseInput = document.getElementById('k-target-dose');
    const kDoseRange = document.getElementById('k-target-dose-range');

    kDoseInput.addEventListener('input', function() {
        kDoseRange.value = this.value;
        debouncedRunPotassium();
    });

    kDoseRange.addEventListener('input', function() {
        kDoseInput.value = this.value;
        debouncedRunPotassium();
    });

    const emergencyInputIds = ['emergency-weight'];
    emergencyInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunEmergency);
        document.getElementById(id).addEventListener('change', runEmergencyCalculation);
    });

    const bicarbonateInputIds = ['bicarbonate-weight', 'bicarbonate-input-type', 'bicarbonate-value'];
    bicarbonateInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunBicarbonate);
        document.getElementById(id).addEventListener('change', runBicarbonateCalculation);
    });

    const calciumInputIds = ['calcium-species', 'calcium-total-ca', 'calcium-albumin'];
    calciumInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunCalcium);
        document.getElementById(id).addEventListener('change', runCalciumCalculation);
    });

    const osmolalityInputIds = ['osmolality-sodium', 'osmolality-glucose', 'osmolality-glucose-unit', 'osmolality-bun', 'osmolality-bun-unit'];
    osmolalityInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunOsmolality);
        document.getElementById(id).addEventListener('change', runOsmolalityCalculation);
    });

    document.getElementById('anesthesia-weight').addEventListener('input', debouncedRunAnesthesia);
    document.getElementById('anesthesia-weight').addEventListener('change', runAnesthesiaCalculation);
    document.getElementById('anesthesia-species').addEventListener('change', runAnesthesiaCalculation);
    document.getElementById('anesthesia-premedicated').addEventListener('change', runAnesthesiaCalculation);

    const transfusionInputIds = ['transfusion-weight', 'transfusion-patient-ht', 'transfusion-target-ht', 'transfusion-donor-ht', 'transfusion-factor'];
    transfusionInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunTransfusion);
        document.getElementById(id).addEventListener('change', runTransfusionCalculation);
    });
    document.getElementById('transfusion-species').addEventListener('change', function() {
        const factorInput = document.getElementById('transfusion-factor');
        switch(this.value) {
            case 'Собака':
            case 'dog':
                factorInput.value = "90.0";
                break;
            case 'Кіт':
            case 'cat':
            case 'Тхір':
            case 'Кролик':
                factorInput.value = "60.0";
                break;
            case 'Морська свинка':
                factorInput.value = "70.0";
                break;
            case 'Гризун':
                factorInput.value = "65.0";
                break;
            default:
                factorInput.value = "60.0";
        }
        runTransfusionCalculation();
    });

    const toxicityInputIds = ['toxicity-weight', 'toxicity-poison-type', 'toxicity-amount'];
    toxicityInputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedRunToxicity);
        document.getElementById(id).addEventListener('change', runToxicityCalculation);
    });



    // ---------------- ЮРИДИЧНА УГОДА ----------------
    function checkLegalConsent() {
        const consent = localStorage.getItem('vet_disclaimer_accepted');
        if (!consent) {
            document.getElementById('legal-modal').classList.add('active');
        }
    }

    function acceptLegalTerms() {
        localStorage.setItem('vet_disclaimer_accepted', 'true');
        document.getElementById('legal-modal').classList.remove('active');
    }

    function openLegalModal() {
        const modal = document.getElementById('legal-modal');
        modal.classList.add('active');
    }

    // ---------------- ОНЛАЙН/ОФЛАЙН МОНІТОРИНГ ----------------
    function updateNetworkStatus() {
        const badge = document.getElementById('network-status');
        if (navigator.onLine) {
            badge.className = 'network-badge network-online';
            badge.innerHTML = `${SVG_ICONS.wifi} <span>Онлайн</span>`;
        } else {
            badge.className = 'network-badge network-offline';
            badge.innerHTML = `${SVG_ICONS.wifiOffLarge} <span>Автономно (Офлайн)</span>`;
        }
        
        // Перераховуємо поточну вкладку при зміні стану мережі для візуальної синхронізації
        runCriCalculation();
        runBsaCalculation();
        runFluidCalculation();
        runPotassiumCalculation();
        runEmergencyCalculation();
        runBicarbonateCalculation();
        runCalciumCalculation();
        runOsmolalityCalculation();
        runAnesthesiaCalculation();
        runTransfusionCalculation();
        runToxicityCalculation();
        triggerAudit();
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // ---------------- РЕЄСТРАЦІЯ PWA SERVICE WORKER ----------------
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('PWA Service Worker зареєстровано з областю дії:', registration.scope);
                    })
                    .catch(err => {
                        console.error('Помилка реєстрації Service Worker:', err);
                    });
            });
        }
    }

    // Первинний запуск при завантаженні для ініціалізації
    document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('vetcalc_theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        updateNetworkStatus();
        registerServiceWorker();
        checkLegalConsent();

        // Ініціалізація локального архіву (IndexedDB)
        initIndexedDB()
            .then(() => {
                renderArchiveTable();
                const searchInput = document.getElementById('archive-search');
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        renderArchiveTable(this.value);
                    });
                }
            })
            .catch(err => console.error("Не вдалося запустити архів IndexedDB:", err));
    });

    // ---------------- ДРУК ТА PDF ЕКСПОРТ (ЛИСТИ ПРИЗНАЧЕННЯ) ----------------
    window.printTreatmentSheet = function(calculatorType) {
        let title = "";
        let patientDetails = "";
        let contentHtml = "";
        let auditHtml = "";
        let disclaimerHtml = "";
        const currentDateStr = new Date().toLocaleString('uk-UA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        if (calculatorType === 'cri') {
            const weight = document.getElementById('cri-weight').value;
            const bagVol = document.getElementById('cri-bag-volume').value;
            const dose = document.getElementById('cri-dose').value;
            const doseUnit = document.getElementById('cri-dose-unit').value;
            const ampConc = document.getElementById('cri-amp-conc').value;
            const addVol = document.getElementById('cri-add-vol').value;
            const dripFactor = document.getElementById('cri-drip-factor').value;

            const resBagConc = document.getElementById('cri-res-bag-conc').textContent;
            const resInfusionRate = document.getElementById('cri-res-infusion-rate').textContent;
            const resDripRate = document.getElementById('cri-res-drip-rate').textContent;

            const mathHourly = document.getElementById('math-hourly-dose').innerHTML;
            const mathBag = document.getElementById('math-bag-conc').innerHTML;
            const mathFlow = document.getElementById('math-flow-rate').innerHTML;
            const mathDrip = document.getElementById('math-drip-rate').innerHTML;

            title = "Лист призначення: Постійна інфузія (CRI)";
            
            patientDetails = `
                <div class="patient-field"><strong>Вид пацієнта:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Кличка / Власник:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Вага пацієнта:</strong> <span>${weight} кг</span></div>
                <div class="patient-field"><strong>Об'єм флакону:</strong> <span>${bagVol} мл</span></div>
                <div class="patient-field"><strong>Цільова доза:</strong> <span>${dose} ${doseUnit}</span></div>
                <div class="patient-field"><strong>Концентрація препарату:</strong> <span>${ampConc} мг/мл</span></div>
                <div class="patient-field"><strong>Об'єм препарату у флакон:</strong> <span>${addVol} мл</span></div>
                <div class="patient-field"><strong>Фактор крапельниці:</strong> <span>${dripFactor} кр/мл</span></div>
            `;

            contentHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Показник</th>
                            <th style="text-align: center;">Розраховане значення</th>
                            <th>Опис</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Загальна концентрація препарату у флаконі</strong></td>
                            <td class="volume-highlight">${resBagConc}</td>
                            <td>Концентрація розведеного препарату в інфузійному розчині</td>
                        </tr>
                        <tr>
                            <td><strong>Швидкість потоку інфузії</strong></td>
                            <td class="volume-highlight" style="color: #0284c7; background-color: #f0f9ff !important; border-color: #bae6fd !important;">${resInfusionRate}</td>
                            <td>Швидкість для налаштування інфузійного насоса (шприцевого дозатора)</td>
                        </tr>
                        <tr>
                            <td><strong>Швидкість введення крапельниці</strong></td>
                            <td class="volume-highlight" style="color: #1e293b; background-color: #f1f5f9 !important; border-color: #e2e8f0 !important;">${resDripRate}</td>
                            <td>Швидкість пасивного капельного введення</td>
                        </tr>
                    </tbody>
                </table>
            `;

            auditHtml = `
                <div class="audit-box">
                    <h4><strong style="color: #0284c7;">Покроковий математичний аудит розрахунку:</strong></h4>
                    <p><strong>1. Годинне дозування пацієнта:</strong></p>
                    <div class="audit-formula">${mathHourly}</div>
                    <p><strong>2. Концентрація суміші у флаконі:</strong></p>
                    <div class="audit-formula">${mathBag}</div>
                    <p><strong>3. Розрахункова швидкість інфузомату:</strong></p>
                    <div class="audit-formula">${mathFlow}</div>
                    <p><strong>4. Розрахункова швидкість крапельниці:</strong></p>
                    <div class="audit-formula">${mathDrip}</div>
                </div>
            `;
            
            disclaimerHtml = "Перед початком інфузії переконайтеся у сумісності препаратів та правильності заповнення системи інфузійного розчину.";

        } else if (calculatorType === 'fluid') {
            const weight = document.getElementById('fluid-weight').value;
            const dehydration = document.getElementById('fluid-dehydration').value;
            const maintenance = document.getElementById('fluid-maintenance').value;
            const losses = document.getElementById('fluid-losses').value;
            const dripFactor = document.getElementById('fluid-drip-factor').value;

            const resDeficit = document.getElementById('fluid-res-deficit').textContent;
            const resMaint = document.getElementById('fluid-res-maintenance').textContent;
            const resTotal = document.getElementById('fluid-res-total').textContent;
            const resRate = document.getElementById('fluid-res-rate').textContent;
            const resDrip = document.getElementById('fluid-res-drip').textContent;

            const mathDeficit = document.getElementById('math-fluid-deficit').innerHTML;
            const mathMaint = document.getElementById('math-fluid-maintenance').innerHTML;
            const mathTotal = document.getElementById('math-fluid-total').innerHTML;
            const mathRate = document.getElementById('math-fluid-rate').innerHTML;
            const mathDrip = document.getElementById('math-fluid-drip').innerHTML;

            title = "Лист призначення: Інфузійна терапія (Fluid Therapy)";

            patientDetails = `
                <div class="patient-field"><strong>Вид пацієнта:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Кличка / Власник:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Вага пацієнта:</strong> <span>${weight} кг</span></div>
                <div class="patient-field"><strong>Дегідратація:</strong> <span>${dehydration}%</span></div>
                <div class="patient-field"><strong>Підтримуюча доза:</strong> <span>${maintenance} мл/кг/добу</span></div>
                <div class="patient-field"><strong>Патологічні втрати:</strong> <span>${losses} мл/добу</span></div>
                <div class="patient-field"><strong>Фактор крапельниці:</strong> <span>${dripFactor} кр/мл</span></div>
                <div class="patient-field"><strong>Розрахунковий період:</strong> <span>24 години</span></div>
            `;

            contentHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Складова інфузії</th>
                            <th style="text-align: center;">Розрахований об'єм / Швидкість</th>
                            <th>Клінічний опис</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Дефіцит рідини (Rehydration)</strong></td>
                            <td class="volume-highlight" style="color: #475569; background-color: #f8fafc !important; border-color: #cbd5e1 !important;">${resDeficit}</td>
                            <td>Об'єм рідини, необхідний для відновлення дегідратації пацієнта</td>
                        </tr>
                        <tr>
                            <td><strong>Фізіологічна потреба (Maintenance)</strong></td>
                            <td class="volume-highlight" style="color: #475569; background-color: #f8fafc !important; border-color: #cbd5e1 !important;">${resMaint}</td>
                            <td>Добова фізіологічна потреба в рідині для підтримання життєдіяльності</td>
                        </tr>
                        <tr>
                            <td><strong>Загальний необхідний добовий об'єм</strong></td>
                            <td class="volume-highlight">${resTotal}</td>
                            <td>Загальний об'єм інфузії (дефіцит + підтримка + втрати) на добу</td>
                        </tr>
                        <tr>
                            <td><strong>Швидкість потоку інфузомату</strong></td>
                            <td class="volume-highlight" style="color: #0284c7; background-color: #f0f9ff !important; border-color: #bae6fd !important;">${resRate}</td>
                            <td>Швидкість для налаштування інфузомату</td>
                        </tr>
                        <tr>
                            <td><strong>Швидкість введення крапельниці</strong></td>
                            <td class="volume-highlight" style="color: #1e293b; background-color: #f1f5f9 !important; border-color: #e2e8f0 !important;">${resDrip}</td>
                            <td>Пасивне капельне введення розчину</td>
                        </tr>
                    </tbody>
                </table>
            `;

            auditHtml = `
                <div class="audit-box">
                    <h4><strong style="color: #0284c7;">Покроковий математичний аудит гідратації:</strong></h4>
                    <p><strong>1. Дефіцит рідини (Rehydration volume):</strong></p>
                    <div class="audit-formula">${mathDeficit}</div>
                    <p><strong>2. Фізіологічна добова потреба (Maintenance volume):</strong></p>
                    <div class="audit-formula">${mathMaint}</div>
                    <p><strong>3. Загальний необхідний добовий об'єм (Total fluid volume):</strong></p>
                    <div class="audit-formula">${mathTotal}</div>
                    <p><strong>4. Розрахункова швидкість інфузомату (Infusion rate):</strong></p>
                    <div class="audit-formula">${mathRate}</div>
                    <p><strong>5. Розрахункова швидкість крапельниці (Drip rate):</strong></p>
                    <div class="audit-formula">${mathDrip}</div>
                </div>
            `;

            disclaimerHtml = "Необхідно регулярно моніторити клінічний стан пацієнта (ТСС, дихання, тургор шкіри, діурез) під час тривалої інфузійної терапії для запобігання гіпергідратації.";

        } else if (calculatorType === 'cpr') {
            const weight = document.getElementById('emergency-weight').value;

            title = "Лист призначення: Реанімаційні дози (CPR Emergency List)";

            patientDetails = `
                <div class="patient-field"><strong>Вид пацієнта:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Кличка / Власник:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Вага пацієнта:</strong> <span>${weight} кг</span></div>
                <div class="patient-field"><strong>Протокол реанімації:</strong> <span>RECOVER Initiative Guidelines</span></div>
            `;

            let rowsHtml = "";
            const cprDrugs = [
                { name: "Адреналін (Епінефрин) 1 мг/мл", target: "Зупинка серця (Низька доза)", dose: "0.01 мг/кг", mg: document.getElementById('em-adr-low-mg').textContent, ml: document.getElementById('em-adr-low-ml').textContent, info: document.getElementById('em-adr-low-info').textContent },
                { name: "Адреналін (Епінефрин) 1 мг/мл", target: "Зупинка серця (Висока доза)", dose: "0.1 мг/кг", mg: document.getElementById('em-adr-high-mg').textContent, ml: document.getElementById('em-adr-high-ml').textContent, info: document.getElementById('em-adr-high-info').textContent },
                { name: "Атропін сульфат 0.5 мг/мл", target: "Брадикардія, асистолія, CPR", dose: "0.04 мг/кг", mg: document.getElementById('em-atr-mg').textContent, ml: document.getElementById('em-atr-ml').textContent, info: document.getElementById('em-atr-info').textContent },
                { name: "Лідокаїн 2% 20 мг/мл", target: "Шлуночкова аритмія (СОБАКИ)", dose: "2.0 мг/кг", mg: document.getElementById('em-lido-dog-mg').textContent, ml: document.getElementById('em-lido-dog-ml').textContent, info: document.getElementById('em-lido-dog-info').textContent },
                { name: "Лідокаїн 2% 20 мг/мл", target: "Шлуночкова аритмія (КОТИ)", dose: "0.2 мг/кг", mg: document.getElementById('em-lido-cat-mg').textContent, ml: document.getElementById('em-lido-cat-ml').textContent, info: document.getElementById('em-lido-cat-info').textContent },
                { name: "Налоксон 0.4 мг/мл", target: "Передозування опіоїдів, апное", dose: "0.04 мг/кг", mg: document.getElementById('em-nal-mg').textContent, ml: document.getElementById('em-nal-ml').textContent, info: document.getElementById('em-nal-info').textContent },
                { name: "Дексаметазон 4 мг/мл", target: "Анафілактичний шок, криза", dose: "1.0 мг/кг", mg: document.getElementById('em-dex-mg').textContent, ml: document.getElementById('em-dex-ml').textContent, info: document.getElementById('em-dex-info').textContent },
                { name: "Норадреналін (CRI) 1 мг/мл", target: "Вазодилатація, гіпотензія, ALS", dose: "0.1 мкг/кг/хв", mg: document.getElementById('em-nor-mg').textContent + " мг/год", ml: document.getElementById('em-nor-ml').textContent + " мл/год (CRI)", info: document.getElementById('em-nor-info').textContent },
                { name: "Дофамін (CRI) 40 мг/мл", target: "Кардіогенний шок, гіпотензія, ALS", dose: "5.0 мкг/кг/хв", mg: document.getElementById('em-dop-mg').textContent + " мг/год", ml: document.getElementById('em-dop-ml').textContent + " мл/год (CRI)", info: document.getElementById('em-dop-info').textContent }
            ];

            cprDrugs.forEach(drug => {
                const isHighRisk = drug.name.includes("Висока доза") || drug.name.includes("КОТИ") || drug.name.includes("Адреналін");
                const highlightClass = isHighRisk ? "cpr-volume-highlight" : "volume-highlight";
                const infoClean = drug.info.replace('[ Автономно]', '').replace('Автономно', '').replace('[ ]', '').replace('[]', '').trim();
                
                rowsHtml += `
                    <tr>
                        <td><strong>${drug.name}</strong></td>
                        <td>${drug.target}</td>
                        <td>${drug.dose}</td>
                        <td style="font-family: monospace;">${drug.mg}</td>
                        <td class="${highlightClass}">${drug.ml}</td>
                        <td style="font-size: 0.82rem; color: #475569;">${infoClean}</td>
                    </tr>
                `;
            });

            contentHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 22%;">Препарат та конц.</th>
                            <th style="width: 18%;">Показання</th>
                            <th style="width: 10%;">Клін. доза</th>
                            <th style="width: 12%;">Абс. доза</th>
                            <th style="width: 16%; text-align: center;">ОБ'ЄМ ДЛЯ ВВЕДЕННЯ</th>
                            <th style="width: 22%;">Примітки безпеки</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            `;

            disclaimerHtml = "Дозування розраховані для негайного внутрішньовенного (IV) або внутрішньокісткового (IO) введення. У разі відсутності IV/IO доступу, Адреналін, Атропін та Налоксон можуть бути введені ендотрахеально (IT) у подвоєному дозуванні. Норадреналін та Дофамін призначені ВИКЛЮЧНО для постійної внутрішньовенної інфузії (CRI) та потребують інфузомату.";

        } else if (calculatorType === 'anesthesia') {
            const weight = document.getElementById('anesthesia-weight').value;
            const species = document.getElementById('anesthesia-species').value === 'dog' ? 'Собака' : 'Кіт';
            const premedicated = document.getElementById('anesthesia-premedicated').checked ? 'Так (зменшена потреба в анестетиках)' : 'Ні (повна доза індукції)';

            title = "Лист призначення: Розрахунок наркозу та анестезії";

            patientDetails = `
                <div class="patient-field"><strong>Вид пацієнта:</strong> <span>${species}</span></div>
                <div class="patient-field"><strong>Кличка / Власник:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Вага пацієнта:</strong> <span>${weight} кг</span></div>
                <div class="patient-field"><strong>Премедикація:</strong> <span>${premedicated}</span></div>
            `;

            const propDose = document.getElementById('anes-prop-dose-kg').textContent;
            const propMg = document.getElementById('anes-prop-mg').textContent;
            const propMl = document.getElementById('anes-prop-ml').textContent;
            const propInfo = document.getElementById('anes-prop-info').textContent.replace('[ Автономно]', '').replace('Автономно', '').replace('[ ]', '').replace('[]', '').trim();

            const alfaxDose = document.getElementById('anes-alfax-dose-kg').textContent;
            const alfaxMg = document.getElementById('anes-alfax-mg').textContent;
            const alfaxMl = document.getElementById('anes-alfax-ml').textContent;
            const alfaxInfo = document.getElementById('anes-alfax-info').textContent.replace('[ Автономно]', '').replace('Автономно', '').replace('[ ]', '').replace('[]', '').trim();

            const ketDose = document.getElementById('anes-ket-dose-kg').textContent;
            const ketMg = document.getElementById('anes-ket-mg').textContent;
            const ketMl = document.getElementById('anes-ket-ml').textContent;
            const ketInfo = document.getElementById('anes-ket-info').textContent.replace('[ Автономно]', '').replace('Автономно', '').replace('[ ]', '').replace('[]', '').trim();

            const dexDose = document.getElementById('anes-dex-dose-kg').textContent;
            const dexMg = document.getElementById('anes-dex-mg').textContent;
            const dexMl = document.getElementById('anes-dex-ml').textContent;
            const dexInfo = document.getElementById('anes-dex-info').textContent.replace('[ Автономно]', '').replace('Автономно', '').replace('[ ]', '').replace('[]', '').trim();

            const butDose = document.getElementById('anes-but-dose-kg').textContent;
            const butMg = document.getElementById('anes-but-mg').textContent;
            const butMl = document.getElementById('anes-but-ml').textContent;
            const butInfo = document.getElementById('anes-but-info').textContent.replace('[ Автономно]', '').replace('Автономно', '').replace('[ ]', '').replace('[]', '').trim();

            contentHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Препарат</th>
                            <th style="width: 15%;">Цільова доза</th>
                            <th style="width: 20%;">Абсолютна доза</th>
                            <th style="width: 20%; text-align: center;">ОБ'ЄМ ДЛЯ ВВЕДЕННЯ</th>
                            <th style="width: 20%;">Примітки безпеки</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Пропофол 1%</strong><br><span style="font-size: 0.8rem; color: #475569;">10 мг/мл</span></td>
                            <td>${propDose}</td>
                            <td style="font-family: monospace;">${propMg}</td>
                            <td class="volume-highlight" style="color: #16a34a; background-color: #f0fdf4 !important; border-color: #bbf7d0 !important;">${propMl}</td>
                            <td style="font-size: 0.82rem; color: #475569;">${propInfo}</td>
                        </tr>
                        <tr>
                            <td><strong>Альфаксалон</strong><br><span style="font-size: 0.8rem; color: #475569;">10 мг/мл</span></td>
                            <td>${alfaxDose}</td>
                            <td style="font-family: monospace;">${alfaxMg}</td>
                            <td class="volume-highlight">${alfaxMl}</td>
                            <td style="font-size: 0.82rem; color: #475569;">${alfaxInfo}</td>
                        </tr>
                        <tr>
                            <td><strong>Кетамін</strong><br><span style="font-size: 0.8rem; color: #475569;">50 мг/мл</span></td>
                            <td>${ketDose}</td>
                            <td style="font-family: monospace;">${ketMg}</td>
                            <td class="volume-highlight">${ketMl}</td>
                            <td style="font-size: 0.82rem; color: #475569;">${ketInfo}</td>
                        </tr>
                        <tr>
                            <td><strong>Дексмедетомідин</strong><br><span style="font-size: 0.8rem; color: #475569;">0.5 мг/мл</span></td>
                            <td>${dexDose}</td>
                            <td style="font-family: monospace;">${dexMg}</td>
                            <td class="volume-highlight" style="color: #991b1b; background-color: #fef2f2 !important; border-color: #fecaca !important;">${dexMl}</td>
                            <td style="font-size: 0.82rem; color: #475569;">${dexInfo}</td>
                        </tr>
                        <tr>
                            <td><strong>Буторфанол</strong><br><span style="font-size: 0.8rem; color: #475569;">10 мг/мл</span></td>
                            <td>${butDose}</td>
                            <td style="font-family: monospace;">${butMg}</td>
                            <td class="volume-highlight">${butMl}</td>
                            <td style="font-size: 0.82rem; color: #475569;">${butInfo}</td>
                        </tr>
                    </tbody>
                </table>
            `;

            disclaimerHtml = "Анестетики (пропофол, альфаксалон) вводити повільно внутрішньовенно «до ефекту». Проведення премедикації дексмедетомідином у поєднанні з буторфанолом знижує необхідні дози індукції приблизно вдвічі.";
        } else if (calculatorType === 'transfusion') {
            const weight = document.getElementById('transfusion-weight').value;
            const species = document.getElementById('transfusion-species').value;
            const patientHt = document.getElementById('transfusion-patient-ht').value;
            const targetHt = document.getElementById('transfusion-target-ht').value;
            const donorHt = document.getElementById('transfusion-donor-ht').value;
            const factor = document.getElementById('transfusion-factor').value;

            const resVolume = document.getElementById('transfusion-res-volume').textContent;
            const resDeficit = document.getElementById('transfusion-res-deficit-ratio').textContent;
            const mathTransfusion = document.getElementById('math-transfusion-formula').innerHTML;

            title = "Лист призначення: Розрахунок гемотрансфузії";

            patientDetails = `
                <div class="patient-field"><strong>Вид пацієнта:</strong> <span>${species}</span></div>
                <div class="patient-field"><strong>Кличка / Власник:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Вага пацієнта:</strong> <span>${weight} кг</span></div>
                <div class="patient-field"><strong>Поточний гематокрит (Ht):</strong> <span>${patientHt}%</span></div>
                <div class="patient-field"><strong>Цільовий гематокрит (Ht):</strong> <span>${targetHt}%</span></div>
                <div class="patient-field"><strong>Гематокрит донора:</strong> <span>${donorHt}%</span></div>
                <div class="patient-field"><strong>Коефіцієнт об'єму крові:</strong> <span>${factor} мл/кг</span></div>
            `;

            contentHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Параметр</th>
                            <th style="text-align: center;">Розраховане значення</th>
                            <th>Клінічний опис</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Необхідний об'єм донорської крові</strong></td>
                            <td class="volume-highlight">${resVolume}</td>
                            <td>Загальний об'єм цільної крові або pRBC для переливання</td>
                        </tr>
                        <tr>
                            <td><strong>Дефіцит гематокриту для покриття</strong></td>
                            <td class="volume-highlight" style="color: #0284c7; background-color: #f0f9ff !important; border-color: #bae6fd !important;">${resDeficit}</td>
                            <td>Різниця між цільовим та поточним рівнем гематокриту пацієнта</td>
                        </tr>
                    </tbody>
                </table>
            `;

            auditHtml = `
                <div class="audit-box">
                    <h4><strong style="color: #0284c7;">Покроковий математичний аудит розрахунку гемотрансфузії:</strong></h4>
                    <div class="audit-formula">${mathTransfusion}</div>
                </div>
            `;

            disclaimerHtml = "Перед початком трансфузії провести перехресну пробу (crossmatch) та біологичну пробу. Перші 15-30 хв вводити повільно (0.25-0.5 мл/кг/год) під контролем температури, ЧСС та дихання. Завершити трансфузію протягом 4 годин.";
        } else if (calculatorType === 'toxicity') {
            const weight = document.getElementById('toxicity-weight').value;
            const poisonType = document.getElementById('toxicity-poison-type').value;
            const amount = document.getElementById('toxicity-amount').value;

            const resDose = document.getElementById('toxicity-res-dose').textContent;
            const resActive = document.getElementById('toxicity-res-active').textContent;
            const resSeverity = document.getElementById('toxicity-res-severity').textContent;
            const resRecommendations = document.getElementById('toxicity-res-recommendations').textContent;
            const mathToxicity = document.getElementById('math-toxicity-formula').innerHTML;

            title = "Лист призначення: Токсикологічна експертиза";

            patientDetails = `
                <div class="patient-field"><strong>Вид пацієнта:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Кличка / Власник:</strong> <span class="manual-field"></span></div>
                <div class="patient-field"><strong>Вага пацієнта:</strong> <span>${weight} кг</span></div>
                <div class="patient-field"><strong>Токсикант / Отрута:</strong> <span>${poisonType}</span></div>
                <div class="patient-field"><strong>З'їдена кількість:</strong> <span>${amount} г</span></div>
            `;

            contentHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Показник</th>
                            <th style="text-align: center;">Розраховане значення</th>
                            <th>Клінічний опис</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Діюча речовина</strong></td>
                            <td class="volume-highlight" style="color: #475569; background-color: #f8fafc !important; border-color: #cbd5e1 !important;">${resActive}</td>
                            <td>Основний токсичний компонент</td>
                        </tr>
                        <tr>
                            <td><strong>Розрахована доза токсину</strong></td>
                            <td class="volume-highlight">${resDose}</td>
                            <td>Кількість отриманої отрути на одиницю маси тіла пацієнта</td>
                        </tr>
                        <tr>
                            <td><strong>Ступінь загрози</strong></td>
                            <td class="volume-highlight" style="color: #dc2626; background-color: #fef2f2 !important; border-color: #fecaca !important;">${resSeverity}</td>
                            <td>Оцінка ступеня небезпеки для життя</td>
                        </tr>
                    </tbody>
                </table>
                <div class="disclaimer-box" style="margin-top: 15px; border-color: #e2e8f0; background-color: #f8fafc; color: #334155;">
                    <strong>Рекомендований протокол терапії:</strong><br>
                    ${resRecommendations}
                </div>
            `;

            auditHtml = `
                <div class="audit-box">
                    <h4><strong style="color: #0284c7;">Покроковий математичний аудит розрахунку токсичності:</strong></h4>
                    <div class="audit-formula">${mathToxicity}</div>
                </div>
            `;

            disclaimerHtml = "Усі токсикологічні випадки потребують ретельного спостереження. За появи клінічних симптомів негайно розпочніть симптоматичну терапію та підтримуйте роботу життєво важливих органів.";
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Помилка: Блокувальник спливаючих вікон завадив відкриттю листа призначення. Будь ласка, дозвольте спливаючі вікна для цього сайту.");
            return;
        }

        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #fff;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
        }
        .no-print-bar {
            background-color: #f1f5f9;
            padding: 12px 20px;
            margin-bottom: 25px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #cbd5e1;
        }
        .no-print-bar button {
            background-color: #0284c7;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .no-print-bar button:hover {
            background-color: #0369a1;
        }
        .medical-header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .medical-title h1 {
            font-size: 1.5rem;
            color: #0f172a;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .medical-title p {
            font-size: 0.85rem;
            color: #64748b;
            margin: 0;
        }
        .clinic-cross {
            font-size: 2.2rem;
            color: #0284c7;
            line-height: 1;
            font-weight: bold;
        }
        .patient-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        .patient-field {
            font-size: 0.95rem;
        }
        .patient-field strong {
            color: #475569;
        }
        .patient-field span {
            color: #0f172a;
            font-weight: 600;
        }
        .manual-field {
            border-bottom: 1px dashed #94a3b8;
            display: inline-block;
            width: 180px;
            height: 18px;
            vertical-align: bottom;
        }
        .section-title {
            font-size: 1.1rem;
            color: #0f172a;
            border-left: 4px solid #0284c7;
            padding-left: 10px;
            margin: 25px 0 12px 0;
            text-transform: uppercase;
            font-weight: 600;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 10px 12px;
            text-align: left;
            font-size: 0.9rem;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .volume-highlight {
            font-weight: 700;
            font-size: 1.15rem;
            color: #16a34a;
            background-color: #f0fdf4 !important;
            text-align: center;
            border: 1px solid #bbf7d0 !important;
        }
        .cpr-volume-highlight {
            font-weight: 700;
            font-size: 1.15rem;
            color: #dc2626;
            background-color: #fef2f2 !important;
            text-align: center;
            border: 1px solid #fecaca !important;
        }
        .audit-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 0.85rem;
        }
        .audit-box h4 {
            margin: 0 0 10px 0;
            color: #334155;
            font-size: 0.95rem;
        }
        .audit-formula {
            font-family: monospace;
            background-color: #f1f5f9;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 5px 0 12px 0;
            word-break: break-all;
            border-left: 3px solid #cbd5e1;
            color: #0f172a;
        }
        .disclaimer-box {
            border: 1px solid #f87171;
            background-color: #fef2f2;
            border-radius: 8px;
            padding: 12px 15px;
            font-size: 0.88rem;
            color: #991b1b;
            margin-top: 25px;
            line-height: 1.4;
        }
        .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 60px;
            padding-top: 20px;
        }
        .signature-line {
            border-top: 1px solid #94a3b8;
            text-align: center;
            padding-top: 8px;
            font-size: 0.88rem;
            color: #475569;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                padding: 0;
                color: #000;
            }
            .patient-card {
                border: 1px solid #94a3b8;
                background-color: #fff !important;
            }
            .data-table th {
                background-color: #e2e8f0 !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .volume-highlight {
                background-color: #f0fdf4 !important;
                color: #16a34a !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .cpr-volume-highlight {
                background-color: #fef2f2 !important;
                color: #dc2626 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .audit-box {
                border: 1px solid #cbd5e1;
                background-color: #fff !important;
            }
            .audit-formula {
                border: 1px solid #e2e8f0;
                background-color: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .disclaimer-box {
                border: 1px solid #f87171;
                background-color: #fef2f2 !important;
                color: #991b1b !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="no-print-bar no-print">
        <span style="font-size: 0.9rem; color: #475569;">Перед вами лист призначення. Ви можете зберегти його як PDF або роздрукувати на принтері.</span>
        <button onclick="window.print()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8" rx="1"></rect><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path></svg>
            Друк / Зберегти в PDF
        </button>
    </div>

    <div class="medical-header">
        <div class="medical-title">
            <h1>Лист призначення / Карта пацієнта</h1>
            <p>VetCalc - Автоматизована клінічна система розрахунків дозувань</p>
        </div>
        <div class="clinic-cross">✚</div>
    </div>

    <div class="patient-card">
        <div class="patient-field"><strong>Клініка:</strong> <span class="manual-field"></span></div>
        <div class="patient-field"><strong>Лікуючий лікар:</strong> <span class="manual-field"></span></div>
        <div class="patient-field"><strong>Дата та час розрахунку:</strong> <span>${currentDateStr}</span></div>
        <div class="patient-field"><strong>Палата / Бокс:</strong> <span class="manual-field"></span></div>
        ${patientDetails}
    </div>

    <div class="section-title">Розрахункові показники та дози</div>
    ${contentHtml}

    ${auditHtml ? `<div class="section-title">Покроковий аудит та формули</div>${auditHtml}` : ''}

    <div class="disclaimer-box">
        <strong>⚠️ Клінічне попередження та інструкція:</strong> ${disclaimerHtml}
    </div>

    <div class="signature-section">
        <div class="signature-line">Лікар, який розрахував (підпис, ПІБ)</div>
        <div class="signature-line">Лікар, який перевірив (підпис, ПІБ)</div>
    </div>

    <script>
        // Автоматично відкриваємо вікно друку після завантаження
        window.addEventListener('load', () => {
            setTimeout(() => {
                window.print();
            }, 300);
        });
    </script>
</body>
</html>
        `);
        printWindow.document.close();
    };

    // ---------------- ЛОКАЛЬНИЙ АРХІВ ПАЦІЄНТІВ (IndexedDB) ----------------
    const DB_NAME = "VetCalcArchiveDB";
    const DB_VERSION = 1;
    const STORE_NAME = "calculations";
    let db = null;

    function initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error("Помилка відкриття IndexedDB:", event);
                reject(event);
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log("IndexedDB ініціалізовано успішно.");
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const upgradeDb = event.target.result;
                if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
                    const store = upgradeDb.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                    store.createIndex("patientName", "patientName", { unique: false });
                    store.createIndex("ownerName", "ownerName", { unique: false });
                    store.createIndex("calculatorType", "calculatorType", { unique: false });
                    store.createIndex("timestamp", "timestamp", { unique: false });
                    console.log("Створено сховище об'єктів IndexedDB.");
                }
            };
        });
    }

    function addCalculationRecord(record) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("База даних не ініціалізована");
                return;
            }
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    }

    function deleteCalculationRecord(id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("База даних не ініціалізована");
                return;
            }
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(Number(id));
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    function getCalculationRecord(id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("База даних не ініціалізована");
                return;
            }
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(Number(id));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    }

    function fetchAllRecords() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("База даних не ініціалізована");
                return;
            }
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index("timestamp");
            const request = index.openCursor(null, "prev"); // Зворотній порядок (найновіші спочатку)
            const results = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = (e) => reject(e);
        });
    }

    // Відкриття модального вікна збереження
    window.openArchiveSaveModal = function(calculatorType) {
        document.getElementById('archive-save-type').value = calculatorType;
        document.getElementById('archive-save-patient').value = "";
        document.getElementById('archive-save-owner').value = "";
        document.getElementById('archive-save-ward').value = "";
        document.getElementById('archive-save-notes').value = "";
        
        document.getElementById('archive-save-modal').classList.add('active');
    };

    window.closeArchiveSaveModal = function() {
        document.getElementById('archive-save-modal').classList.remove('active');
    };

    // Збереження активного розрахунку
    window.confirmSaveToArchive = function() {
        const patientName = document.getElementById('archive-save-patient').value.trim();
        const ownerName = document.getElementById('archive-save-owner').value.trim();
        const wardBox = document.getElementById('archive-save-ward').value.trim();
        const notes = document.getElementById('archive-save-notes').value.trim();
        const calculatorType = document.getElementById('archive-save-type').value;

        if (!patientName) {
            alert("Помилка: Кличка пацієнта є обов'язковою для збереження в архів.");
            return;
        }

        let weight = 0;
        let species = "Н/Д";
        let inputs = {};
        let results = {};
        let audit = "";

        // Вилучаємо дані залежно від типу калькулятора
        if (calculatorType === 'cri') {
            weight = parseFloat(document.getElementById('cri-weight').value) || 0;
            inputs = {
                bagVolume: parseFloat(document.getElementById('cri-bag-volume').value),
                targetDose: parseFloat(document.getElementById('cri-dose').value),
                targetDoseUnit: document.getElementById('cri-dose-unit').value,
                ampConc: parseFloat(document.getElementById('cri-amp-conc').value),
                addVol: parseFloat(document.getElementById('cri-add-vol').value),
                dripFactor: parseInt(document.getElementById('cri-drip-factor').value)
            };
            results = {
                bagConc: document.getElementById('cri-res-bag-conc').textContent,
                infusionRate: document.getElementById('cri-res-infusion-rate').textContent,
                dripRate: document.getElementById('cri-res-drip-rate').textContent
            };
            audit = document.getElementById('math-bag-conc').parentNode.innerHTML; // Математичний аудит

        } else if (calculatorType === 'fluid') {
            weight = parseFloat(document.getElementById('fluid-weight').value) || 0;
            inputs = {
                dehydration: parseFloat(document.getElementById('fluid-dehydration').value),
                maintenance: parseFloat(document.getElementById('fluid-maintenance').value),
                losses: parseFloat(document.getElementById('fluid-losses').value),
                dripFactor: parseInt(document.getElementById('fluid-drip-factor').value)
            };
            results = {
                deficit: document.getElementById('fluid-res-deficit').textContent,
                maintenance: document.getElementById('fluid-res-maintenance').textContent,
                total: document.getElementById('fluid-res-total').textContent,
                rate: document.getElementById('fluid-res-rate').textContent,
                drip: document.getElementById('fluid-res-drip').textContent
            };
            audit = document.getElementById('math-fluid-deficit').parentNode.innerHTML;

        } else if (calculatorType === 'cpr') {
            weight = parseFloat(document.getElementById('emergency-weight').value) || 0;
            inputs = {};
            results = {
                adrLowMg: document.getElementById('em-adr-low-mg').textContent,
                adrLowMl: document.getElementById('em-adr-low-ml').textContent,
                adrHighMg: document.getElementById('em-adr-high-mg').textContent,
                adrHighMl: document.getElementById('em-adr-high-ml').textContent,
                atrMg: document.getElementById('em-atr-mg').textContent,
                atrMl: document.getElementById('em-atr-ml').textContent,
                lidoDogMg: document.getElementById('em-lido-dog-mg').textContent,
                lidoDogMl: document.getElementById('em-lido-dog-ml').textContent,
                lidoCatMg: document.getElementById('em-lido-cat-mg').textContent,
                lidoCatMl: document.getElementById('em-lido-cat-ml').textContent,
                nalMg: document.getElementById('em-nal-mg').textContent,
                nalMl: document.getElementById('em-nal-ml').textContent,
                dexMg: document.getElementById('em-dex-mg').textContent,
                dexMl: document.getElementById('em-dex-ml').textContent,
                norMg: document.getElementById('em-nor-mg').textContent,
                norMl: document.getElementById('em-nor-ml').textContent,
                dopMg: document.getElementById('em-dop-mg').textContent,
                dopMl: document.getElementById('em-dop-ml').textContent
            };
            audit = "Розраховано за стандартами RECOVER Initiative Guidelines.";

        } else if (calculatorType === 'anesthesia') {
            weight = parseFloat(document.getElementById('anesthesia-weight').value) || 0;
            species = document.getElementById('anesthesia-species').value === 'dog' ? 'Собака' : 'Кіт';
            inputs = {
                premedicated: document.getElementById('anesthesia-premedicated').checked
            };
            results = {
                propDose: document.getElementById('anes-prop-dose-kg').textContent,
                propMg: document.getElementById('anes-prop-mg').textContent,
                propMl: document.getElementById('anes-prop-ml').textContent,
                alfaxDose: document.getElementById('anes-alfax-dose-kg').textContent,
                alfaxMg: document.getElementById('anes-alfax-mg').textContent,
                alfaxMl: document.getElementById('anes-alfax-ml').textContent,
                ketDose: document.getElementById('anes-ket-dose-kg').textContent,
                ketMg: document.getElementById('anes-ket-mg').textContent,
                ketMl: document.getElementById('anes-ket-ml').textContent,
                dexDose: document.getElementById('anes-dex-dose-kg').textContent,
                dexMg: document.getElementById('anes-dex-mg').textContent,
                dexMl: document.getElementById('anes-dex-ml').textContent,
                butDose: document.getElementById('anes-but-dose-kg').textContent,
                butMg: document.getElementById('anes-but-mg').textContent,
                butMl: document.getElementById('anes-but-ml').textContent
            };
            audit = "Дози розраховані для премедикації та індукції наркозу.";

        } else if (calculatorType === 'transfusion') {
            weight = parseFloat(document.getElementById('transfusion-weight').value) || 0;
            species = document.getElementById('transfusion-species').value;
            inputs = {
                patientHt: parseFloat(document.getElementById('transfusion-patient-ht').value),
                targetHt: parseFloat(document.getElementById('transfusion-target-ht').value),
                donorHt: parseFloat(document.getElementById('transfusion-donor-ht').value),
                factor: parseFloat(document.getElementById('transfusion-factor').value)
            };
            results = {
                volume: document.getElementById('transfusion-res-volume').textContent,
                deficit: document.getElementById('transfusion-res-deficit-ratio').textContent
            };
            audit = document.getElementById('math-transfusion-formula').parentNode.innerHTML;
        } else if (calculatorType === 'toxicity') {
            weight = parseFloat(document.getElementById('toxicity-weight').value) || 0;
            inputs = {
                poisonType: document.getElementById('toxicity-poison-type').value,
                amount: parseFloat(document.getElementById('toxicity-amount').value) || 0
            };
            results = {
                dose: document.getElementById('toxicity-res-dose').textContent,
                active: document.getElementById('toxicity-res-active').textContent,
                severity: document.getElementById('toxicity-res-severity').textContent,
                recommendations: document.getElementById('toxicity-res-recommendations').textContent
            };
            audit = document.getElementById('math-toxicity-formula').parentNode.innerHTML;
        }

        const record = {
            patientName: patientName,
            ownerName: ownerName || "Н/Д",
            wardBox: wardBox || "Н/Д",
            notes: notes || "",
            calculatorType: calculatorType,
            timestamp: new Date().toISOString(),
            weight: weight,
            species: species,
            inputs: inputs,
            results: results,
            audit: audit
        };

        addCalculationRecord(record)
            .then(() => {
                closeArchiveSaveModal();
                alert(`Успішно збережено в локальний архів для пацієнта "${patientName}"!`);
                renderArchiveTable(); // Оновлюємо таблицю архіву
            })
            .catch(err => {
                console.error(err);
                alert("Помилка збереження в IndexedDB.");
            });
    };

    // Оновлення таблиці архіву пацієнтів у DOM
    window.renderArchiveTable = function(searchQuery = "") {
        fetchAllRecords()
            .then(records => {
                const tbody = document.getElementById('archive-table-body');
                if (!tbody) return;
                
                tbody.innerHTML = "";
                
                const filtered = records.filter(r => {
                    const q = searchQuery.toLowerCase();
                    return r.patientName.toLowerCase().includes(q) || 
                           r.ownerName.toLowerCase().includes(q) ||
                           r.notes.toLowerCase().includes(q);
                });

                if (filtered.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; color: var(--gray-text); padding: 40px 0;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px; opacity: 0.5;"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="M3.3 7 12 12l8.7-5"></path><path d="M12 22V12"></path></svg>
                                <br>${searchQuery ? "Пацієнтів не знайдено за вашим пошуком." : "Архів порожній. Збережіть розрахунок з будь-якого калькулятора."}
                            </td>
                        </tr>
                    `;
                    return;
                }

                filtered.forEach(record => {
                    const date = new Date(record.timestamp).toLocaleString('uk-UA', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });

                    let typeBadge = "";
                    if (record.calculatorType === 'cri') typeBadge = `<span class="badge" style="background-color: var(--primary-light); color: var(--primary-dark); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Постійна інфузія (CRI)</span>`;
                    else if (record.calculatorType === 'fluid') typeBadge = `<span class="badge" style="background-color: var(--primary-light); color: var(--primary-dark); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Гідратація (Fluids)</span>`;
                    else if (record.calculatorType === 'cpr') typeBadge = `<span class="badge" style="background-color: var(--danger-light); color: var(--danger-dark); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Реанімація (CPR)</span>`;
                    else if (record.calculatorType === 'anesthesia') typeBadge = `<span class="badge" style="background-color: var(--primary-light); color: var(--primary-dark); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Наркоз (Anesthesia)</span>`;
                    else if (record.calculatorType === 'transfusion') typeBadge = `<span class="badge" style="background-color: var(--primary-light); color: var(--primary-dark); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Гемотрансфузія</span>`;
                    else if (record.calculatorType === 'toxicity') typeBadge = `<span class="badge" style="background-color: var(--danger-light); color: var(--danger-dark); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Токсичність</span>`;

                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px 8px; font-size: 0.9rem;">${date}</td>
                            <td style="padding: 12px 8px; font-size: 0.95rem;"><strong>${record.patientName}</strong><br><span style="font-size: 0.82rem; color: var(--gray-text);">Власник: ${record.ownerName}</span></td>
                            <td style="padding: 12px 8px;">${typeBadge}</td>
                            <td style="padding: 12px 8px; font-size: 0.9rem; font-weight: 500;">${record.weight} кг</td>
                            <td style="padding: 12px 8px; text-align: center;">
                                <div style="display: flex; gap: 6px; justify-content: center;">
                                    <button class="sub-chip-btn active" onclick="openArchiveViewModal(${record.id})" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        <span>Перегляд</span>
                                    </button>
                                    <button class="sub-chip-btn" onclick="printArchiveRecord(${record.id})" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; border: 1px solid var(--border);">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8" rx="1"></rect><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path></svg>
                                        <span>Друк</span>
                                    </button>
                                    <button class="sub-chip-btn" onclick="deleteArchiveRecord(${record.id})" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; color: var(--danger-dark); background: var(--danger-light); border: none; display: flex; align-items: center; gap: 4px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                                        <span>Видалити</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                
                if (window.lucide) { lucide.createIcons(); }
            });
    };

    // Відкриття перегляду картки
    window.openArchiveViewModal = function(id) {
        getCalculationRecord(id)
            .then(record => {
                if (!record) return;
                
                document.getElementById('archive-view-title').textContent = `Картка пацієнта: ${record.patientName} (Архів #00${record.id})`;
                
                let detailHtml = `
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; background-color: var(--bg-card); border: 1px solid var(--border); padding: 15px; border-radius: 8px;">
                        <div><strong>Кличка пацієнта:</strong> ${record.patientName}</div>
                        <div><strong>ПІБ Власника:</strong> ${record.ownerName}</div>
                        <div><strong>Палата / Бокс:</strong> ${record.wardBox}</div>
                        <div><strong>Вид пацієнта:</strong> ${record.species || "Н/Д"}</div>
                        <div><strong>Вага:</strong> ${record.weight} кг</div>
                        <div><strong>Дата розрахунку:</strong> ${new Date(record.timestamp).toLocaleString('uk-UA')}</div>
                    </div>
                `;

                if (record.notes) {
                    detailHtml += `
                        <div style="background-color: var(--bg-metric-hover); padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--primary); font-size: 0.92rem;">
                            <strong>Клінічні нотатки лікаря:</strong><br>${record.notes}
                        </div>
                    `;
                }

                // Виводимо специфічні результати
                detailHtml += `<h4>Результати розрахунків:</h4>`;
                
                if (record.calculatorType === 'cri') {
                    detailHtml += `
                        <table class="compatibility-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr><th>Показник</th><th>Обчислено</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Загальна концентрація препарату у флаконі</td><td><strong>${record.results.bagConc}</strong></td></tr>
                                <tr><td>Швидкість потоку інфузії</td><td><strong style="color: var(--primary);">${record.results.infusionRate}</strong></td></tr>
                                <tr><td>Швидкість крапельниці</td><td><strong>${record.results.dripRate}</strong></td></tr>
                            </tbody>
                        </table>
                    `;
                } else if (record.calculatorType === 'fluid') {
                    detailHtml += `
                        <table class="compatibility-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr><th>Показник</th><th>Обчислено</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Дефіцит рідини (Rehydration)</td><td><strong>${record.results.deficit}</strong></td></tr>
                                <tr><td>Фізіологічна потреба (Maintenance)</td><td><strong>${record.results.maintenance}</strong></td></tr>
                                <tr><td>Загальний добовий об'єм</td><td><strong>${record.results.total}</strong></td></tr>
                                <tr><td>Швидкість потоку інфузомату</td><td><strong style="color: var(--primary);">${record.results.rate}</strong></td></tr>
                                <tr><td>Швидкість введення крапельниці</td><td><strong>${record.results.drip}</strong></td></tr>
                            </tbody>
                        </table>
                    `;
                } else if (record.calculatorType === 'cpr') {
                    detailHtml += `
                        <table class="compatibility-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr><th>Препарат</th><th>Доза</th><th>Об'єм для введення</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Адреналін (Низька доза)</td><td>${record.results.adrLowMg}</td><td><strong style="color: var(--success);">${record.results.adrLowMl}</strong></td></tr>
                                <tr><td>Адреналін (Висока доза)</td><td>${record.results.adrHighMg}</td><td><strong style="color: var(--danger-dark);">${record.results.adrHighMl}</strong></td></tr>
                                <tr><td>Атропін сульфат</td><td>${record.results.atrMg}</td><td><strong>${record.results.atrMl}</strong></td></tr>
                                <tr><td>Лідокаїн 2% (Собаки)</td><td>${record.results.lidoDogMg}</td><td><strong>${record.results.lidoDogMl}</strong></td></tr>
                                <tr><td>Лідокаїн 2% (Коти)</td><td>${record.results.lidoCatMg}</td><td><strong style="color: var(--danger-dark);">${record.results.lidoCatMl}</strong></td></tr>
                                <tr><td>Налоксон</td><td>${record.results.nalMg}</td><td><strong>${record.results.nalMl}</strong></td></tr>
                                <tr><td>Дексаметазон</td><td>${record.results.dexMg}</td><td><strong>${record.results.dexMl}</strong></td></tr>
                                <tr><td>Норадреналін (CRI)</td><td>${record.results.norMg} мг/год</td><td><strong style="color: var(--danger-dark);">${record.results.norMl} мл/год (CRI)</strong></td></tr>
                                <tr><td>Дофамін (CRI)</td><td>${record.results.dopMg} мг/год</td><td><strong>${record.results.dopMl} мл/год (CRI)</strong></td></tr>
                            </tbody>
                        </table>
                    `;
                } else if (record.calculatorType === 'anesthesia') {
                    detailHtml += `
                        <table class="compatibility-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr><th>Препарат</th><th>Цільова доза</th><th>Абсолютна доза</th><th>Об'єм (мл)</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Пропофол 1%</td><td>${record.results.propDose}</td><td>${record.results.propMg}</td><td><strong style="color: var(--success);">${record.results.propMl}</strong></td></tr>
                                <tr><td>Альфаксалон</td><td>${record.results.alfaxDose}</td><td>${record.results.alfaxMg}</td><td><strong>${record.results.alfaxMl}</strong></td></tr>
                                <tr><td>Кетамін</td><td>${record.results.ketDose}</td><td>${record.results.ketMg}</td><td><strong>${record.results.ketMl}</strong></td></tr>
                                <tr><td>Дексмедетомідин</td><td>${record.results.dexDose}</td><td>${record.results.dexMg}</td><td><strong style="color: var(--danger-dark);">${record.results.dexMl}</strong></td></tr>
                                <tr><td>Буторфанол</td><td>${record.results.butDose}</td><td>${record.results.butMg}</td><td><strong>${record.results.butMl}</strong></td></tr>
                            </tbody>
                        </table>
                    `;
                } else if (record.calculatorType === 'transfusion') {
                    detailHtml += `
                        <table class="compatibility-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr><th>Параметр</th><th>Обчислено</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Необхідний об'єм донорської крові</td><td><strong style="color: var(--primary);">${record.results.volume}</strong></td></tr>
                                <tr><td>Дефіцит гематокриту для покриття</td><td><strong>${record.results.deficit}</strong></td></tr>
                            </tbody>
                        </table>
                    `;
                } else if (record.calculatorType === 'toxicity') {
                    detailHtml += `
                        <table class="compatibility-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr><th>Параметр</th><th>Обчислено</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Токсикант / Отрута</td><td><strong>${record.inputs.poisonType}</strong></td></tr>
                                <tr><td>З'їдена кількість</td><td><strong>${record.inputs.amount} г</strong></td></tr>
                                <tr><td>Розрахована доза токсину</td><td><strong style="color: var(--primary);">${record.results.dose}</strong></td></tr>
                                <tr><td>Діюча речовина</td><td><strong>${record.results.active}</strong></td></tr>
                                <tr><td>Ступінь загрози</td><td><strong style="color: var(--danger-dark);">${record.results.severity}</strong></td></tr>
                            </tbody>
                        </table>
                        <div style="background-color: var(--bg-metric-hover); padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--danger); font-size: 0.92rem;">
                            <strong>Клінічні рекомендації:</strong><br>${record.results.recommendations}
                        </div>
                    `;
                }

                if (record.audit && record.calculatorType !== 'cpr' && record.calculatorType !== 'anesthesia') {
                    detailHtml += `
                        <div class="math-box" style="margin-top: 15px;">
                            <h4>Математичний аудит розрахунку:</h4>
                            <div style="font-size: 0.88rem; line-height: 1.5;">${record.audit}</div>
                        </div>
                    `;
                }

                document.getElementById('archive-view-body').innerHTML = detailHtml;
                
                // Налаштування кнопок дій у модалці перегляду
                document.getElementById('archive-view-print-btn').onclick = function() {
                    printArchiveRecord(record.id);
                };
                
                document.getElementById('archive-view-restore-btn').onclick = function() {
                    restoreRecordToCalculator(record.id);
                };

                document.getElementById('archive-view-modal').classList.add('active');
                if (window.lucide) { lucide.createIcons(); }
            });
    };

    window.closeArchiveViewModal = function() {
        document.getElementById('archive-view-modal').classList.remove('active');
    };

    // Видалення картки
    window.deleteArchiveRecord = function(id) {
        if (confirm("Ви дійсно хочете безповоротно видалити цей розрахунок з архіву?")) {
            deleteCalculationRecord(id)
                .then(() => {
                    alert("Успішно видалено з архіву.");
                    renderArchiveTable();
                })
                .catch(err => console.error(err));
        }
    };

    // Прямий друк з архіву
    window.printArchiveRecord = function(id) {
        getCalculationRecord(id)
            .then(record => {
                if (!record) return;
                
                // Встановлюємо тимчасово значення в інпути, викликаємо оригінальний друк і потім повертаємо старі значення
                const backup = backupInputs(record.calculatorType);
                populateDOMWithRecord(record);
                
                printTreatmentSheet(record.calculatorType);
                
                // Повертаємо старі значення в DOM через 500мс
                setTimeout(() => {
                    restoreInputsBackup(record.calculatorType, backup);
                }, 500);
            });
    };

    // Відновлення картки безпосередньо в активну форму
    window.restoreRecordToCalculator = function(id) {
        getCalculationRecord(id)
            .then(record => {
                if (!record) return;
                
                populateDOMWithRecord(record);
                closeArchiveViewModal();
                
                // Визначаємо категорію та таб для перемикання
                let cat = "";
                let tab = "";
                if (record.calculatorType === 'cri') { cat = "emergency"; tab = "cri-tab"; }
                else if (record.calculatorType === 'fluid') { cat = "fluids"; tab = "fluid-tab"; }
                else if (record.calculatorType === 'cpr') { cat = "emergency"; tab = "emergency-tab"; }
                else if (record.calculatorType === 'anesthesia') { cat = "emergency"; tab = "anesthesia-tab"; }
                else if (record.calculatorType === 'transfusion') { cat = "fluids"; tab = "transfusion-tab"; }
                else if (record.calculatorType === 'toxicity') { cat = "dosing"; tab = "toxicity-tab"; }

                // Перемикаємо вкладку
                const catBtn = document.querySelector(`.category-btn[data-category="${cat}"]`);
                if (catBtn) switchCategory(cat, catBtn);
                
                const tabBtn = document.getElementById(`chip-${tab}`);
                if (tabBtn) switchTab(tab, tabBtn);

                alert(`Дані пацієнта "${record.patientName}" успішно відновлено та завантажено в форму!`);
            });
    };

    // Допоміжні функції для резервного копіювання/відновлення DOM
    function backupInputs(type) {
        const backup = {};
        if (type === 'cri') {
            backup.weight = document.getElementById('cri-weight').value;
            backup.bagVolume = document.getElementById('cri-bag-volume').value;
            backup.dose = document.getElementById('cri-dose').value;
            backup.doseUnit = document.getElementById('cri-dose-unit').value;
            backup.ampConc = document.getElementById('cri-amp-conc').value;
            backup.addVol = document.getElementById('cri-add-vol').value;
            backup.dripFactor = document.getElementById('cri-drip-factor').value;
        } else if (type === 'fluid') {
            backup.weight = document.getElementById('fluid-weight').value;
            backup.dehydration = document.getElementById('fluid-dehydration').value;
            backup.maintenance = document.getElementById('fluid-maintenance').value;
            backup.losses = document.getElementById('fluid-losses').value;
            backup.dripFactor = document.getElementById('fluid-drip-factor').value;
        } else if (type === 'cpr') {
            backup.weight = document.getElementById('emergency-weight').value;
        } else if (type === 'anesthesia') {
            backup.weight = document.getElementById('anesthesia-weight').value;
            backup.species = document.getElementById('anesthesia-species').value;
            backup.premedicated = document.getElementById('anesthesia-premedicated').checked;
        } else if (type === 'transfusion') {
            backup.weight = document.getElementById('transfusion-weight').value;
            backup.species = document.getElementById('transfusion-species').value;
            backup.patientHt = document.getElementById('transfusion-patient-ht').value;
            backup.targetHt = document.getElementById('transfusion-target-ht').value;
            backup.donorHt = document.getElementById('transfusion-donor-ht').value;
            backup.factor = document.getElementById('transfusion-factor').value;
        } else if (type === 'toxicity') {
            backup.weight = document.getElementById('toxicity-weight').value;
            backup.poisonType = document.getElementById('toxicity-poison-type').value;
            backup.amount = document.getElementById('toxicity-amount').value;
        }
        return backup;
    }

    function restoreInputsBackup(type, backup) {
        if (type === 'cri') {
            document.getElementById('cri-weight').value = backup.weight;
            document.getElementById('cri-bag-volume').value = backup.bagVolume;
            document.getElementById('cri-dose').value = backup.dose;
            document.getElementById('cri-dose-unit').value = backup.doseUnit;
            document.getElementById('cri-amp-conc').value = backup.ampConc;
            document.getElementById('cri-add-vol').value = backup.addVol;
            document.getElementById('cri-drip-factor').value = backup.dripFactor;
            runCriCalculation();
        } else if (type === 'fluid') {
            document.getElementById('fluid-weight').value = backup.weight;
            document.getElementById('fluid-dehydration').value = backup.dehydration;
            document.getElementById('fluid-maintenance').value = backup.maintenance;
            document.getElementById('fluid-losses').value = backup.losses;
            document.getElementById('fluid-drip-factor').value = backup.dripFactor;
            runFluidCalculation();
        } else if (type === 'cpr') {
            document.getElementById('emergency-weight').value = backup.weight;
            runEmergencyCalculation();
        } else if (type === 'anesthesia') {
            document.getElementById('anesthesia-weight').value = backup.weight;
            document.getElementById('anesthesia-species').value = backup.species;
            document.getElementById('anesthesia-premedicated').checked = backup.premedicated;
            runAnesthesiaCalculation();
        } else if (type === 'transfusion') {
            document.getElementById('transfusion-weight').value = backup.weight;
            document.getElementById('transfusion-species').value = backup.species;
            document.getElementById('transfusion-patient-ht').value = backup.patientHt;
            document.getElementById('transfusion-target-ht').value = backup.targetHt;
            document.getElementById('transfusion-donor-ht').value = backup.donorHt;
            document.getElementById('transfusion-factor').value = backup.factor;
            runTransfusionCalculation();
        } else if (type === 'toxicity') {
            document.getElementById('toxicity-weight').value = backup.weight;
            document.getElementById('toxicity-poison-type').value = backup.poisonType;
            document.getElementById('toxicity-amount').value = backup.amount;
            runToxicityCalculation();
        }
    }

    function populateDOMWithRecord(record) {
        const type = record.calculatorType;
        if (type === 'cri') {
            document.getElementById('cri-weight').value = record.weight;
            document.getElementById('cri-bag-volume').value = record.inputs.bagVolume;
            document.getElementById('cri-dose').value = record.inputs.targetDose;
            document.getElementById('cri-dose-unit').value = record.inputs.targetDoseUnit;
            document.getElementById('cri-amp-conc').value = record.inputs.ampConc;
            document.getElementById('cri-add-vol').value = record.inputs.addVol;
            document.getElementById('cri-drip-factor').value = record.inputs.dripFactor;
            runCriCalculation();
        } else if (type === 'fluid') {
            document.getElementById('fluid-weight').value = record.weight;
            document.getElementById('fluid-dehydration').value = record.inputs.dehydration;
            document.getElementById('fluid-maintenance').value = record.inputs.maintenance;
            document.getElementById('fluid-losses').value = record.inputs.losses;
            document.getElementById('fluid-drip-factor').value = record.inputs.dripFactor;
            runFluidCalculation();
        } else if (type === 'cpr') {
            document.getElementById('emergency-weight').value = record.weight;
            runEmergencyCalculation();
        } else if (type === 'anesthesia') {
            document.getElementById('anesthesia-weight').value = record.weight;
            document.getElementById('anesthesia-species').value = record.species === 'Собака' ? 'dog' : 'cat';
            document.getElementById('anesthesia-premedicated').checked = record.inputs.premedicated;
            runAnesthesiaCalculation();
        } else if (type === 'transfusion') {
            document.getElementById('transfusion-weight').value = record.weight;
            document.getElementById('transfusion-species').value = record.species;
            document.getElementById('transfusion-patient-ht').value = record.inputs.patientHt;
            document.getElementById('transfusion-target-ht').value = record.inputs.targetHt;
            document.getElementById('transfusion-donor-ht').value = record.inputs.donorHt;
            document.getElementById('transfusion-factor').value = record.inputs.factor;
            runTransfusionCalculation();
        } else if (type === 'toxicity') {
            document.getElementById('toxicity-weight').value = record.weight;
            document.getElementById('toxicity-poison-type').value = record.inputs.poisonType;
            document.getElementById('toxicity-amount').value = record.inputs.amount;
            runToxicityCalculation();
        }
    }

    if (window.lucide) { lucide.createIcons(); }

    // ---------------- CLOUD SYNC & AUTHENTICATION ----------------
    function getCsrfToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 10) === ('csrftoken=')) {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        return cookieValue;
    }

    window.openCloudAuthModal = function() {
        document.getElementById('cloud-auth-modal').classList.add('active');
        checkCloudAuthStatus();
    };

    window.closeCloudAuthModal = function() {
        document.getElementById('cloud-auth-modal').classList.remove('active');
        document.getElementById('cloud-auth-error').style.display = 'none';
        document.getElementById('cloud-sync-status').style.display = 'none';
    };

    function checkCloudAuthStatus() {
        fetch('/api/auth/status/')
        .then(res => res.json())
        .then(data => {
            if (data.authenticated) {
                document.getElementById('cloud-unauth-view').style.display = 'none';
                document.getElementById('cloud-auth-view').style.display = 'block';
                document.getElementById('cloud-logged-user').textContent = data.username;
                document.getElementById('btn-cloud-login').style.display = 'none';
                document.getElementById('btn-cloud-logout').style.display = 'inline-block';
                document.getElementById('cloud-status-text').textContent = 'Синхронізація увімкнена';
            } else {
                document.getElementById('cloud-unauth-view').style.display = 'block';
                document.getElementById('cloud-auth-view').style.display = 'none';
                document.getElementById('btn-cloud-login').style.display = 'inline-block';
                document.getElementById('btn-cloud-logout').style.display = 'none';
                document.getElementById('cloud-status-text').textContent = 'Офлайн Архів';
            }
        })
        .catch(console.error);
    }

    document.getElementById('btn-cloud-login').addEventListener('click', () => {
        const username = document.getElementById('cloud-username').value;
        const password = document.getElementById('cloud-password').value;
        const errorEl = document.getElementById('cloud-auth-error');
        
        fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({username, password})
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                errorEl.style.display = 'none';
                checkCloudAuthStatus();
            } else {
                errorEl.textContent = data.message || "Помилка авторизації";
                errorEl.style.display = 'block';
            }
        })
        .catch(err => {
            errorEl.textContent = "Помилка з'єднання із сервером.";
            errorEl.style.display = 'block';
        });
    });

    document.getElementById('btn-cloud-logout').addEventListener('click', () => {
        fetch('/api/auth/logout/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCsrfToken() }
        }).then(() => checkCloudAuthStatus());
    });

    document.getElementById('btn-sync-now').addEventListener('click', async () => {
        const statusEl = document.getElementById('cloud-sync-status');
        try {
            const records = await db.getAllRecords();
            if (records.length === 0) {
                statusEl.textContent = "Локальний архів порожній.";
                statusEl.style.color = "var(--gray-text)";
                statusEl.style.display = 'block';
                return;
            }
            
            // Format for API
            const payload = records.map(r => ({
                id: r.id,
                patient_name: r.patientName,
                owner_name: r.ownerName || "",
                ward_box: r.wardBox || "",
                notes: r.notes || "",
                calculator_type: r.calculatorType,
                weight: r.weight,
                species: r.species || "",
                inputs: r.inputs || {},
                results: r.results || {},
                audit: r.audit || "",
                timestamp: r.timestamp
            }));

            const response = await fetch('/api/archive/sync/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({records: payload})
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                statusEl.textContent = `Синхронізовано ${data.synced_ids.length} записів успішно!`;
                statusEl.style.color = "var(--success)";
                statusEl.style.display = 'block';
            } else {
                statusEl.textContent = "Помилка синхронізації: " + data.message;
                statusEl.style.color = "var(--danger)";
                statusEl.style.display = 'block';
            }
        } catch (err) {
            statusEl.textContent = "Помилка з'єднання під час синхронізації.";
            statusEl.style.color = "var(--danger)";
            statusEl.style.display = 'block';
        }
    });

    // Initial check
    setTimeout(checkCloudAuthStatus, 1000);


