js = '''
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
'''

with open('calculator/static/calculator/js/modules/theme.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated theme.js")
