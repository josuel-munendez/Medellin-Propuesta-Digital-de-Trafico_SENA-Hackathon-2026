from rest_framework import serializers

from .models import Accident, Zone


class AccidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accident
        fields = ['id', 'lat', 'lng', 'intensity', 'hour', 'date']


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ['id', 'name', 'risk_level', 'geometry']
