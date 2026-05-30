from django.contrib import admin
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import include, path


def api_root(request):
    return JsonResponse(
        {
            'name': 'Medellín Movilidata OS API',
            'status': 'ok',
            'endpoints': {
                'accidents': '/api/accidents/',
                'zones': '/api/zones/',
                'weather': '/api/weather/',
                'congestion_prediction': '/api/congestion_prediction/',
                'simulate_rain': '/api/simulate_rain/',
            },
        }
    )

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api', lambda request: redirect('/api/', permanent=False)),
    path('api/', include('api.urls')),
]
