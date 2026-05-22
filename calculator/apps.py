from django.apps import AppConfig

class CalculatorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'calculator'

    def ready(self):
        # Автоматична генерація офлайн JS-ядра при старті Django
        try:
            from core.transpiler import transpile_python_to_js
            transpile_python_to_js()
        except Exception as e:
            print(f"Помилка автогенерації JS-калькуляторів: {e}")
