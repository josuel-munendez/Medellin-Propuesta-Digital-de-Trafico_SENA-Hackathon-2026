# ML Prediction - Quick Reference

## Files Changed

### 1. `backend/api/prediction.py` (NEW - 272 lines)
Main prediction engine with helper functions.

**Usage:**
```python
from api.prediction import weighted_prediction

result = weighted_prediction(base_hour=14, hours_ahead=2, days_back=30)
# Returns: {
#   'predictions': [...],
#   'method': 'weighted_linear_regression',
#   'model_metrics': {'r_squared': 0.72, 'samples': 150},
#   'metadata': {'day_factor': 1.0, 'trend': 0.123}
# }
```

### 2. `backend/api/views.py` (MODIFIED)
Updated CongestionPredictionView to use new prediction engine.

**Key changes:**
- Line 26: Added `from .prediction import weighted_prediction`
- Line 648-690: Replaced old logic with enhanced `weighted_prediction()`
- Auto-detects current hour if not provided
- Returns confidence intervals

### 3. `backend/test_prediction.py` (NEW - 361 lines)
Comprehensive test suite with 13 tests.

**Run tests:**
```bash
cd backend
python manage.py test test_prediction -v 2
```

## API Endpoint

### GET /api/congestion_prediction/

**Query Parameters:**
- `hour` (optional): Hour to predict for (0-23)
  - Default: Current hour (datetime.now().hour)

**Response:**
```json
{
  "base_hour": 14,
  "forecast": [
    {
      "hour": 15,
      "predicted_accidents": 8.5,
      "risk_level": "alta",
      "confidence": 0.75
    },
    {
      "hour": 16,
      "predicted_accidents": 10.2,
      "risk_level": "alta",
      "confidence": 0.65
    }
  ],
  "method": "weighted_linear_regression",
  "model_metrics": {
    "r_squared": 0.72,
    "samples": 150
  },
  "metadata": {
    "day_factor": 1.0,
    "trend": 0.123
  }
}
```

## Helper Functions Reference

### `get_hourly_distribution(days_back=30)`
Returns dict: {hour: count} for accident distribution

### `get_day_factor(day_of_week)`
Returns: 1.0 (weekday) or 0.8 (weekend, Sat-Sun)

### `get_weighted_hourly_counts(days_back=30)`
Returns: list of 24 hourly counts with exponential weighting on recent data

### `calculate_trend(hourly_counts)`
Returns: float slope (positive=increasing, negative=decreasing)

### `calculate_confidence(model_r2, sample_count, prediction_offset)`
Returns: float 0.3-0.95

### `get_risk_level(predicted_count)`
Returns: 'baja' | 'media' | 'alta'

### `weighted_prediction(base_hour, hours_ahead=2, days_back=30)`
Returns: Full prediction dict with predictions, method, metrics, metadata

## Response Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| base_hour | int | 14 | Current hour (0-23) |
| hour | int | 15 | Predicted hour |
| predicted_accidents | float | 8.5 | Estimated accidents |
| risk_level | string | "alta" | baja/media/alta |
| confidence | float | 0.75 | 0.3-0.95 scale |
| method | string | "weighted_linear_regression" | Algorithm used |
| r_squared | float | 0.72 | Model fit quality |
| samples | int | 150 | Data points used |
| day_factor | float | 1.0 | Weekday=1.0, Weekend=0.8 |
| trend | float | 0.123 | Rate of change |

## Confidence Interpretation

| Range | Meaning |
|-------|---------|
| 0.9-0.95 | Very high confidence, rely on prediction |
| 0.75-0.89 | High confidence, good for planning |
| 0.6-0.74 | Medium confidence, use with caution |
| 0.3-0.59 | Low confidence, insufficient data |

## Risk Level Mapping

| Level | Range | Color |
|-------|-------|-------|
| baja | 0-3.9 | Green 🟢 |
| media | 4-7.9 | Yellow 🟡 |
| alta | 8+ | Red 🔴 |

## Example: Frontend Display

**JavaScript/Vue:**
```javascript
// Fetch prediction
const response = await fetch('/api/congestion_prediction/?hour=14');
const data = await response.json();

// Display
data.forecast.forEach(item => {
  console.log(`${item.hour}:00 - ${item.predicted_accidents} accidents`);
  console.log(`Risk: ${item.risk_level.toUpperCase()}`);
  console.log(`Confidence: ${(item.confidence * 100).toFixed(0)}%`);
});
```

## Development

### Add new prediction feature:

```python
# In prediction.py
def my_new_feature():
    """Description of feature."""
    pass

# Test it
# In test_prediction.py
def test_my_new_feature(self):
    """Test description."""
    pass
```

### Test locally:
```bash
cd backend
python manage.py shell

# Import and test
from api.prediction import weighted_prediction
result = weighted_prediction(base_hour=14)
print(result)
```

## Troubleshooting

### Issue: Low confidence (< 0.5)
- **Cause:** Insufficient historical data
- **Solution:** Wait for more data accumulation (30+ days)

### Issue: High predicted_accidents but low confidence
- **Cause:** Inconsistent historical pattern
- **Solution:** Check for data quality issues or special events

### Issue: method = "no_data"
- **Cause:** No accident data in database for requested date range
- **Solution:** Ensure Accident records exist with proper dates

### Issue: sklearn not available
- **Cause:** Missing dependency
- **Solution:** Install with `pip install scikit-learn`
- **Fallback:** Uses weighted_baseline method

## Performance

- Query time: < 100ms typical
- Memory usage: Minimal (30 days * 24 hours max)
- DB queries: 2-3 queries (filtered by date/hour)

## Version History

- **v1.0:** Initial implementation with day factors, trend detection, weighted data, confidence intervals
