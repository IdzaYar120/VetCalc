with open('calculator/static/calculator/js/modules/tabs_scroll.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace('window.switchTab = switchTab;', '')

with open('calculator/static/calculator/js/modules/tabs_scroll.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('calculator/static/calculator/js/main.js', 'r', encoding='utf-8') as f:
    js_m = f.read()

js_m = js_m.replace('function switchTab(tabId, btn) {', 'window.switchTab = function(tabId, btn) {')

with open('calculator/static/calculator/js/main.js', 'w', encoding='utf-8') as f:
    f.write(js_m)

print("Fixed switchTab reference error.")
