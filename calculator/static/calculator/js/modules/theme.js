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