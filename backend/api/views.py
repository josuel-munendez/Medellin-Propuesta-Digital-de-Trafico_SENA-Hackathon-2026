import os

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND, HTTP_201_CREATED
from rest_framework.views import APIView

from .models import Accident, Zone
from .serializers import (
    AccidentSerializer,
    AdminAccidentSerializer,
    AdminUserSerializer,
    AdminZoneSerializer,
    DashboardSerializer,
    LoginSerializer,
    UserSerializer,
    ZoneSerializer,
)

RAIN_STATE = {'isRaining': False}


def api_root(request):
    return JsonResponse(
        {
            'name': 'Medellín Movilidata OS API',
            'status': 'ok',
            'endpoints': {
                'auth_login': '/api/auth/login/',
                'auth_logout': '/api/auth/logout/',
                'auth_me': '/api/auth/me/',
                'dashboard': '/api/dashboard/',
                'accidents': '/api/accidents/',
                'zones': '/api/zones/',
                'weather': '/api/weather/',
                'siata_weather': '/api/siata_weather/',
                'congestion_prediction': '/api/congestion_prediction/',
                'simulate_rain': '/api/simulate_rain/',
            },
        }
    )


def build_dashboard_for_user(user):
    if user.is_staff or user.is_superuser:
        summary = {
            'accidents_count': Accident.objects.count(),
            'zones_count': Zone.objects.count(),
            'users_count': User.objects.count(),
            'high_risk_zones': Zone.objects.filter(risk_level=Zone.RISK_HIGH).count(),
        }
        highlights = [
            'Supervisa el acceso de usuarios y el estado de las zonas más críticas.',
            'Los filtros horarios y el mapa de calor ya consumen la API real.',
            'Puedes crear más usuarios demo desde el comando de carga de datos.',
        ]
        greeting = f'Bienvenido, {user.get_full_name() or user.username}. Tienes acceso de administrador.'
        role = 'admin'
    else:
        top_zone = Zone.objects.order_by('-risk_level', 'name').first()
        summary = {
            'recommended_zone': top_zone.name if top_zone else 'Centro',
            'risk_level': top_zone.risk_level if top_zone else 'media',
            'active_alerts': 1 if RAIN_STATE['isRaining'] else 0,
            'visible_accidents': Accident.objects.count(),
        }
        highlights = [
            'Consulta el mapa de calor para encontrar las rutas más seguras.',
            'Usa el botón de lluvia simulada para cambiar la alerta de riesgo.',
            'Revisa las zonas antes de planear tus recorridos.',
        ]
        greeting = f'Hola, {user.get_full_name() or user.username}. Tu panel de usuario está activo.'
        role = 'user'

    payload = {
        'role': role,
        'greeting': greeting,
        'summary': summary,
        'highlights': highlights,
    }
    DashboardSerializer(data=payload).is_valid(raise_exception=True)
    return payload


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )

        if not user:
            return Response({'detail': 'Credenciales inválidas.'}, status=HTTP_401_UNAUTHORIZED)

        token, _ = Token.objects.get_or_create(user=user)
        dashboard = build_dashboard_for_user(user)

        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'dashboard': dashboard,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Sesión cerrada.'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data,
            'dashboard': build_dashboard_for_user(request.user),
        })


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_dashboard_for_user(request.user))


class AdminBaseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def ensure_admin(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({'detail': 'Administrador requerido.'}, status=HTTP_403_FORBIDDEN)
        return None


class AdminAccidentListView(AdminBaseAPIView):
    def get(self, request):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        serializer = AdminAccidentSerializer(Accident.objects.all(), many=True)
        return Response(serializer.data)

    def post(self, request):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        serializer = AdminAccidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        accident = serializer.save()
        return Response(AdminAccidentSerializer(accident).data, status=HTTP_201_CREATED)


class AdminAccidentDetailView(AdminBaseAPIView):
    def get_object(self, pk):
        try:
            return Accident.objects.get(pk=pk)
        except Accident.DoesNotExist:
            return None

    def get(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        accident = self.get_object(pk)
        if not accident:
            return Response({'detail': 'Accidente no encontrado.'}, status=HTTP_404_NOT_FOUND)
        return Response(AdminAccidentSerializer(accident).data)

    def put(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        accident = self.get_object(pk)
        if not accident:
            return Response({'detail': 'Accidente no encontrado.'}, status=HTTP_404_NOT_FOUND)
        serializer = AdminAccidentSerializer(accident, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        accident = self.get_object(pk)
        if not accident:
            return Response({'detail': 'Accidente no encontrado.'}, status=HTTP_404_NOT_FOUND)
        serializer = AdminAccidentSerializer(accident, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        accident = self.get_object(pk)
        if not accident:
            return Response({'detail': 'Accidente no encontrado.'}, status=HTTP_404_NOT_FOUND)
        accident.delete()
        return Response(status=204)


class AdminZoneListView(AdminBaseAPIView):
    def get(self, request):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        serializer = AdminZoneSerializer(Zone.objects.all(), many=True)
        return Response(serializer.data)

    def post(self, request):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        serializer = AdminZoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        zone = serializer.save()
        return Response(AdminZoneSerializer(zone).data, status=HTTP_201_CREATED)


class AdminZoneDetailView(AdminBaseAPIView):
    def get_object(self, pk):
        try:
            return Zone.objects.get(pk=pk)
        except Zone.DoesNotExist:
            return None

    def get(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        zone = self.get_object(pk)
        if not zone:
            return Response({'detail': 'Zona no encontrada.'}, status=HTTP_404_NOT_FOUND)
        return Response(AdminZoneSerializer(zone).data)

    def put(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        zone = self.get_object(pk)
        if not zone:
            return Response({'detail': 'Zona no encontrada.'}, status=HTTP_404_NOT_FOUND)
        serializer = AdminZoneSerializer(zone, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        zone = self.get_object(pk)
        if not zone:
            return Response({'detail': 'Zona no encontrada.'}, status=HTTP_404_NOT_FOUND)
        serializer = AdminZoneSerializer(zone, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        zone = self.get_object(pk)
        if not zone:
            return Response({'detail': 'Zona no encontrada.'}, status=HTTP_404_NOT_FOUND)
        zone.delete()
        return Response(status=204)


class AdminUserListView(AdminBaseAPIView):
    def get(self, request):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        serializer = AdminUserSerializer(User.objects.all().order_by('username'), many=True)
        return Response(serializer.data)

    def post(self, request):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=HTTP_201_CREATED)


class AdminUserDetailView(AdminBaseAPIView):
    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'Usuario no encontrado.'}, status=HTTP_404_NOT_FOUND)
        return Response(AdminUserSerializer(user).data)

    def put(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'Usuario no encontrado.'}, status=HTTP_404_NOT_FOUND)
        serializer = AdminUserSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'Usuario no encontrado.'}, status=HTTP_404_NOT_FOUND)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        denied = self.ensure_admin(request)
        if denied:
            return denied
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'Usuario no encontrado.'}, status=HTTP_404_NOT_FOUND)

        if user.pk == request.user.pk:
            return Response({'detail': 'No puedes eliminar tu propia cuenta desde esta sesión.'}, status=HTTP_400_BAD_REQUEST)

        if user.is_staff or user.is_superuser:
            admin_count = User.objects.filter(is_staff=True).count()
            if admin_count <= 1:
                return Response({'detail': 'No puedes eliminar el último administrador.'}, status=HTTP_400_BAD_REQUEST)

        user.delete()
        return Response(status=204)


class AccidentListView(APIView):
    def get(self, request):
        accidents = Accident.objects.all()
        hour_from = request.query_params.get('hour_from')
        hour_to = request.query_params.get('hour_to')

        try:
            if hour_from is not None and hour_from != '':
                accidents = accidents.filter(hour__gte=int(hour_from))
            if hour_to is not None and hour_to != '':
                accidents = accidents.filter(hour__lte=int(hour_to))
        except (TypeError, ValueError):
            return Response({'detail': 'hour_from and hour_to must be integers between 0 and 23.'}, status=400)

        serializer = AccidentSerializer(accidents, many=True)
        return Response(serializer.data)


class ZonesListView(APIView):
    def get(self, request):
        serializer = ZoneSerializer(Zone.objects.all(), many=True)
        return Response(serializer.data)


class WeatherStatusView(APIView):
    def get(self, request):
        api_key = os.environ.get('OPENWEATHER_API_KEY')
        if not api_key:
            return Response({
                'location': 'Medellín, CO',
                'condition': 'Lluvia simulada' if RAIN_STATE['isRaining'] else 'Sin lluvia simulada',
                'temperature': 22,
                'isRaining': RAIN_STATE['isRaining'],
                'source': 'simulated',
            })

        try:
            import requests

            response = requests.get(
                'https://api.openweathermap.org/data/2.5/weather',
                params={
                    'lat': 6.2442,
                    'lon': -75.5812,
                    'appid': api_key,
                    'units': 'metric',
                    'lang': 'es',
                },
                timeout=8,
            )
            response.raise_for_status()
            payload = response.json()
            weather_items = payload.get('weather') or [{}]
            condition = weather_items[0].get('description', 'Condición no disponible')
            weather_main = weather_items[0].get('main', '').lower()
            rain_payload = payload.get('rain') or {}
            is_raining = bool(rain_payload) or weather_main in {'rain', 'drizzle', 'thunderstorm'}
            temperature = payload.get('main', {}).get('temp')

            RAIN_STATE['isRaining'] = is_raining

            return Response({
                'location': 'Medellín, CO',
                'condition': condition,
                'temperature': temperature,
                'isRaining': is_raining,
                'source': 'openweathermap',
            })
        except Exception as exc:
            return Response({
                'location': 'Medellín, CO',
                'condition': 'Clima real no disponible',
                'temperature': 22,
                'isRaining': RAIN_STATE['isRaining'],
                'source': 'fallback',
                'detail': str(exc),
            })


class SiataWeatherView(APIView):
    def get(self, request):
        endpoint = os.environ.get('SIATA_WEATHER_API_URL')
        api_key = os.environ.get('SIATA_API_KEY')

        if not endpoint:
            return Response({
                'location': 'Medellín, CO',
                'condition': 'SIATA no configurado',
                'temperature': 22,
                'humidity': None,
                'wind_speed': None,
                'source': 'simulated',
            })

        try:
            import requests

            headers = {}
            if api_key:
                headers['Authorization'] = f'Bearer {api_key}'

            response = requests.get(endpoint, headers=headers, timeout=8)
            response.raise_for_status()
            payload = response.json()

            data = payload.get('data') or payload.get('observations') or payload
            if isinstance(data, list):
                data = data[0] if data else {}

            temperature = (
                data.get('temperature')
                or data.get('temp')
                or data.get('temperatura')
                or data.get('temperature_c')
            )
            humidity = data.get('humidity') or data.get('humedad')
            wind_speed = data.get('windSpeed') or data.get('wind_speed') or data.get('velocidad_viento')
            condition = (
                data.get('weather')
                or data.get('condition')
                or data.get('description')
                or data.get('estado')
                or 'Condición no disponible'
            )
            location = data.get('location') or data.get('stationName') or 'Medellín, CO'

            return Response({
                'location': location,
                'condition': condition,
                'temperature': temperature,
                'humidity': humidity,
                'wind_speed': wind_speed,
                'source': 'siata',
            })
        except Exception as exc:
            return Response({
                'location': 'Medellín, CO',
                'condition': 'Clima SIATA no disponible',
                'temperature': 22,
                'humidity': None,
                'wind_speed': None,
                'source': 'fallback',
                'detail': str(exc),
            })


class WeatherSimView(APIView):
    def post(self, request):
        raw_value = request.data.get('isRaining')
        if raw_value is None:
            RAIN_STATE['isRaining'] = not RAIN_STATE['isRaining']
        else:
            if isinstance(raw_value, str):
                RAIN_STATE['isRaining'] = raw_value.lower() in {'true', '1', 'yes'}
            else:
                RAIN_STATE['isRaining'] = bool(raw_value)
        return Response({
            'location': 'Medellín, CO',
            'condition': 'Lluvia simulada' if RAIN_STATE['isRaining'] else 'Sin lluvia simulada',
            'temperature': 20 if RAIN_STATE['isRaining'] else 22,
            'isRaining': RAIN_STATE['isRaining'],
            'source': 'simulated',
        })


class CongestionPredictionView(APIView):
    def get(self, request):
        hourly_counts = []
        for hour in range(24):
            hourly_counts.append(Accident.objects.filter(hour=hour).count())

        current_hour = request.query_params.get('hour')
        try:
            base_hour = int(current_hour) if current_hour is not None else 8
        except (TypeError, ValueError):
            return Response({'detail': 'hour must be an integer between 0 and 23.'}, status=400)

        if base_hour < 0 or base_hour > 23:
            return Response({'detail': 'hour must be an integer between 0 and 23.'}, status=400)

        future_hours = [((base_hour + offset) % 24) for offset in (1, 2)]

        try:
            from sklearn.linear_model import LinearRegression

            x_train = [[hour] for hour in range(24)]
            model = LinearRegression()
            model.fit(x_train, hourly_counts)
            predictions = model.predict([[hour] for hour in future_hours])
            predicted_counts = [max(0, round(float(value), 2)) for value in predictions]
            method = 'linear_regression'
        except Exception:
            predicted_counts = [hourly_counts[hour] for hour in future_hours]
            method = 'hourly_baseline'

        forecast = [
            {
                'hour': hour,
                'predicted_accidents': predicted_counts[index],
                'risk_level': 'alta' if predicted_counts[index] >= 8 else 'media' if predicted_counts[index] >= 4 else 'baja',
            }
            for index, hour in enumerate(future_hours)
        ]

        return Response({
            'base_hour': base_hour,
            'method': method,
            'forecast': forecast,
        })
