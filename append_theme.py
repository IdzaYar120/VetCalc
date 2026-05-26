with open('calculator/static/calculator/js/modules/theme.js', 'a', encoding='utf-8') as f:
    f.write("\n// Apply initial theme to set correct icon\n")
    f.write("const savedTheme = localStorage.getItem('vetcalc_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');\n")
    f.write("applyTheme(savedTheme);\n")
