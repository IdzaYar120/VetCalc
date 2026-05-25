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