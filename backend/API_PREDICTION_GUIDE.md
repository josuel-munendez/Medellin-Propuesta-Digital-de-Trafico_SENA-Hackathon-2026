# ML Prediction Examples and API Documentation

## Endpoint: `/api/congestion_prediction/`

### Basic Usage

#### 1. Auto-detect current hour (recommended for frontend)
```bash
GET /api/congestion_prediction/
```

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

#### 2. Query with specific hour
```bash
GET /api/congestion_prediction/?hour=8
```

**Response:**
```json
{
  "base_hour": 8,
  "forecast": [
    {
      "hour": 9,
      "predicted_accidents": 12.3,
      "risk_level": "alta",
      "confidence": 0.82
    },
    {
      "hour": 10,
      "predicted_accidents": 9.8,
      "risk_level": "alta",
      "confidence": 0.75
    }
  ],
  "method": "weighted_linear_regression",
  "model_metrics": {
    "r_squared": 0.78,
    "samples": 210
  },
  "metadata": {
    "day_factor": 1.0,
    "trend": -0.456
  }
}
```

### Response Fields Explained

#### forecast array:
- **hour** (int, 0-23): Predicted hour
- **predicted_accidents** (float): Estimated number of accidents
- **risk_level** (string):
  - `"baja"`: Low risk (0-3.9 accidents)
  - `"media"`: Medium risk (4-7.9 accidents)
  - `"alta"`: High risk (≥8 accidents)
- **confidence** (float, 0.3-0.95): Prediction confidence level
  - 0.9-0.95: Very high confidence (high data quality)
  - 0.75-0.89: High confidence (good prediction)
  - 0.6-0.74: Medium confidence (reasonable prediction)
  - 0.3-0.59: Low confidence (use with caution)

#### method (string):
- `"weighted_linear_regression"`: Used when sklearn available + sufficient data
- `"weighted_baseline"`: Used when sklearn unavailable
- `"no_data"`: Used when no historical data exists

#### model_metrics:
- **r_squared** (float, 0-1): Model fit quality
  - 0.7+: Good fit
  - 0.5-0.7: Moderate fit
  - <0.5: Poor fit
- **samples** (int): Number of data days used (max 30)

#### metadata:
- **day_factor** (float, 0.8-1.0):
  - 1.0: Weekday (Mon-Fri)
  - 0.8: Weekend (Sat-Sun) - typically 20% less congestion
- **trend** (float): Hourly trend slope
  - Positive: Traffic increasing
  - Negative: Traffic decreasing
  - ~0: Stable traffic

---

## Frontend Integration Examples

### Vue.js Component Example

```vue
<template>
  <div class="prediction-widget">
    <h3>Predicción de Congestión</h3>
    
    <div v-if="loading" class="spinner">Cargando...</div>
    
    <div v-else-if="error" class="alert alert-danger">
      Error: {{ error }}
    </div>
    
    <div v-else class="forecast">
      <p class="base-time">Hora actual: {{ baseHour }}:00</p>
      <p class="method">Método: {{ method }}</p>
      
      <div class="forecast-items">
        <div 
          v-for="item in forecast" 
          :key="item.hour"
          :class="['forecast-item', item.risk_level]"
        >
          <div class="time">{{ item.hour }}:00</div>
          <div class="accidents">{{ item.predicted_accidents }} accidentes</div>
          <div :class="['risk', item.risk_level]">{{ riskLabel(item.risk_level) }}</div>
          <div :class="['confidence', confLevel(item.confidence)]">
            Confianza: {{ (item.confidence * 100).toFixed(0) }}%
          </div>
        </div>
      </div>
      
      <div class="metrics">
        <p>R²: {{ modelMetrics.r_squared }} | Muestras: {{ modelMetrics.samples }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CongestionPrediction',
  data() {
    return {
      loading: false,
      error: null,
      baseHour: null,
      forecast: [],
      method: '',
      modelMetrics: {}
    }
  },
  methods: {
    riskLabel(level) {
      const labels = { 'baja': 'Bajo', 'media': 'Medio', 'alta': 'Alto' };
      return labels[level] || level;
    },
    confLevel(confidence) {
      if (confidence >= 0.8) return 'high';
      if (confidence >= 0.6) return 'medium';
      return 'low';
    },
    fetchPrediction(hour = null) {
      this.loading = true;
      this.error = null;
      
      let url = '/api/congestion_prediction/';
      if (hour !== null) {
        url += `?hour=${hour}`;
      }
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          this.baseHour = data.base_hour;
          this.forecast = data.forecast;
          this.method = data.method;
          this.modelMetrics = data.model_metrics;
        })
        .catch(err => {
          this.error = err.message;
        })
        .finally(() => {
          this.loading = false;
        });
    }
  },
  mounted() {
    this.fetchPrediction();
    // Refresh every 30 minutes
    setInterval(() => this.fetchPrediction(), 30 * 60 * 1000);
  }
}
</script>

<style scoped>
.forecast-item {
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
  border-left: 4px solid;
}

.forecast-item.alta {
  border-left-color: #dc3545;
  background: #f8d7da;
}

.forecast-item.media {
  border-left-color: #ffc107;
  background: #fff3cd;
}

.forecast-item.baja {
  border-left-color: #28a745;
  background: #d4edda;
}

.confidence.high { color: #28a745; font-weight: bold; }
.confidence.medium { color: #ffc107; }
.confidence.low { color: #dc3545; }
</style>
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function CongestionPrediction({ hour = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        let url = '/api/congestion_prediction/';
        if (hour !== null) {
          url += `?hour=${hour}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
    const interval = setInterval(fetchPrediction, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hour]);

  if (loading) return <div>Cargando predicción...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  const riskColor = (level) => ({
    'alta': '#dc3545',
    'media': '#ffc107',
    'baja': '#28a745'
  }[level]);

  const confLevel = (conf) => conf >= 0.8 ? 'Alta' : conf >= 0.6 ? 'Media' : 'Baja';

  return (
    <div className="prediction-widget">
      <h3>Predicción de Congestión</h3>
      <p>Hora actual: {data.base_hour}:00</p>
      
      {data.forecast.map((item) => (
        <div
          key={item.hour}
          style={{
            borderLeft: `4px solid ${riskColor(item.risk_level)}`,
            padding: '12px',
            margin: '8px 0',
            background: riskColor(item.risk_level) + '22'
          }}
        >
          <strong>{item.hour}:00</strong> - {item.predicted_accidents} accidentes
          <br />
          Riesgo: <strong>{item.risk_level.toUpperCase()}</strong>
          <br />
          Confianza: {(item.confidence * 100).toFixed(0)}% ({confLevel(item.confidence)})
        </div>
      ))}
      
      <small>
        R²: {data.model_metrics.r_squared} | 
        Método: {data.method} | 
        Factor día: {data.metadata.day_factor}
      </small>
    </div>
  );
}

export default CongestionPrediction;
```

---

## Error Handling

### Invalid Hour Parameter
```bash
GET /api/congestion_prediction/?hour=25
```

**Response (400):**
```json
{
  "detail": "hour must be an integer between 0 and 23."
}
```

### Non-integer Hour
```bash
GET /api/congestion_prediction/?hour=abc
```

**Response (400):**
```json
{
  "detail": "hour must be an integer between 0 and 23."
}
```

---

## Interpretation Guide for Frontend

### Confidence Levels & UI Actions

| Confidence | Risk Level | UI Display | Recommendation |
|------------|-----------|-----------|-----------------|
| 0.9-0.95 | Alta | ⚠️⚠️ HIGH CONFIDENCE | Strongly recommend avoiding route |
| 0.75-0.89 | Alta | ⚠️ MEDIUM CONFIDENCE | Recommend alternative routes |
| 0.6-0.74 | Media | ⚠ LOW CONFIDENCE | Monitor situation |
| <0.6 | Baja | ℹ️ UNCERTAIN | Insufficient data |

### Traffic Pattern Interpretation

**Day Factor = 1.0 (Weekday)**
- Normal traffic patterns expected
- Rush hours (8-9am, 5-7pm) will likely be congested

**Day Factor = 0.8 (Weekend)**
- 20% less traffic expected overall
- Rush hour effects diminished
- More predictable, steady flow

**Trend > 0 (Increasing)**
- Congestion expected to worsen next hours
- Recommend avoiding during predicted peaks

**Trend < 0 (Decreasing)**
- Congestion improving over next hours
- May be safe to travel in 2+ hours

**Model R² < 0.5**
- Poor prediction quality
- Use with caution, especially for longer horizons

---

## Performance Tips

1. **Cache predictions** for 15-30 minutes to reduce API calls
2. **Refresh before peak hours** (7-8am, 4-5pm) for fresh data
3. **Show confidence levels** to users - they expect uncertainty
4. **Use trend data** for "improving soon?" notifications
5. **Store metadata** for analytics (which method, day factor, R²)
