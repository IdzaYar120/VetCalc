from django.urls import path
from calculator import views

app_name = 'calculator'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('api/calculate-cri/', views.api_calculate_cri, name='api_calculate_cri'),
    path('api/calculate-bsa/', views.api_calculate_bsa, name='api_calculate_bsa'),
    path('api/audit-compatibility/', views.api_audit_compatibility, name='api_audit_compatibility'),
]
