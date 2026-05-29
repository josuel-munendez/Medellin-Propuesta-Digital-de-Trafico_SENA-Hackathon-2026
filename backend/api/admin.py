from django.contrib import admin

from .models import Accident, WeatherRecord, Zone

admin.site.register(Accident)
admin.site.register(Zone)
admin.site.register(WeatherRecord)
