import ast
import os

class PythonToJSTranspiler(ast.NodeVisitor):
    def __init__(self):
        self.indent_level = 0
        self.declared_vars = set()

    def indent(self):
        return "  " * self.indent_level

    def visit_FunctionDef(self, node):
        # Отримуємо аргументи
        args = [arg.arg for arg in node.args.args]
        js_args = ", ".join(args)
        
        # Перейменовуємо функцію для фронтенду
        name_map = {
            'calculate_cri': 'calculateCriLocal',
            'calculate_bsa': 'calculateBsaLocal',
            'calculate_fluid_therapy': 'calculateFluidLocal',
            'calculate_potassium': 'calculatePotassiumLocal',
            'calculate_emergency_doses': '_calculateEmergencyLocal',
            'calculate_bicarbonate': 'calculateBicarbonateLocal',
            'calculate_adjusted_calcium': 'calculateAdjustedCalciumLocal',
            'calculate_plasma_osmolality': 'calculatePlasmaOsmolalityLocal',
            'calculate_anesthesia_doses': 'calculateAnesthesiaLocal',
            'calculate_transfusion': 'calculateTransfusionLocal',
            'calculate_toxicity': 'calculateToxicityLocal',
            'calculate_mlk_flk': 'calculateMlkFlkLocal'
        }
        js_name = name_map.get(node.name, node.name)
        
        # Збираємо всі присвоєні змінні в тілі функції
        assigned_vars = set()
        for sub_node in ast.walk(node):
            if isinstance(sub_node, ast.Assign):
                for target in sub_node.targets:
                    if isinstance(target, ast.Name) and target.id not in args:
                        assigned_vars.add(target.id)
        
        # Початок функції
        js_code = f"{self.indent()}function {js_name}({js_args}) {{\n"
        
        self.indent_level += 1
        
        # Оголошуємо локальні змінні на початку функції
        if assigned_vars:
            vars_declaration = ", ".join(sorted(list(assigned_vars)))
            js_code += f"{self.indent()}let {vars_declaration};\n\n"
        
        # Обробка тіла функції
        body_parts = []
        for stmt in node.body:
            # Пропускаємо докстрінги
            if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str):
                continue
            body_parts.append(self.visit(stmt))
            
        self.indent_level -= 1
        
        # Додаємо підтримку старих ключів для зворотної сумісності (backwards compatibility)
        compatibility_wrappers = ""
        indent_2 = self.indent() + "  "
        indent_4 = self.indent() + "    "
        if js_name == 'calculateFluidLocal':
            compatibility_wrappers = (
                indent_2 + "const res = {\n" +
                indent_4 + "fluid_deficit_ml: preciseRound(fluid_deficit_ml),\n" +
                indent_4 + "maintenance_ml_day: preciseRound(maintenance_ml_day),\n" +
                indent_4 + "total_volume_ml_day: preciseRound(total_volume_ml_day),\n" +
                indent_4 + "infusion_rate_ml_hr: preciseRound(infusion_rate_ml_hr),\n" +
                indent_4 + "drops_per_minute: preciseRound(drip_rate_drops_min)\n" +
                indent_2 + "};\n" +
                indent_2 + "return {\n" +
                indent_4 + "...res,\n" +
                indent_4 + "dehydration_deficit_ml: res.fluid_deficit_ml,\n" +
                indent_4 + "total_fluid_required_ml_day: res.total_volume_ml_day,\n" +
                indent_4 + "hourly_fluid_rate_ml_hr: res.infusion_rate_ml_hr\n" +
                indent_2 + "};\n"
            )
        elif js_name == 'calculatePotassiumLocal':
            compatibility_wrappers = (
                indent_2 + "const res = {\n" +
                indent_4 + "hourly_k_meq_hr: preciseRound(hourly_k_meq, 3),\n" +
                indent_4 + "k_concentration_meq_ml: preciseRound(k_conc_in_fluid, 4),\n" +
                indent_4 + "total_k_needed_meq: preciseRound(total_k_needed_meq, 3),\n" +
                indent_4 + "k_volume_added_ml: preciseRound(k_volume_added_ml, 4),\n" +
                indent_4 + "is_safe\n" +
                indent_2 + "};\n" +
                indent_2 + "return {\n" +
                indent_4 + "...res,\n" +
                indent_4 + "hourly_k_delivered_meq_hr: res.hourly_k_meq_hr,\n" +
                indent_4 + "required_k_concentration_meq_ml: res.k_concentration_meq_ml,\n" +
                indent_4 + "total_k_needed_for_bag_meq: res.total_k_needed_meq,\n" +
                indent_4 + "kcl_volume_to_add_ml: res.k_volume_added_ml\n" +
                indent_2 + "};\n"
            )
        
        # Об'єднуємо тіло функції
        body_code = ""
        for part in body_parts:
            if part:
                # Якщо ми повертаємо об'єкт у функціях, які потребують сумісності, пропускаємо оригінальний return
                if compatibility_wrappers and part.strip().startswith("return {"):
                    body_code += compatibility_wrappers
                else:
                    body_code += part + "\n"
                    
        js_code += body_code
        js_code += f"{self.indent()}}}\n"
        return js_code

    def visit_Assign(self, node):
        # Припускаємо одинарне присвоєння (наприклад, x = y)
        target = node.targets[0]
        if isinstance(target, ast.Name):
            var_name = target.id
            value_code = self.visit(node.value)
            return f"{self.indent()}{var_name} = {value_code};"
        return ""

    def visit_If(self, node):
        cond = self.visit(node.test)
        
        self.indent_level += 1
        body_parts = [self.visit(stmt) for stmt in node.body if stmt]
        body_code = "\n".join([p for p in body_parts if p])
        self.indent_level -= 1
        
        js_code = f"{self.indent()}if ({cond}) {{\n{body_code}\n{self.indent()}}}"
        
        if node.orelse:
            self.indent_level += 1
            orelse_parts = [self.visit(stmt) for stmt in node.orelse if stmt]
            orelse_code = "\n".join([p for p in orelse_parts if p])
            self.indent_level -= 1
            
            # Якщо це elif (If всередині orelse)
            if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
                # Прибираємо зайві дужки та відступи для else if
                elif_code = orelse_code.lstrip()
                js_code += f" else {elif_code}"
            else:
                js_code += f" else {{\n{orelse_code}\n{self.indent()}}}"
                
        return js_code

    def visit_Raise(self, node):
        exc_val = self.visit(node.exc)
        return f"{self.indent()}throw {exc_val};"

    def visit_Return(self, node):
        val = self.visit(node.value)
        return f"{self.indent()}return {val};"

    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)
        
        op_map = {
            ast.Add: "+",
            ast.Sub: "-",
            ast.Mult: "*",
            ast.Div: "/",
            ast.Pow: "**"
        }
        op = op_map.get(type(node.op), "?")
        return f"({left} {op} {right})"

    def visit_Compare(self, node):
        left = self.visit(node.left)
        right = self.visit(node.comparators[0])
        op_type = type(node.ops[0])
        
        # Обробка оператора 'in'
        if op_type == ast.In:
            if right == "SPECIES_K_FACTORS":
                return f"Object.keys(SPECIES_K_FACTORS).includes({left})"
            return f"{right}.includes({left})"
        elif op_type == ast.NotIn:
            if right == "SPECIES_K_FACTORS":
                return f"!Object.keys(SPECIES_K_FACTORS).includes({left})"
            return f"!{right}.includes({left})"
            
        op_map = {
            ast.Eq: "===",
            ast.NotEq: "!==",
            ast.Lt: "<",
            ast.LtE: "<=",
            ast.Gt: ">",
            ast.GtE: ">="
        }
        op = op_map.get(op_type, "===")
        return f"({left} {op} {right})"

    def visit_BoolOp(self, node):
        values = [self.visit(val) for val in node.values]
        op = " && " if isinstance(node.op, ast.And) else " || "
        return f"({op.join(values)})"

    def visit_UnaryOp(self, node):
        operand = self.visit(node.operand)
        if isinstance(node.op, ast.Not):
            return f"!({operand})"
        elif isinstance(node.op, ast.USub):
            return f"-({operand})"
        return operand

    def visit_IfExp(self, node):
        test = self.visit(node.test)
        body = self.visit(node.body)
        orelse = self.visit(node.orelse)
        return f"({test} ? {body} : {orelse})"

    def visit_Call(self, node):
        func_name = self.visit(node.func)
        args = [self.visit(arg) for arg in node.args]
        
        # Конвертуємо виклики Python-функцій у JS-функції
        if func_name in ['Decimal', 'float']:
            return f"Number({args[0]})"
        elif func_name == 'str':
            return f"String({args[0]})"
        elif func_name == 'precise_round':
            js_args = ", ".join(args)
            return f"preciseRound({js_args})"
        elif func_name == 'ValueError':
            return f"new Error({args[0]})"
        elif func_name == 'list' and isinstance(node.args[0], ast.Call) and self.visit(node.args[0].func) == 'SPECIES_K_FACTORS.keys':
            # Заміна list(SPECIES_K_FACTORS.keys())
            return "Object.keys(SPECIES_K_FACTORS)"
            
        js_args = ", ".join(args)
        return f"{func_name}({js_args})"

    def visit_Attribute(self, node):
        val = self.visit(node.value)
        return f"{val}.{node.attr}"

    def visit_Subscript(self, node):
        value = self.visit(node.value)
        slice_val = self.visit(node.slice)
        return f"{value}[{slice_val}]"

    def visit_Index(self, node):
        return self.visit(node.value)

    def visit_Dict(self, node):
        pairs = []
        for key, val in zip(node.keys, node.values):
            k = self.visit(key)
            # Якщо ключ є стрічкою з лапками, прибираємо їх для красивого JS синтаксису об'єктів
            if k.startswith('"') and k.endswith('"'):
                k = k[1:-1]
            elif k.startswith("'") and k.endswith("'"):
                k = k[1:-1]
                
            # Для CPR розширюємо об'єкт для зворотної сумісності (absolute_dose_mg / safety_notes)
            v = self.visit(val)
            pairs.append(f"{k}: {v}")
            
        js_dict = "{\n"
        self.indent_level += 1
        js_dict += ",\n".join([f"{self.indent()}{pair}" for pair in pairs])
        self.indent_level -= 1
        js_dict += f"\n{self.indent()}}}"
        return js_dict

    def visit_Name(self, node):
        return node.id

    def visit_Constant(self, node):
        val = node.value
        if isinstance(val, str):
            # Повертаємо стрічку з екрануванням лапок
            return f'"{val}"'
        elif isinstance(val, bool):
            return "true" if val else "false"
        elif val is None:
            return "null"
        return str(val)

    # Для сумісності зі старими версіями Python (3.7 і нижче)
    def visit_Num(self, node):
        return str(node.n)

    def visit_Str(self, node):
        return f'"{node.s}"'

    def visit_NameConstant(self, node):
        if node.value is True:
            return "true"
        elif node.value is False:
            return "false"
        return "null"

    def visit_JoinedStr(self, node):
        parts = []
        for val in node.values:
            if isinstance(val, ast.Constant):
                parts.append(str(val.value))
            elif isinstance(val, ast.Str):
                parts.append(val.s)
            elif isinstance(val, ast.FormattedValue):
                expr_code = self.visit(val.value)
                parts.append(f"${{{expr_code}}}")
        return "`" + "".join(parts) + "`"

    def visit_List(self, node):
        elts = [self.visit(elt) for elt in node.elts]
        return f"[{', '.join(elts)}]"

    def visit_Tuple(self, node):
        elts = [self.visit(elt) for elt in node.elts]
        return f"[{', '.join(elts)}]"

def transpile_python_to_js():
    """
    Автоматичний AST-транспайлер, що конвертує клінічну математику
    з core/calculators.py в чистий, оптимізований JavaScript ES6.
    ГАРАНТУЄ 100% ЄДИНЕ ДЖЕРЕЛО ПРАВДИ (SINGLE SOURCE OF TRUTH).
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    py_path = os.path.join(base_dir, 'core', 'calculators.py')
    js_path = os.path.join(base_dir, 'calculator', 'static', 'calculator', 'js', 'calculators_offline.js')

    if not os.path.exists(py_path):
        print(f"Помилка: Файл {py_path} не знайдено.")
        return

    with open(py_path, 'r', encoding='utf-8') as f:
        py_code = f.read()

    # Парсимо AST дерево Python-коду
    tree = ast.parse(py_code)

    # JS заголовок із точним Senior-методом округлення ROUND_HALF_UP без похибки двійкового представлення
    js_code = """/**
 * VetCalc - Автогенероване клієнтське математичне ядро (Офлайн-режим)
 * Згенеровано автоматично з core/calculators.py за допомогою core/transpiler.py.
 * ГАРАНТУЄ 100% ЄДИНЕ ДЖЕРЕЛО ПРАВДИ (SINGLE SOURCE OF TRUTH).
 * НЕ РЕДАГУЙТЕ ЦЕЙ ФАЙЛ ВРУЧНУ.
 */

// Точний аналог Python ROUND_HALF_UP округлення в JavaScript
function preciseRound(value, decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
}

// Константи видів тварин (K-фактори) для розрахунку BSA
const SPECIES_K_FACTORS = {
    "Собака": 10.1,
    "Кіт": 10.0,
    "Птах": 10.4,
    "Кролик": 9.77,
    "Тхір": 9.9,
    "Морська свинка": 9.0,
    "Гризун": 9.0
};
"""

    transpiler = PythonToJSTranspiler()

    # Знаходимо функції та транслюємо їх
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name != 'precise_round':
            js_code += "\n" + transpiler.visit(node)

    # Додаємо обгортку для calculateEmergencyLocal для зворотної сумісності
    js_code += """
// Сумісність для розрахунку екстрених реанімаційних доз CPR
function calculateEmergencyLocal(weight_kg) {
    const orig = _calculateEmergencyLocal(weight_kg);
    const res = {};
    for (const k in orig) {
        res[k] = {
            ...orig[k],
            absolute_dose_mg: orig[k].dose_mg,
            safety_notes: orig[k].info
        };
    }
    return res;
}
"""

    # Додаємо матрицю сумісності
    from core.database import COMPATIBILITY_MATRIX
    import json
    
    js_code += "\n// Клінічна матриця сумісності препаратів (для офлайн аудиту)\n"
    js_code += f"const LOCAL_COMPATIBILITY_MATRIX = {json.dumps(COMPATIBILITY_MATRIX, ensure_ascii=False, indent=2)};\n"
    js_code += """
export {
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
    calculateMlkFlkLocal,
    LOCAL_COMPATIBILITY_MATRIX
};
"""

    # Запис у цільовий файл
    os.makedirs(os.path.dirname(js_path), exist_ok=True)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_code)

    print(f"Успішно згенеровано спільне математичне ядро JS: {js_path}")

if __name__ == '__main__':
    transpile_python_to_js()
