from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Accident(models.Model):
    lat = models.FloatField()
    lng = models.FloatField()
    intensity = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    hour = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(23)])
    date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['hour', 'id']

    def __str__(self):
        return f'Accident {self.id} @ {self.hour:02d}:00'


class Zone(models.Model):
    RISK_LOW = 'baja'
    RISK_MEDIUM = 'media'
    RISK_HIGH = 'alta'

    RISK_CHOICES = [
        (RISK_HIGH, 'Alta'),
        (RISK_MEDIUM, 'Media'),
        (RISK_LOW, 'Baja'),
    ]

    name = models.CharField(max_length=120)
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES)
    geometry = models.TextField(help_text='GeoJSON polygon serializado como texto')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class WeatherRecord(models.Model):
    SOURCE_CHOICES = [
        ('openweathermap', 'OpenWeatherMap'),
        ('simulated', 'Simulated'),
        ('forecast', 'Forecast'),
    ]

    location = models.CharField(max_length=120, default='Medellín, CO')
    condition = models.CharField(max_length=120)
    temperature = models.FloatField()
    humidity = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    pressure = models.IntegerField(default=1013)
    wind_speed = models.FloatField(default=0)
    is_raining = models.BooleanField(default=False)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='simulated')
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['-recorded_at']),
            models.Index(fields=['location', '-recorded_at']),
        ]
