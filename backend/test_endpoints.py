#!/usr/bin/env python
"""Smoke test script for all API endpoints."""

import os
import sys
import django
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
django.setup()

from rest_framework.test import APIClient
from api.models import Accident, Zone, WeatherRecord


def print_result(endpoint, status_code, expected_code, response_data=None):
    """Print test result with ✅ or ❌"""
    if status_code == expected_code:
        print(f"✅ {endpoint}")
        if response_data and isinstance(response_data, dict):
            # Print a preview of the response
            keys = list(response_data.keys())[:3]
            print(f"   Response keys: {keys}")
        return True
    else:
        print(f"❌ {endpoint} - Expected {expected_code}, got {status_code}")
        if response_data:
            print(f"   Error: {response_data}")
        return False


def main():
    """Run all endpoint tests."""
    print("\n" + "="*60)
    print("API ENDPOINT SMOKE TEST")
    print("="*60 + "\n")
    
    # Initialize test client
    client = APIClient()
    results = []
    
    # Step 1: Create test user for authentication
    print("[1] Setting up test user and authentication...")
    try:
        # Clean up existing test user
        User.objects.filter(username='smoketest').delete()
        
        # Create test user
        test_user = User.objects.create_user(
            username='smoketest',
            email='smoke@test.com',
            password='smoketest123'
        )
        
        # Create superuser for admin endpoints
        User.objects.filter(username='admin').delete()
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='admin123'
        )
        
        # Create tokens
        Token.objects.filter(user=test_user).delete()
        Token.objects.filter(user=admin_user).delete()
        token = Token.objects.create(user=test_user)
        admin_token = Token.objects.create(user=admin_user)
        
        print(f"✓ Test user created: {test_user.username}")
        print(f"✓ Admin user created: {admin_user.username}\n")
    except Exception as e:
        print(f"❌ Failed to create test users: {e}\n")
        return
    
    # Step 2: Test GET endpoints (no authentication)
    print("[2] Testing public GET endpoints (no auth required)...")
    print("-" * 60)
    
    # Test 1: GET /api/accidents/ (list)
    try:
        response = client.get('/api/accidents/')
        results.append(print_result("GET /api/accidents/", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ GET /api/accidents/ - {e}")
        results.append(False)
    
    # Test 2: GET /api/zones/ (list)
    try:
        response = client.get('/api/zones/')
        results.append(print_result("GET /api/zones/", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ GET /api/zones/ - {e}")
        results.append(False)
    
    # Test 3: GET /api/weather/ (current)
    try:
        response = client.get('/api/weather/')
        results.append(print_result("GET /api/weather/ (current)", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ GET /api/weather/ - {e}")
        results.append(False)
    
    # Test 4: GET /api/weather/history/ (history)
    try:
        response = client.get('/api/weather/history/')
        results.append(print_result("GET /api/weather/history/", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ GET /api/weather/history/ - {e}")
        results.append(False)
    
    print()
    
    # Step 3: Test POST endpoints with authentication
    print("[3] Testing POST endpoints (requires authentication)...")
    print("-" * 60)
    
    # Authenticate the client
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    
    # Test 5: POST /api/traffic_analysis/ (with dummy coords)
    try:
        payload = {
            'start': [6.2442, -75.5812],  # Medellín coordinates
            'end': [6.2500, -75.5700]      # Another point in Medellín
        }
        response = client.post('/api/traffic_analysis/', payload, format='json')
        results.append(print_result("POST /api/traffic_analysis/", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ POST /api/traffic_analysis/ - {e}")
        results.append(False)
    
    # Test 6: GET /api/congestion_prediction/?hour=14
    try:
        response = client.get('/api/congestion_prediction/?hour=14')
        results.append(print_result("GET /api/congestion_prediction/?hour=14", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ GET /api/congestion_prediction/ - {e}")
        results.append(False)
    
    print()
    
    # Step 4: Test authentication endpoint
    print("[4] Testing authentication endpoint...")
    print("-" * 60)
    
    # Use unauthenticated client for login
    client.credentials()
    
    # Test 7: POST /api/auth/login/ (with admin creds)
    try:
        payload = {
            'username': 'admin',
            'password': 'admin123'
        }
        response = client.post('/api/auth/login/', payload, format='json')
        results.append(print_result("POST /api/auth/login/", response.status_code, 200, response.json()))
    except Exception as e:
        print(f"❌ POST /api/auth/login/ - {e}")
        results.append(False)
    
    print()
    
    # Step 5: Summary
    print("="*60)
    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"TEST SUMMARY")
    print(f"Passed: {passed}/{total} ({percentage:.1f}%)")
    print("="*60 + "\n")
    
    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
