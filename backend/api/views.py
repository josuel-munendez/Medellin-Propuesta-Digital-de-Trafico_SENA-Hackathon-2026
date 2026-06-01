from datetime import datetime

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Accident, Zone
from .prediction import weighted_prediction
from .serializers import AccidentSerializer, ZoneSerializer

RAIN_STATE = {'isRaining': False}


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
        return Response(RAIN_STATE)


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
        return Response(RAIN_STATE)


class CongestionPredictionView(APIView):
    def get(self, request):
        current_hour = request.query_params.get('hour')

        try:
            if current_hour is not None:
                base_hour = int(current_hour)
            else:
                base_hour = datetime.now().hour
        except (TypeError, ValueError):
            return Response(
                {'detail': 'hour must be an integer between 0 and 23.'},
                status=400
            )

        if base_hour < 0 or base_hour > 23:
            return Response(
                {'detail': 'hour must be an integer between 0 and 23.'},
                status=400
            )

        result = weighted_prediction(base_hour=base_hour, hours_ahead=2, days_back=30)

        forecast = [
            {
                'hour': pred['hour'],
                'predicted_accidents': pred['count'],
                'risk_level': pred['risk_level'],
                'confidence': pred['confidence']
            }
            for pred in result['predictions']
        ]

        return Response({
            'base_hour': base_hour,
            'forecast': forecast,
            'method': result['method'],
            'model_metrics': result['model_metrics'],
            'metadata': result['metadata']
        })
