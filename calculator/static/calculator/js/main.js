import './modules/theme.js';
import './modules/legal.js';
import './modules/pwa.js';
import './modules/tabs_scroll.js';

{% include "calculator/calculators_offline.js" %}

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
    if (window.lucide) {
        const originalCreateIcons = window.lucide.createIcons;
        let lucideTimeout = null;
        window.lucide.createIcons = function(options) {
            clearTimeout(lucideTimeout);
            lucideTimeout = setTimeout(() => {
                originalCreateIcons(options);
            }, 60);
        };
    }

    // Зміна вкладок
    function switchTab(tabId, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        if (window.lucide) lucide.createIcons();
    }

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
            document.getElementById('math-bag-conc').innerHTML = `C_bag = (${addVol} мл * ${ampConc} мг/мл) / (${bagVolume} мл + ${addVol} мл) = ${data.bag_concentration_mg_ml.toFixed(2)} мг/мл <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span>`;
            document.getElementById('math-flow-rate').textContent = `Rate = ${data.hourly_dose_mg_hr.toFixed(2)} мг/год / ${data.bag_concentration_mg_ml.toFixed(2)} мг/мл = ${data.infusion_rate_ml_hr.toFixed(2)} мл/год`;
            document.getElementById('math-drip-rate').textContent = `Drops = (${data.infusion_rate_ml_hr.toFixed(2)} мл/год * ${dripFactor} кр/мл) / 60 = ${data.drops_per_minute.toFixed(2)} крапель/хв`;
            if (window.lucide) lucide.createIcons();
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
            document.getElementById('math-bsa-calc').innerHTML = `BSA = (${data.k_factor} * (${data.weight_g.toFixed(0)} ** 2/3)) / 10000 = ${data.bsa_m2.toFixed(2)} м² <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span>`;
            document.getElementById('math-bsa-dose').textContent = `Доза = ${data.bsa_m2.toFixed(2)} м² * ${dose} мг/м² = ${data.absolute_dosage.toFixed(2)} мг`;
            if (window.lucide) lucide.createIcons();
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

    // 3. Аудит сумісності ліків
    function triggerAudit() {
        const checkedBoxes = document.querySelectorAll('input[name="audit-drugs"]:checked');
        const selectedDrugs = Array.from(checkedBoxes).map(cb => cb.value);
        const resultContainer = document.getElementById('compat-audit-result');

        if (selectedDrugs.length < 2) {
            resultContainer.innerHTML = `
                <div class="success-card" style="background-color: var(--dark-light); border-left-color: var(--gray-text);">
                    <div class="success-title" style="color: var(--dark); display: flex; align-items: center; gap: 8px;"><i data-lucide="info" style="color: var(--gray-text); width: 20px; height: 20px;"></i> <span>Очікування вибору</span></div>
                    <div class="success-text" style="color: var(--gray-text);">Виберіть щонайменше два препарати вище для запуску аудиту сумісності.</div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
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
                let html = '<h3 style="margin: 15px 0 10px 0; color: var(--danger-dark); display: flex; align-items: center; gap: 8px;"><i data-lucide="alert-triangle" style="color: var(--danger);"></i> <span>Виявлені загрози несумісності</span> <span class="offline-notice">[🔌 Автономно]</span>:</h3>';
                incompatibilities.forEach(inc => {
                    html += `
                        <div class="danger-card">
                            <div class="danger-title" style="display: flex; align-items: center; gap: 8px;"><i data-lucide="x-circle" style="color: var(--danger); width: 20px; height: 20px;"></i> <span>КРИТИЧНИЙ КОНФЛІКТ: ${inc.drug1} + ${inc.drug2}</span></div>
                            <div class="danger-text"><strong>Клінічне обґрунтування несумісності:</strong> ${inc.reason}</div>
                        </div>
                    `;
                });
                resultContainer.innerHTML = html;
            } else {
                resultContainer.innerHTML = `
                    <div class="success-card">
                        <div class="success-title" style="display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="color: var(--success); width: 20px; height: 20px;"></i> <span>Безпечна комбінація підтверджена</span> <span class="offline-notice">[🔌 Автономно]</span></div>
                        <div class="success-text">Суміш препаратів (${selectedDrugs.join(', ')}) є хімічно та фізично сумісною за базовою матрицею.</div>
                    </div>
                `;
            }
            if (window.lucide) lucide.createIcons();
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
                let html = '<h3 style="margin: 15px 0 10px 0; color: var(--danger-dark); display: flex; align-items: center; gap: 8px;"><i data-lucide="alert-triangle" style="color: var(--danger);"></i> <span>Виявлені загрози несумісності:</span></h3>';
                data.incompatibilities.forEach(inc => {
                    html += `
                        <div class="danger-card">
                            <div class="danger-title" style="display: flex; align-items: center; gap: 8px;"><i data-lucide="x-circle" style="color: var(--danger); width: 20px; height: 20px;"></i> <span>КРИТИЧНИЙ КОНФЛІКТ: ${inc.drug1} + ${inc.drug2}</span></div>
                            <div class="danger-text"><strong>Клінічне обґрунтування несумісності:</strong> ${inc.reason}</div>
                        </div>
                    `;
                });
                resultContainer.innerHTML = html;
            } else {
                resultContainer.innerHTML = `
                    <div class="success-card">
                        <div class="success-title" style="display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="color: var(--success); width: 20px; height: 20px;"></i> <span>Безпечна комбінація підтверджена</span></div>
                        <div class="success-text">${data.message}</div>
                    </div>
                `;
            }
            if (window.lucide) lucide.createIcons();
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

            document.getElementById('math-fluid-deficit').innerHTML = `Deficit = ${weight} кг * (${dehydration} / 100) * 1000 = ${data.dehydration_deficit_ml.toFixed(2)} мл рідини <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span>`;
            document.getElementById('math-fluid-maintenance').textContent = `Maintenance = ${weight} кг * ${maintenance} мл/кг/добу = ${data.maintenance_ml_day.toFixed(2)} мл/добу`;
            document.getElementById('math-fluid-total').textContent = `Total = ${data.dehydration_deficit_ml.toFixed(2)} мл (дефіцит) + ${data.maintenance_ml_day.toFixed(2)} мл (потреба) + ${losses} мл (втрати) = ${data.total_fluid_required_ml_day.toFixed(2)} мл/добу`;
            document.getElementById('math-fluid-rate-drip').innerHTML = `Потік = ${data.total_fluid_required_ml_day.toFixed(2)} мл / 24 год = <strong>${data.hourly_fluid_rate_ml_hr.toFixed(2)} мл/год</strong><br>` +
                `Краплі = (${data.hourly_fluid_rate_ml_hr.toFixed(2)} мл/год * ${dripFactor} кр/мл) / 60 = <strong>${data.drops_per_minute.toFixed(2)} крапель/хв</strong>`;
            if (window.lucide) lucide.createIcons();
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
                    <div class="success-title"><i data-lucide="check-circle" style="color: var(--success); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span>Показники безпеки в межах норми</span> <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span></div>
                    <div class="success-text">Введена швидкість калію (${targetDose.toFixed(2)} мЕкв/кг/год) не перевищує ліміт K-max (0.5 мЕкв/кг/год). Серцевий ритм у безпеці.</div>
                `;
            } else {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
                safetyAlert.innerHTML = `
                    <div class="danger-title" style="color: var(--danger-dark); font-weight: bold;"><i data-lucide="alert-triangle" style="color: var(--danger); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span>КРИТИЧНЕ ПОПЕРЕДЖЕННЯ: ПЕРЕВИЩЕНО K-MAX ЛІМІТ!</span> <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span></div>
                    <div class="danger-text" style="color: var(--danger-dark); font-weight: 500;">
                        Розраховане введення калію становить <strong>${targetDose.toFixed(2)} мЕкв/кг/год</strong>, що ПЕРЕВИЩУЄ кардіологічний ліміт безпеки <strong>0.5 мЕкв/кг/год</strong>!<br>
                        Негайне введення цієї суміші може спровокувати смертельну аритмію або зупинку серця! Будь ласка, зменшіть цільову дозу або швидкість інфузії!
                    </div>
                `;
            }

            document.getElementById('math-k-hourly').innerHTML = `D_K = ${targetDose} мЕкв/кг/год * ${weight} кг = ${data.hourly_k_delivered_meq_hr.toFixed(2)} мЕкв/год <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span>`;
            document.getElementById('math-k-conc').textContent = `C_K = ${data.hourly_k_delivered_meq_hr.toFixed(2)} мЕкв/год / ${infusionRate} мл/год = ${data.required_k_concentration_meq_ml.toFixed(4)} мЕкв/мл`;
            document.getElementById('math-k-volume').textContent = `V_KCl = (${data.required_k_concentration_meq_ml.toFixed(4)} мЕкв/мл * ${bagVolume} мл) / ${ampouleConc} мЕкв/мл = ${data.kcl_volume_to_add_ml.toFixed(2)} мл`;
            if (window.lucide) lucide.createIcons();
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
                    <div class="success-title"><i data-lucide="check-circle" style="color: var(--success); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span>Показники безпеки в межах норми</span></div>
                    <div class="success-text">Введена швидкість калію (${targetDose.toFixed(2)} мЕкв/кг/год) не перевищує ліміт K-max (0.5 мЕкв/кг/год). Серцевий ритм у безпеці.</div>
                `;
            } else {
                safetyAlert.className = "danger-card";
                safetyAlert.style.borderLeft = "4px solid var(--danger-dark)";
                safetyAlert.innerHTML = `
                    <div class="danger-title" style="color: var(--danger-dark); font-weight: bold;"><i data-lucide="alert-triangle" style="color: var(--danger); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span>КРИТИЧНЕ ПОПЕРЕДЖЕННЯ: ПЕРЕВИЩЕНО K-MAX ЛІМІТ!</span></div>
                    <div class="danger-text" style="color: var(--danger-dark); font-weight: 500;">
                        Розраховане введення калію становить <strong>${targetDose.toFixed(2)} мЕкв/кг/год</strong>, що ПЕРЕВИЩУЄ кардіологічний ліміт безпеки <strong>0.5 мЕкв/кг/год</strong>!<br>
                        Негайне введення цієї суміші може спровокувати смертельну аритмію або зупинку серця! Будь ласка, зменшіть цільову дозу або швидкість інфузії!
                    </div>
                `;
            }

            document.getElementById('math-k-hourly').textContent = `D_K = ${targetDose} мЕкв/кг/год * ${weight} кг = ${hourlyK.toFixed(2)} мЕкв/год`;
            document.getElementById('math-k-conc').textContent = `C_K = ${hourlyK.toFixed(2)} мЕкв/год / ${infusionRate} мл/год = ${concK.toFixed(4)} мЕкв/мл`;
            document.getElementById('math-k-volume').textContent = `V_KCl = (${concK.toFixed(4)} мЕкв/мл * ${bagVolume} мл) / ${ampouleConc} мЕкв/мл = ${volK.toFixed(2)} мл`;
            if (window.lucide) lucide.createIcons();
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
            <div class="success-title"><i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span>Очікування коректних даних</span></div>
            <div class="success-text">Введіть коректні параметри пацієнта для розрахунку калійної безпеки.</div>
        `;
        if (window.lucide) lucide.createIcons();
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
            document.getElementById('em-adr-low-info').innerHTML = `${adrLow.safety_notes} <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span>`;
            if (window.lucide) lucide.createIcons();

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
            'em-dex-mg', 'em-dex-ml'
        ];
        ids.forEach(id => {
            document.getElementById(id).textContent = id.endsWith('mg') ? "0.00 мг" : "0.00 мл";
        });
        
        const infoIds = [
            'em-adr-low-info', 'em-adr-high-info', 'em-atr-info',
            'em-lido-dog-info', 'em-lido-cat-info', 'em-nal-info', 'em-dex-info'
        ];
        infoIds.forEach(id => {
            document.getElementById(id).textContent = "Очікування...";
        });
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
            safetyText.innerHTML = `<i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span><strong>Протокол корекції:</strong> ${data.safety_notes} <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span></span>`;

            let formulaText = "";
            if (inputType === "base_deficit") {
                formulaText = `Deficit = 0.3 * ${weight} кг * ${value} мЕкв/л = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            } else {
                formulaText = `Deficit = 0.3 * ${weight} кг * (24 - ${value} мЕкв/л) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            }
            document.getElementById('math-bicarbonate-formula').innerHTML = formulaText;
            if (window.lucide) lucide.createIcons();
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
            safetyText.innerHTML = `<i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span><strong>Протокол корекції:</strong> ${data.safety_notes}</span>`;

            let formulaText = "";
            if (inputType === "base_deficit") {
                formulaText = `Deficit = 0.3 * ${weight} кг * ${value} мЕкв/л = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв<br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            } else {
                formulaText = `Deficit = 0.3 * ${weight} кг * (24 - ${value} мЕкв/л) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв<br>` +
                              `Об'єм (8.4% NaHCO₃) = ${data.bicarbonate_deficit_meq.toFixed(2)} мЕкв * 1.0 = ${data.bicarbonate_volume_ml.toFixed(2)} мл`;
            }
            document.getElementById('math-bicarbonate-formula').innerHTML = formulaText;
            if (window.lucide) lucide.createIcons();
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
            safetyText.innerHTML = `<i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span><strong>[${data.status}]</strong> ${data.notes} <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span></span>`;

            let formulaText = "";
            if (species === "Кіт") {
                formulaText = `Ca_adj = ${totalCa} мг/дл - (0.63 * ${albumin} г/дл) + 2.1 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            } else {
                formulaText = `Ca_adj = ${totalCa} мг/дл - ${albumin} г/дл + 3.5 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл <span class="offline-notice">[🔌 Автономно]</span><br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            }
            document.getElementById('math-calcium-formula').innerHTML = formulaText;
            if (window.lucide) lucide.createIcons();
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
            safetyText.innerHTML = `<i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span><strong>[${data.status}]</strong> ${data.notes}</span>`;

            let formulaText = "";
            if (species === "Кіт") {
                formulaText = `Ca_adj = ${totalCa} мг/дл - (0.63 * ${albumin} г/дл) + 2.1 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл<br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            } else {
                formulaText = `Ca_adj = ${totalCa} мг/дл - ${albumin} г/дл + 3.5 = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл<br>` +
                              `Ca_adj_mmol = ${data.adjusted_calcium_mg_dl.toFixed(2)} мг/дл / 4.01 = ${data.adjusted_calcium_mmol_l.toFixed(2)} ммоль/л`;
            }
            document.getElementById('math-calcium-formula').innerHTML = formulaText;
            if (window.lucide) lucide.createIcons();
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
            safetyText.innerHTML = `<i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span><strong>[${data.status}]</strong> ${data.notes} <span class="offline-notice">[<i data-lucide="wifi-off" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Автономно]</span></span>`;

            let formulaText = `Na_part = 2 * ${sodium} = ${(2 * sodium).toFixed(1)} мЕкв/л<br>` +
                              `Glucose_part = ${glucose} ${glucoseUnit} = ${data.glucose_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `BUN_part = ${bun} ${bunUnit} = ${data.bun_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `Osmolality = 2*Na + Glucose + BUN = ${data.osmolality_mosm_kg.toFixed(2)} мОсм/кг <span class="offline-notice">[🔌 Автономно]</span>`;
            document.getElementById('math-osmolality-formula').innerHTML = formulaText;
            if (window.lucide) lucide.createIcons();
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
            safetyText.innerHTML = `<i data-lucide="info" style="color: var(--primary); width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i> <span><strong>[${data.status}]</strong> ${data.notes}</span>`;

            let formulaText = `Na_part = 2 * ${sodium} = ${(2 * sodium).toFixed(1)} мЕкв/л<br>` +
                              `Glucose_part = ${glucose} ${glucoseUnit} = ${data.glucose_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `BUN_part = ${bun} ${bunUnit} = ${data.bun_mmol_l.toFixed(2)} ммоль/л<br>` +
                              `Osmolality = 2*Na + Glucose + BUN = ${data.osmolality_mosm_kg.toFixed(2)} мОсм/кг`;
            document.getElementById('math-osmolality-formula').innerHTML = formulaText;
            if (window.lucide) lucide.createIcons();
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

    // ---------------- КЕРУВАННЯ ТЕМОЮ (LIGHT/DARK) ----------------
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggleIcon.setAttribute('data-lucide', 'moon');
        } else {
            document.body.classList.remove('dark-theme');
            themeToggleIcon.setAttribute('data-lucide', 'sun');
        }
        if (window.lucide) lucide.createIcons();
    }
    
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('vetcalc_theme', newTheme);
        applyTheme(newTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('vetcalc_theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
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
            badge.innerHTML = '<i data-lucide="wifi" style="width: 16px; height: 16px;"></i> <span>Онлайн</span>';
        } else {
            badge.className = 'network-badge network-offline';
            badge.innerHTML = '<i data-lucide="wifi-off" style="width: 16px; height: 16px;"></i> <span>Автономно (Офлайн)</span>';
        }
        if (window.lucide) lucide.createIcons();
        
        // Перераховуємо поточну вкладку при зміні стану мережі для візуальної синхронізації
        runCriCalculation();
        runBsaCalculation();
        runFluidCalculation();
        runPotassiumCalculation();
        runEmergencyCalculation();
        runBicarbonateCalculation();
        runCalciumCalculation();
        runOsmolalityCalculation();
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
    });

    // ---------------- ІНТЕРАКТИВНЕ КЕРУВАННЯ ПРОКРУТКОЮ ВКЛАДОК ----------------
    const tabsContainer = document.getElementById('tabs-container');
    const tabsWrapper = document.getElementById('tabs-wrapper');
    const arrowLeft = document.getElementById('tabs-arrow-left');
    const arrowRight = document.getElementById('tabs-arrow-right');

    if (tabsContainer && tabsWrapper && arrowLeft && arrowRight) {
        // 1. Перетягування мишкою (Drag-to-Scroll) на десктопі
        let isDown = false;
        let startX;
        let scrollLeftVal;

        tabsContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            tabsContainer.classList.add('active-drag');
            startX = e.pageX - tabsContainer.offsetLeft;
            scrollLeftVal = tabsContainer.scrollLeft;
        });

        tabsContainer.addEventListener('mouseleave', () => {
            isDown = false;
            tabsContainer.classList.remove('active-drag');
        });

        tabsContainer.addEventListener('mouseup', () => {
            isDown = false;
            tabsContainer.classList.remove('active-drag');
        });

        tabsContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - tabsContainer.offsetLeft;
            const walk = (x - startX) * 1.5; // швидкість прокрутки
            tabsContainer.scrollLeft = scrollLeftVal - walk;
            updateTabScrollState();
        });

        // 2. Перетворення вертикальної прокрутки коліщатка миші на горизонтальну
        tabsContainer.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tabsContainer.scrollLeft += e.deltaY * 0.8;
                updateTabScrollState();
            }
        }, { passive: false });

        // 3. Плавне клікання по стрілкам
        window.scrollTabs = function(direction) {
            const scrollAmt = 240;
            if (direction === 'left') {
                tabsContainer.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
            } else {
                tabsContainer.scrollBy({ left: scrollAmt, behavior: 'smooth' });
            }
            setTimeout(updateTabScrollState, 300);
        };

        // 4. Оновлення стану стрілок та градієнтних масок
        function updateTabScrollState() {
            const maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
            const currentScroll = tabsContainer.scrollLeft;

            // Стрілка ліворуч
            if (currentScroll > 4) {
                arrowLeft.classList.add('visible');
                tabsWrapper.classList.add('can-scroll-left');
            } else {
                arrowLeft.classList.remove('visible');
                tabsWrapper.classList.remove('can-scroll-left');
            }

            // Стрілка праворуч
            if (currentScroll < maxScroll - 4) {
                arrowRight.classList.add('visible');
                tabsWrapper.classList.add('can-scroll-right');
            } else {
                arrowRight.classList.remove('visible');
                tabsWrapper.classList.remove('can-scroll-right');
            }
        }

        let isScrollTicking = false;
        tabsContainer.addEventListener('scroll', () => {
            if (!isScrollTicking) {
                window.requestAnimationFrame(() => {
                    updateTabScrollState();
                    isScrollTicking = false;
                });
                isScrollTicking = true;
            }
        });
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateTabScrollState, 150);
        });

        // Ініціалізація стану при завантаженні сторінки
        setTimeout(updateTabScrollState, 400);
    }