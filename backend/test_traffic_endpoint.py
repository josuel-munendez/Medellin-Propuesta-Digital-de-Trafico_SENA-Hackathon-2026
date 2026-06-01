#!/usr/bin/env python
"""Test script for the TomTom Traffic Analysis endpoint."""

import os
import sys
import django
from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
django.setup()

from rest_framework.test import APITestCase, APIClient


class TrafficAnalysisEndpointTest(APITestCase):
    """Test the traffic analysis endpoint."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_traffic_analysis_default_coords(self):
        """Test traffic analysis with default coordinates."""
        response = self.client.post('/api/traffic_analysis/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('source', data)
        self.assertEqual(data['source'], 'tomtom')
        self.assertIn('route', data)
        self.assertIn('traffic', data)
        print("✓ Test with default coordinates passed")
        print(f"  Response: {data}")

    def test_traffic_analysis_custom_coords(self):
        """Test traffic analysis with custom coordinates."""
        payload = {
            'start': [6.2442, -75.5812],
            'end': [6.25, -75.57]
        }
        response = self.client.post('/api/traffic_analysis/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('source', data)
        self.assertEqual(data['source'], 'tomtom')
        self.assertIn('route', data)
        self.assertIn('traffic', data)
        self.assertEqual(data['route']['startPoint'], [6.2442, -75.5812])
        self.assertEqual(data['route']['endPoint'], [6.25, -75.57])
        print("✓ Test with custom coordinates passed")
        print(f"  Response: {data}")

    def test_traffic_analysis_invalid_start_coords(self):
        """Test traffic analysis with invalid start coordinates."""
        payload = {
            'start': [200, -75.5812],  # Latitude out of range
            'end': [6.25, -75.57]
        }
        response = self.client.post('/api/traffic_analysis/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        print("✓ Test with invalid start coordinates passed (correctly rejected)")

    def test_traffic_analysis_invalid_end_coords(self):
        """Test traffic analysis with invalid end coordinates."""
        payload = {
            'start': [6.2442, -75.5812],
            'end': [6.25, -200]  # Longitude out of range
        }
        response = self.client.post('/api/traffic_analysis/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        print("✓ Test with invalid end coordinates passed (correctly rejected)")

    def test_traffic_analysis_requires_auth(self):
        """Test that traffic analysis requires authentication."""
        client = APIClient()
        response = client.post('/api/traffic_analysis/', {}, format='json')
        self.assertEqual(response.status_code, 401)
        print("✓ Test authentication requirement passed")

    def test_traffic_analysis_response_structure(self):
        """Test the response structure of traffic analysis."""
        response = self.client.post('/api/traffic_analysis/', {}, format='json')
        data = response.json()
        
        # Check route structure
        self.assertIn('startPoint', data['route'])
        self.assertIn('endPoint', data['route'])
        self.assertIn('distanceMeters', data['route'])
        self.assertIn('durationSeconds', data['route'])
        self.assertIn('trafficDelaySeconds', data['route'])
        
        # Check traffic structure
        self.assertIn('congestionPct', data['traffic'])
        self.assertIn('status', data['traffic'])
        self.assertIn('speedKmh', data['traffic'])
        self.assertIn('maxSpeedKmh', data['traffic'])
        
        # Verify status is one of the expected values
        self.assertIn(data['traffic']['status'], ['libre', 'moderada', 'saturada', 'critica', 'unknown'])
        
        print("✓ Test response structure passed")
        print(f"  Route: {data['route']}")
        print(f"  Traffic: {data['traffic']}")


if __name__ == '__main__':
    import unittest
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TrafficAnalysisEndpointTest)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
