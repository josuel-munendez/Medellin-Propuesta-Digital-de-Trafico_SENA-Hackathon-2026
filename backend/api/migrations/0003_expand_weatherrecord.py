# Generated migration for WeatherRecord model expansion

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_alter_accident_hour_alter_accident_intensity'),
    ]

    operations = [
        migrations.AddField(
            model_name='weatherrecord',
            name='humidity',
            field=models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)]),
        ),
        migrations.AddField(
            model_name='weatherrecord',
            name='pressure',
            field=models.IntegerField(default=1013),
        ),
        migrations.AddField(
            model_name='weatherrecord',
            name='wind_speed',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='weatherrecord',
            name='source',
            field=models.CharField(choices=[('openweathermap', 'OpenWeatherMap'), ('simulated', 'Simulated'), ('forecast', 'Forecast')], default='simulated', max_length=20),
        ),
        migrations.AlterField(
            model_name='weatherrecord',
            name='recorded_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AddIndex(
            model_name='weatherrecord',
            index=models.Index(fields=['-recorded_at'], name='api_weather_recorded_idx'),
        ),
        migrations.AddIndex(
            model_name='weatherrecord',
            index=models.Index(fields=['location', '-recorded_at'], name='api_weather_location_recorded_idx'),
        ),
    ]
