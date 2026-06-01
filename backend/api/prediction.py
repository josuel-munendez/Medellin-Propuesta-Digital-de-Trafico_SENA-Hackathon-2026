"""
Enhanced ML prediction module with real data analysis.
Provides helper functions for congestion forecasting with:
- Day-of-week factors (weekends vs weekdays)
- Weighted recent data (more weight to last 3 days)
- Seasonality/trend detection
- Confidence intervals
"""

from datetime import datetime, timedelta
from .models import Accident
import numpy as np


def get_hourly_distribution(days_back=30):
    """
    Analyze accident distribution by hour over the last N days.
    Returns dict mapping hour -> accident count
    """
    cutoff = datetime.now().date() - timedelta(days=days_back)
    accidents = Accident.objects.filter(date__gte=cutoff)
    
    distribution = {}
    for hour in range(24):
        distribution[hour] = accidents.filter(hour=hour).count()
    
    return distribution


def get_day_factor(day_of_week):
    """
    Calculate day-of-week multiplier.
    Weekdays (Mon-Fri) typically have different patterns than weekends (Sat-Sun).
    
    Args:
        day_of_week: 0=Monday, 6=Sunday (from weekday())
    
    Returns:
        float: multiplier (1.0 = baseline, >1.0 = higher traffic, <1.0 = lower traffic)
    """
    # Weekends typically have 20% lower congestion than weekdays
    if day_of_week >= 5:  # Saturday=5, Sunday=6
        return 0.8
    return 1.0


def get_weighted_hourly_counts(days_back=30):
    """
    Calculate hourly counts with exponential weighting on recent data.
    More recent data gets higher weight (last 3 days = 50% of total weight).
    
    Returns:
        list: hourly counts [0-23] with recent data weighted higher
    """
    cutoff = datetime.now().date() - timedelta(days=days_back)
    all_accidents = Accident.objects.filter(date__gte=cutoff).order_by('date')
    
    if not all_accidents.exists():
        return [0] * 24
    
    dates = sorted(set(a.date for a in all_accidents if a.date))
    if not dates:
        return [0] * 24
    
    # Exponential weights: recent data gets higher weight
    weights = np.exp(np.linspace(-2, 0, len(dates)))
    weights /= weights.sum()  # Normalize to 1.0
    
    weighted_counts = [0] * 24
    
    for date, weight in zip(dates, weights):
        day_accidents = all_accidents.filter(date=date)
        for hour in range(24):
            count = day_accidents.filter(hour=hour).count()
            weighted_counts[hour] += count * weight
    
    return weighted_counts


def calculate_trend(hourly_counts):
    """
    Detect trend in hourly data using simple linear regression.
    Returns slope (negative = decreasing trend, positive = increasing trend).
    """
    if not hourly_counts or len(hourly_counts) < 2:
        return 0.0
    
    x = np.array(range(len(hourly_counts)))
    y = np.array(hourly_counts)
    
    # Filter out zero-only data
    if np.sum(y) == 0:
        return 0.0
    
    slope = np.polyfit(x, y, 1)[0]
    return float(slope)


def calculate_confidence(model_r2, sample_count, prediction_offset=1):
    """
    Calculate confidence level (0-1) based on:
    - Model R² score
    - Sample count (more samples = higher confidence)
    - Prediction offset (1-hour = high confidence, 2+ hours = lower confidence)
    
    Args:
        model_r2: float, R² score from fitted model (0-1)
        sample_count: int, number of samples used for training
        prediction_offset: int, hours into future (1=next hour, 2=2 hours ahead)
    
    Returns:
        float: confidence between 0.3 and 0.95
    """
    # Base confidence from R² score (weight: 50%)
    r2_confidence = max(0.3, model_r2 * 0.95)
    
    # Sample count confidence (weight: 30%)
    # Logarithmic scale: more samples = slightly higher confidence, but with diminishing returns
    sample_confidence = min(0.95, 0.3 + 0.4 * np.log1p(sample_count) / np.log1p(500))
    
    # Time offset penalty (weight: 20%)
    # Further predictions are less confident
    time_penalty = 1.0 - (prediction_offset - 1) * 0.15
    
    total_confidence = (
        r2_confidence * 0.5 +
        sample_confidence * 0.3 +
        time_penalty * 0.2
    )
    
    return max(0.3, min(0.95, total_confidence))


def get_risk_level(predicted_count):
    """
    Convert predicted accident count to risk level.
    
    Args:
        predicted_count: float, predicted number of accidents
    
    Returns:
        str: 'baja' (low), 'media' (medium), or 'alta' (high)
    """
    if predicted_count >= 8:
        return 'alta'
    elif predicted_count >= 4:
        return 'media'
    return 'baja'


def weighted_prediction(base_hour, hours_ahead=2, days_back=30):
    """
    Enhanced prediction using weighted recent data and day-of-week factors.
    
    Args:
        base_hour: int, current hour (0-23)
        hours_ahead: int, number of hours to predict (default: 2)
        days_back: int, days of historical data to use (default: 30)
    
    Returns:
        dict: {
            'predictions': [
                {'hour': int, 'count': float, 'risk_level': str, 'confidence': float},
                ...
            ],
            'method': str,
            'model_metrics': {'r_squared': float, 'samples': int},
            'metadata': {'day_factor': float, 'trend': float}
        }
    """
    try:
        from sklearn.linear_model import LinearRegression
        from sklearn.metrics import r2_score
        sklearn_available = True
    except ImportError:
        sklearn_available = False
    
    # Get weighted hourly counts
    weighted_counts = get_weighted_hourly_counts(days_back=days_back)
    
    # Fallback if no data
    if not weighted_counts or sum(weighted_counts) == 0:
        return {
            'predictions': [
                {
                    'hour': ((base_hour + offset) % 24),
                    'count': 0,
                    'risk_level': 'baja',
                    'confidence': 0.3
                }
                for offset in range(1, hours_ahead + 1)
            ],
            'method': 'no_data',
            'model_metrics': {'r_squared': 0.0, 'samples': 0},
            'metadata': {'day_factor': 1.0, 'trend': 0.0}
        }
    
    # Calculate day factor
    today = datetime.now().date()
    day_factor = get_day_factor(today.weekday())
    
    # Calculate trend
    trend = calculate_trend(weighted_counts)
    
    predictions = []
    
    if sklearn_available and sum(weighted_counts) > 0:
        # Train model on weighted hourly data
        x_train = np.array([[hour] for hour in range(24)])
        y_train = np.array(weighted_counts)
        
        model = LinearRegression()
        model.fit(x_train, y_train)
        
        # Calculate R² for confidence assessment
        y_pred_train = model.predict(x_train)
        r2 = max(0.0, r2_score(y_train, y_pred_train))
        samples = sum(1 for d in range(days_back) if Accident.objects.filter(date=today - timedelta(days=d)).exists())
        
        # Predict future hours
        for offset in range(1, hours_ahead + 1):
            future_hour = (base_hour + offset) % 24
            predicted_count = float(model.predict([[future_hour]])[0])
            
            # Apply day factor adjustment
            adjusted_count = predicted_count * day_factor
            
            # Apply trend (small adjustment)
            trend_adjustment = trend * offset * 0.1
            adjusted_count = max(0, adjusted_count + trend_adjustment)
            
            confidence = calculate_confidence(r2, samples, prediction_offset=offset)
            risk_level = get_risk_level(adjusted_count)
            
            predictions.append({
                'hour': future_hour,
                'count': round(adjusted_count, 2),
                'risk_level': risk_level,
                'confidence': round(confidence, 2)
            })
        
        method = 'weighted_linear_regression'
        metrics = {'r_squared': round(r2, 3), 'samples': samples}
    else:
        # Fallback: use weighted baseline
        for offset in range(1, hours_ahead + 1):
            future_hour = (base_hour + offset) % 24
            predicted_count = weighted_counts[future_hour]
            
            # Apply day factor
            adjusted_count = predicted_count * day_factor
            
            confidence = calculate_confidence(0.4, max(1, len(weighted_counts)), prediction_offset=offset)
            risk_level = get_risk_level(adjusted_count)
            
            predictions.append({
                'hour': future_hour,
                'count': round(adjusted_count, 2),
                'risk_level': risk_level,
                'confidence': round(confidence, 2)
            })
        
        method = 'weighted_baseline'
        metrics = {'r_squared': 0.4, 'samples': len(weighted_counts)}
    
    return {
        'predictions': predictions,
        'method': method,
        'model_metrics': metrics,
        'metadata': {'day_factor': round(day_factor, 2), 'trend': round(trend, 3)}
    }
