# Manual técnico

## Arquitectura
El proyecto sigue una separación tipo MVC/MVT para el hackatón:
- **Model**: Django define `Accident`, `Zone` y `WeatherRecord`.
- **Controller**: las vistas de DRF reciben los requests y devuelven JSON.
- **View**: Vue 3 dibuja mapa, gráfica, filtros y alertas.

## Backend
- Ubicación: `backend/`
- Stack: Django, Django REST Framework, `django-cors-headers`, SQLite
- API:
	- `GET /api/accidents/`
	- `GET /api/accidents/?hour_from=6&hour_to=12`
	- `GET /api/zones/`
	- `GET /api/weather/`
	- `POST /api/simulate_rain/`
- CORS habilitado para `http://localhost:5173` y `http://localhost:8000`

## Frontend
- Ubicación: `frontend/`
- Stack: Vue 3, Vite, Bootstrap 5, Leaflet, Chart.js, PWA
- La app usa `frontend/src/api.js` para consumir la API de Django.
- `frontend/src/App.vue` renderiza:
	- mapa de calor con accidentes filtrados por hora
	- polígonos de zonas de riesgo
	- gráfica de tendencia horaria
	- alerta basada en riesgo de zona y lluvia simulada

## Datos semilla
- `backend/data/accidents.json`
- `backend/data/zones.json`
- Carga disponible con `python manage.py load_data`

## PWA
- `vite-plugin-pwa` genera manifest y service worker.
- `frontend/public/offline.html` actúa como fallback offline.

## Variables de entorno
- `VITE_API_BASE_URL`: cambia la URL base de la API si no usas `localhost:8000`.
