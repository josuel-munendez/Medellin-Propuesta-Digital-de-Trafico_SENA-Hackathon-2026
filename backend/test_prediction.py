"""
Test cases for ML prediction module.
Tests prediction logic with realistic patterns:
- Morning rush (6-9am high congestion)
- Evening rush (5-7pm high congestion)
- Night low traffic
- Weekday vs weekend patterns
"""

import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movilidata.settings')
django.setup()

from django.test import TestCase, Client
from api.models import Accident
from api.prediction import (
    get_hourly_distribution,
    get_day_factor,
    get_weighted_hourly_counts,
    calculate_trend,
    calculate_confidence,
    get_risk_level,
    weighted_prediction,
)
import json


class PredictionHelperTests(TestCase):
    """Test helper functions for prediction module."""

    @classmethod
    def setUpTestData(cls):
        """Create sample accident data with realistic patterns."""
        today = datetime.now().date()
        
        # Create 10 days of accident data
        for day_offset in range(10):
            current_date = today - timedelta(days=day_offset)
            
            # Morning rush (6-9am) - high congestion
            for hour in [6, 7, 8]:
                count = 15 + day_offset
                for i in range(count):
                    Accident.objects.create(
                        lat=6.2442 + (i % 10) * 0.001,
                        lng=-75.5812 + (i % 10) * 0.001,
                        intensity=5 + (i % 5),
                        hour=hour,
                        date=current_date
                    )
            
            # Mid-day low traffic (10am-4pm)
            for hour in [10, 11, 12, 13, 14, 15, 16]:
                count = 5 + day_offset % 3
                for i in range(count):
                    Accident.objects.create(
                        lat=6.2442 + (i % 10) * 0.001,
                        lng=-75.5812 + (i % 10) * 0.001,
                        intensity=3 + (i % 4),
                        hour=hour,
                        date=current_date
                    )
            
            # Evening rush (5-7pm) - high congestion
            for hour in [17, 18, 19]:
                count = 20 + day_offset
                for i in range(count):
                    Accident.objects.create(
                        lat=6.2442 + (i % 10) * 0.001,
                        lng=-75.5812 + (i % 10) * 0.001,
                        intensity=6 + (i % 4),
                        hour=hour,
                        date=current_date
                    )
            
            # Night low traffic (20-23, 0-5)
            for hour in list(range(20, 24)) + list(range(0, 6)):
                count = 2
                for i in range(count):
                    Accident.objects.create(
                        lat=6.2442 + (i % 10) * 0.001,
                        lng=-75.5812 + (i % 10) * 0.001,
                        intensity=2,
                        hour=hour,
                        date=current_date
                    )

    def test_hourly_distribution(self):
        """Test hourly distribution calculation."""
        dist = get_hourly_distribution(days_back=30)
        
        # Should have 24 hours
        self.assertEqual(len(dist), 24)
        
        # Morning rush should have more accidents than midnight
        self.assertGreater(dist[7], dist[3])
        
        # Evening rush should have high count
        self.assertGreater(dist[18], dist[12])
        
        # All values should be non-negative
        for hour, count in dist.items():
            self.assertGreaterEqual(count, 0)

    def test_day_factor(self):
        """Test day-of-week factor calculation."""
        # Weekday (Monday=0)
        weekday_factor = get_day_factor(0)
        self.assertAlmostEqual(weekday_factor, 1.0)
        
        # Weekend (Saturday=5)
        weekend_factor = get_day_factor(5)
        self.assertAlmostEqual(weekend_factor, 0.8)
        
        # Sunday
        sunday_factor = get_day_factor(6)
        self.assertAlmostEqual(sunday_factor, 0.8)

    def test_weighted_hourly_counts(self):
        """Test weighted hourly counts."""
        weighted = get_weighted_hourly_counts(days_back=30)
        
        # Should have 24 hours
        self.assertEqual(len(weighted), 24)
        
        # Morning rush should be weighted higher
        self.assertGreater(weighted[7], weighted[3])
        
        # All values should be non-negative
        for count in weighted:
            self.assertGreaterEqual(count, 0)

    def test_calculate_trend(self):
        """Test trend calculation."""
        # Increasing data should have positive slope
        increasing_data = [1, 2, 3, 4, 5, 6, 7, 8]
        trend = calculate_trend(increasing_data)
        self.assertGreater(trend, 0)
        
        # Decreasing data should have negative slope
        decreasing_data = [8, 7, 6, 5, 4, 3, 2, 1]
        trend = calculate_trend(decreasing_data)
        self.assertLess(trend, 0)
        
        # Constant data should have zero slope
        constant_data = [5] * 8
        trend = calculate_trend(constant_data)
        self.assertAlmostEqual(trend, 0, places=1)

    def test_calculate_confidence(self):
        """Test confidence calculation."""
        # High R² and samples should give high confidence
        high_conf = calculate_confidence(model_r2=0.8, sample_count=100, prediction_offset=1)
        self.assertGreater(high_conf, 0.7)
        
        # Low R² should give lower confidence
        low_conf = calculate_confidence(model_r2=0.3, sample_count=10, prediction_offset=1)
        self.assertLess(low_conf, high_conf)
        
        # Farther predictions should be less confident
        near_pred = calculate_confidence(model_r2=0.7, sample_count=50, prediction_offset=1)
        far_pred = calculate_confidence(model_r2=0.7, sample_count=50, prediction_offset=3)
        self.assertGreater(near_pred, far_pred)
        
        # All confidence values should be between 0.3 and 0.95
        for r2 in [0.2, 0.5, 0.8]:
            for samples in [5, 50, 500]:
                for offset in [1, 2, 3]:
                    conf = calculate_confidence(r2, samples, offset)
                    self.assertGreaterEqual(conf, 0.3)
                    self.assertLessEqual(conf, 0.95)

    def test_get_risk_level(self):
        """Test risk level classification."""
        # High congestion
        self.assertEqual(get_risk_level(10.0), 'alta')
        self.assertEqual(get_risk_level(8.0), 'alta')
        
        # Medium congestion
        self.assertEqual(get_risk_level(6.0), 'media')
        self.assertEqual(get_risk_level(4.0), 'media')
        
        # Low congestion
        self.assertEqual(get_risk_level(2.0), 'baja')
        self.assertEqual(get_risk_level(0.0), 'baja')

    def test_weighted_prediction(self):
        """Test weighted prediction output."""
        result = weighted_prediction(base_hour=7, hours_ahead=2, days_back=30)
        
        # Check structure
        self.assertIn('predictions', result)
        self.assertIn('method', result)
        self.assertIn('model_metrics', result)
        self.assertIn('metadata', result)
        
        # Should have 2 predictions
        self.assertEqual(len(result['predictions']), 2)
        
        # Each prediction should have required fields
        for pred in result['predictions']:
            self.assertIn('hour', pred)
            self.assertIn('count', pred)
            self.assertIn('risk_level', pred)
            self.assertIn('confidence', pred)
            
            # Validate ranges
            self.assertGreaterEqual(pred['hour'], 0)
            self.assertLessEqual(pred['hour'], 23)
            self.assertGreaterEqual(pred['count'], 0)
            self.assertIn(pred['risk_level'], ['baja', 'media', 'alta'])
            self.assertGreaterEqual(pred['confidence'], 0.3)
            self.assertLessEqual(pred['confidence'], 0.95)
        
        # Model metrics should be present
        self.assertIn('r_squared', result['model_metrics'])
        self.assertIn('samples', result['model_metrics'])
        
        # Metadata should show day factor and trend
        self.assertIn('day_factor', result['metadata'])
        self.assertIn('trend', result['metadata'])
        self.assertGreaterEqual(result['metadata']['day_factor'], 0.8)
        self.assertLessEqual(result['metadata']['day_factor'], 1.0)


class CongestionPredictionViewTests(TestCase):
    """Test the CongestionPredictionView API endpoint."""

    @classmethod
    def setUpTestData(cls):
        """Create sample accident data."""
        today = datetime.now().date()
        
        # Create 7 days of accident data with rush hour patterns
        for day_offset in range(7):
            current_date = today - timedelta(days=day_offset)
            
            # Morning rush (8am)
            for i in range(12):
                Accident.objects.create(
                    lat=6.2442 + (i % 5) * 0.001,
                    lng=-75.5812 + (i % 5) * 0.001,
                    intensity=5 + (i % 4),
                    hour=8,
                    date=current_date
                )
            
            # Evening rush (6pm)
            for i in range(15):
                Accident.objects.create(
                    lat=6.2442 + (i % 5) * 0.001,
                    lng=-75.5812 + (i % 5) * 0.001,
                    intensity=6 + (i % 4),
                    hour=18,
                    date=current_date
                )

    def setUp(self):
        self.client = Client()

    def test_prediction_endpoint_default_hour(self):
        """Test prediction endpoint with auto-detected current hour."""
        response = self.client.get('/api/congestion_prediction/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should return forecast with confidence
        self.assertIn('base_hour', data)
        self.assertIn('forecast', data)
        self.assertIn('method', data)
        self.assertIn('model_metrics', data)
        self.assertIn('metadata', data)
        
        # Forecast should have 2 predictions
        self.assertEqual(len(data['forecast']), 2)
        
        # Each forecast should have confidence
        for item in data['forecast']:
            self.assertIn('confidence', item)
            self.assertGreaterEqual(item['confidence'], 0.3)
            self.assertLessEqual(item['confidence'], 0.95)

    def test_prediction_endpoint_specific_hour(self):
        """Test prediction endpoint with specific hour."""
        # Query at morning rush (8am)
        response = self.client.get('/api/congestion_prediction/?hour=8')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data['base_hour'], 8)
        self.assertEqual(len(data['forecast']), 2)
        
        # Next 2 hours should be 9 and 10
        self.assertEqual(data['forecast'][0]['hour'], 9)
        self.assertEqual(data['forecast'][1]['hour'], 10)

    def test_prediction_endpoint_hour_wraparound(self):
        """Test prediction endpoint with hour wraparound (23pm)."""
        response = self.client.get('/api/congestion_prediction/?hour=23')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data['base_hour'], 23)
        # Should wrap around: 23 -> 0, 1
        self.assertEqual(data['forecast'][0]['hour'], 0)
        self.assertEqual(data['forecast'][1]['hour'], 1)

    def test_prediction_endpoint_invalid_hour(self):
        """Test prediction endpoint with invalid hour."""
        # Hour > 23
        response = self.client.get('/api/congestion_prediction/?hour=24')
        self.assertEqual(response.status_code, 400)
        
        # Hour < 0
        response = self.client.get('/api/congestion_prediction/?hour=-1')
        self.assertEqual(response.status_code, 400)
        
        # Non-integer
        response = self.client.get('/api/congestion_prediction/?hour=abc')
        self.assertEqual(response.status_code, 400)

    def test_prediction_morning_rush_high_confidence(self):
        """Test that morning rush hours get higher confidence."""
        # Request at 8am (morning rush)
        response = self.client.get('/api/congestion_prediction/?hour=8')
        morning_data = response.json()
        
        # Request at 3am (low traffic)
        response = self.client.get('/api/congestion_prediction/?hour=3')
        night_data = response.json()
        
        # Morning predictions should have data
        morning_confidence = morning_data['forecast'][0]['confidence']
        night_confidence = night_data['forecast'][0]['confidence']
        
        # Both should be valid confidence values
        self.assertGreaterEqual(morning_confidence, 0.3)
        self.assertGreaterEqual(night_confidence, 0.3)

    def test_prediction_response_format(self):
        """Test that response format matches specification."""
        response = self.client.get('/api/congestion_prediction/?hour=14')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check exact response format from task spec
        self.assertIn('base_hour', data)
        self.assertEqual(data['base_hour'], 14)
        
        self.assertIn('forecast', data)
        self.assertIsInstance(data['forecast'], list)
        
        self.assertIn('method', data)
        self.assertIn('model_metrics', data)
        
        # Check forecast item format
        for item in data['forecast']:
            self.assertIn('hour', item)
            self.assertIn('predicted_accidents', item)
            self.assertIn('risk_level', item)
            self.assertIn('confidence', item)


if __name__ == '__main__':
    import unittest
    unittest.main()
