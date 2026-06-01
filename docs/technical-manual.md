# Manual técnico

## Arquitectura MVC/MVT
- Model: Django define `Accident`, `Zone` y `WeatherRecord` en `backend/api/models.py`.
- Controller: DRF expone controladores REST en `backend/api/views.py`.
- View: Vue 3 renderiza el dashboard, mapa, gráficos, alertas y rastreo en `frontend/`.

Django mantiene su patrón MVT interno, y DRF actúa como capa controladora REST entre modelos y frontend.

## Backend
- Proyecto: `backend/movilidata`
- App: `backend/api`
- Base de datos: SQLite por defecto para desarrollo. MySQL queda disponible activando `DATABASE_ENGINE=mysql` y las variables `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`.
- CORS: habilitado para `http://localhost:5173` y `http://localhost:8000`.

### Modelos
- `Accident`: `lat`, `lng`, `intensity`, `hour`, `date`.
- `Zone`: `name`, `risk_level`, `geometry` como GeoJSON serializado.
- `WeatherRecord`: registro opcional para clima histórico.

### Endpoints
- `GET /api/accidents/`: lista accidentes; acepta `hour_from` y `hour_to`.
- `GET /api/zones/`: lista zonas con geometría.
- `GET /api/weather/`: usa OpenWeatherMap si existe `OPENWEATHER_API_KEY`; si no, devuelve fallback simulado.
- `POST /api/simulate_rain/`: alterna lluvia en memoria para demo.
- `GET /api/congestion_prediction/`: predice las próximas 2 horas con regresión lineal simple.
- Endpoints auth/admin: login, logout, perfil, dashboard y CRUD administrativo.

## Datos
`python manage.py load_data` carga 120 accidentes determinísticos alrededor de Medellín, 3 zonas de riesgo y 2 usuarios demo.

## Frontend
- `frontend/src/components/Inicio.vue`: dashboard Must + Should.
- `frontend/src/components/RealtimeTracker.vue`: rastreo en vivo integrado desde el proyecto del compañero, con tiles CARTO para evitar bloqueos de uso directo de OSM.
- `frontend/src/services/api.js`: cliente API central.
- `frontend/src/api.js`: wrapper de compatibilidad.

Flujo: Vue llama servicios API, Django consulta la base configurada, DRF serializa JSON y Leaflet/Chart.js actualizan mapa, polígonos, heatmap y gráfico.

## Datos abiertos MapGIS
- `frontend/public/assets/data/total_incidentes_transito.geojson`: incidentes históricos de tránsito descargados desde MapGIS Medellín.
- `frontend/public/assets/data/MUERTOS 2021.xls`: registros fatales 2021 en formato XML Spreadsheet.
- La pestaña Rastreo en Vivo combina estos archivos con las APIs del proyecto y la capa opcional TomTom. Por rendimiento, el mapa renderiza una muestra reciente de incidentes y todos los registros fatales disponibles.

## PWA
`vite-plugin-pwa` genera manifest y service worker. `frontend/public/offline.html` funciona como fallback offline básico.
