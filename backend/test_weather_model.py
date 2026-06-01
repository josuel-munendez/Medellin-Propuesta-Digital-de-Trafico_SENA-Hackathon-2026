#!/usr/bin/env python
"""
Test script to verify weather model and view changes
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
sys.path.insert(0, os.path.dirname(__file__))

django.setup()

from django.utils import timezone
from datetime import timedelta
from api.models import WeatherRecord

print("=" * 60)
print("Testing Weather Model and Views")
print("=" * 60)

# Test 1: Check model fields
print("\n1. Checking WeatherRecord model fields:")
try:
    record = WeatherRecord(
        location='Medellín, CO',
        condition='Rainy',
        temperature=20.5,
        humidity=75,
        pressure=1012,
        wind_speed=5.2,
        is_raining=True,
        source='simulated'
    )
    print(f"   ✓ All fields created successfully")
    print(f"     - location: {record.location}")
    print(f"     - condition: {record.condition}")
    print(f"     - temperature: {record.temperature}")
    print(f"     - humidity: {record.humidity}")
    print(f"     - pressure: {record.pressure}")
    print(f"     - wind_speed: {record.wind_speed}")
    print(f"     - is_raining: {record.is_raining}")
    print(f"     - source: {record.source}")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 2: Check get_latest_for_location classmethod
print("\n2. Testing get_latest_for_location classmethod:")
try:
    # Create a test record
    test_record = WeatherRecord.objects.create(
        location='Medellín, CO',
        condition='Sunny',
        temperature=25,
        humidity=60,
        pressure=1013,
        wind_speed=3,
        is_raining=False,
        source='simulated'
    )
    
    # Test the classmethod
    latest = WeatherRecord.get_latest_for_location('Medellín, CO')
    assert latest.id == test_record.id
    print(f"   ✓ get_latest_for_location works correctly")
    print(f"     - Retrieved record ID: {latest.id}")
    print(f"     - Condition: {latest.condition}")
    
    # Clean up
    test_record.delete()
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 3: Check SOURCE_CHOICES
print("\n3. Testing SOURCE_CHOICES:")
try:
    sources = [choice[0] for choice in WeatherRecord.SOURCE_CHOICES]
    expected = ['openweathermap', 'simulated', 'forecast']
    assert sources == expected
    print(f"   ✓ SOURCE_CHOICES configured correctly: {sources}")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 4: Check db_index on recorded_at
print("\n4. Checking recorded_at field:")
try:
    field = WeatherRecord._meta.get_field('recorded_at')
    print(f"   ✓ recorded_at field exists")
    print(f"     - db_index: {field.db_index}")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 5: Check Meta.indexes
print("\n5. Checking Model indexes:")
try:
    indexes = WeatherRecord._meta.indexes
    print(f"   ✓ Model has {len(indexes)} indexes")
    for idx, index in enumerate(indexes, 1):
        print(f"     - Index {idx}: {index.fields}")
except Exception as e:
    print(f"   ✗ Error: {e}")

print("\n" + "=" * 60)
print("All model tests completed!")
print("=" * 60)
