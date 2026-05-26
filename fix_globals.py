import re

with open('calculator/static/calculator/js/modules/tabs_scroll.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add to window
js += "\nwindow.scrollTabs = scrollTabs;\nwindow.switchTab = switchTab;\n"

with open('calculator/static/calculator/js/modules/tabs_scroll.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('calculator/static/calculator/js/modules/legal.js', 'r', encoding='utf-8') as f:
    js_l = f.read()

js_l += "\nwindow.acceptLegalTerms = acceptLegalTerms;\n"

with open('calculator/static/calculator/js/modules/legal.js', 'w', encoding='utf-8') as f:
    f.write(js_l)
    
with open('calculator/static/calculator/js/main.js', 'a', encoding='utf-8') as f:
    f.write("\nif (window.lucide) { lucide.createIcons(); }\n")

print("Fixed modules exports to window and added lucide init.")
