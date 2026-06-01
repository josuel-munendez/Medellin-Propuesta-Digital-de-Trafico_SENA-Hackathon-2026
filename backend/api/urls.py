from django.urls import path

from .views import AccidentListView, CongestionPredictionView, WeatherSimView, WeatherStatusView, ZonesListView

urlpatterns = [
    path('accidents/', AccidentListView.as_view(), name='accident-list'),
    path('zones/', ZonesListView.as_view(), name='zone-list'),
    path('weather/', WeatherStatusView.as_view(), name='weather-status'),
    path('simulate_rain/', WeatherSimView.as_view(), name='simulate-rain'),
    path('congestion_prediction/', CongestionPredictionView.as_view(), name='congestion-prediction'),
]
