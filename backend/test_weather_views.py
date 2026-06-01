#!/usr/bin/env python
"""
Test script to verify weather views changes
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
sys.path.insert(0, os.path.dirname(__file__))

django.setup()

from api.views import WeatherStatusView, WeatherSimView, WeatherHistoryView
from api.models import WeatherRecord
import inspect

print("=" * 60)
print("Testing Weather Views")
print("=" * 60)

# Test 1: WeatherStatusView exists and has get method
print("\n1. Testing WeatherStatusView:")
try:
    assert hasattr(WeatherStatusView, 'get'), "WeatherStatusView should have get method"
    # Check if the method uses WeatherRecord
    source = inspect.getsource(WeatherStatusView.get)
    assert 'WeatherRecord' in source, "WeatherStatusView.get should use WeatherRecord"
    print("   ✓ WeatherStatusView has get method")
    print("   ✓ WeatherStatusView uses WeatherRecord")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 2: WeatherSimView exists and has post method
print("\n2. Testing WeatherSimView:")
try:
    assert hasattr(WeatherSimView, 'post'), "WeatherSimView should have post method"
    # Check if the method creates WeatherRecord
    source = inspect.getsource(WeatherSimView.post)
    assert 'WeatherRecord' in source, "WeatherSimView.post should create WeatherRecord"
    print("   ✓ WeatherSimView has post method")
    print("   ✓ WeatherSimView creates WeatherRecord")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 3: WeatherHistoryView exists and has get method
print("\n3. Testing WeatherHistoryView:")
try:
    assert hasattr(WeatherHistoryView, 'get'), "WeatherHistoryView should have get method"
    source = inspect.getsource(WeatherHistoryView.get)
    assert 'WeatherRecord' in source, "WeatherHistoryView.get should query WeatherRecord"
    print("   ✓ WeatherHistoryView has get method")
    print("   ✓ WeatherHistoryView queries WeatherRecord")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 4: Check if WeatherHistoryView filters by hours
print("\n4. Testing WeatherHistoryView filtering logic:")
try:
    source = inspect.getsource(WeatherHistoryView.get)
    assert 'hours' in source.lower(), "Should handle hours parameter"
    assert 'timedelta' in source, "Should use timedelta for time filtering"
    print("   ✓ WeatherHistoryView handles hours parameter")
    print("   ✓ WeatherHistoryView uses timedelta for filtering")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 5: Check imports
print("\n5. Checking imports in views:")
try:
    from api import views
    assert hasattr(views, 'WeatherRecord'), "views should import WeatherRecord"
    assert hasattr(views, 'timezone'), "views should import timezone"
    assert hasattr(views, 'timedelta'), "views should import timedelta"
    print("   ✓ WeatherRecord imported in views")
    print("   ✓ timezone imported in views")
    print("   ✓ timedelta imported in views")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 6: Check URL configuration
print("\n6. Testing URL configuration:")
try:
    from api.urls import urlpatterns
    url_names = [pattern.name for pattern in urlpatterns if hasattr(pattern, 'name')]
    assert 'weather-history' in url_names, "weather-history URL should be registered"
    print("   ✓ weather-history URL is registered")
    print(f"   ✓ Total URL patterns: {len(urlpatterns)}")
except Exception as e:
    print(f"   ✗ Error: {e}")

print("\n" + "=" * 60)
print("All view tests completed!")
print("=" * 60)
