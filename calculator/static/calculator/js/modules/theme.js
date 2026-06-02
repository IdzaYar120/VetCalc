
// ---------------- THEME TOGGLE ----------------
const themeToggleBtn = document.getElementById('theme-toggle');

function applyTheme(theme) {
    const iconSun = document.getElementById('theme-icon-sun');
    const iconMoon = document.getElementById('theme-icon-moon');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (iconSun) iconSun.style.display = 'none';
        if (iconMoon) iconMoon.style.display = 'block';
    } else {
        document.body.classList.remove('dark-theme');
        if (iconSun) iconSun.style.display = 'block';
        if (iconMoon) iconMoon.style.display = 'none';
    }
}

window.applyTheme = applyTheme;

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('vetcalc_theme', newTheme);
        applyTheme(newTheme);
    });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('vetcalc_theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

// Apply initial theme to set correct icon
const savedTheme = localStorage.getItem('vetcalc_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
