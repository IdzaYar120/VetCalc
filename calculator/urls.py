from django.urls import path
from django.views.generic.base import RedirectView
from calculator import views

app_name = 'calculator'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('manifest.json', views.pwa_manifest, name='pwa_manifest'),
    path('service-worker.js', views.pwa_service_worker, name='pwa_service_worker'),
    path('vet_logo.svg', views.pwa_logo, name='pwa_logo'),
    path('favicon.ico', RedirectView.as_view(url='/vet_logo.svg', permanent=True)),
]
