from django.urls import path
from calculator import views

app_name = 'calculator'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('api/calculate-cri/', views.api_calculate_cri, name='api_calculate_cri'),
    path('api/calculate-bsa/', views.api_calculate_bsa, name='api_calculate_bsa'),
    path('api/audit-compatibility/', views.api_audit_compatibility, name='api_audit_compatibility'),
    path('api/calculate-fluid-therapy/', views.api_calculate_fluid_therapy, name='api_calculate_fluid_therapy'),
    path('api/calculate-potassium/', views.api_calculate_potassium, name='api_calculate_potassium'),
    path('api/calculate-emergency/', views.api_calculate_emergency, name='api_calculate_emergency'),
]
