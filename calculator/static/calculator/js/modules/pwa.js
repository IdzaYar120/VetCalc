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