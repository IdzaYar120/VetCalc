from django import template

register = template.Library()

@register.filter(name='dict_get')
def dict_get(value, arg):
    """
    Повертає значення з словника за динамічним ключем.
    Використовується в шаблонах Django, оскільки стандартний синтаксис
    не підтримує динамічний доступ до ключів виду dict[var].
    """
    if isinstance(value, dict):
        return value.get(arg)
    return None
