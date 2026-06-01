# Medellín Movilidata OS

MVP full stack para HackData CTGI SENA 2026 con backend en Django REST, frontend en Vue 3 / React 18 y soporte PWA.

## Estructura
- `backend/` Proyecto Django + SQLite + DRF
- `frontend/` SPA Vue 3 + Vite + PWA
- `frontend-react/` SPA React 18 + Vite + Tailwind + PWA
- `docs/` Manual técnico, manual de usuario y guía de marca
- `screenshots/` Capturas de pantalla de soporte

## Objetivo
Reducir riesgos de movilidad urbana mediante:
- Identificación de puntos críticos de accidentes.
- Lectura de tendencias horarias de accidentalidad y congestión.
- Alertas de seguridad en escenarios de lluvia.
- Predicción ML de congestión vehicular.

## Arquitectura
- **Model**: `backend/api/models.py` define `Accident`, `Zone` y `WeatherRecord`.
- **View/Controller**: `backend/api/views.py` expone la API REST.
- **View**: `frontend/src/App.vue` (Vue) / `frontend-react/src/App.jsx` (React) consumen la API y renderizan el dashboard.

## Tecnologías

### Backend
- Python 3.11+ / Django 5.1+ / DRF 3.15+
- SQLite / MySQL / scikit-learn

### Frontend Vue 3
- Vue 3.5 + Vite 8
- Bootstrap 5 / Leaflet + leaflet.heat / Mapbox GL JS
- Chart.js / ECharts / TomTom Traffic API / SIATA

### Frontend React 18
- React 18.3 + Vite 5 + Tailwind CSS 4
- React Router 6 / Axios / Context API
- Leaflet + leaflet.heat / Chart.js + react-chartjs-2
- TomTom Traffic API / SIATA / OpenWeather

### PWA
- Manifest y service worker con `vite-plugin-pwa`
- Fallback offline en `frontend/public/offline.html` (Vue) y `frontend-react/public/offline.html` (React)

## Requisitos
- Python 3.11+ para backend
- Node.js 20+ y npm 10+ para frontend

## Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py load_data
python manage.py runserver
```

API principal:
- `GET /api/accidents/`
- `GET /api/accidents/?hour_from=6&hour_to=12`
- `GET /api/zones/`
- `GET /api/weather/`
- `POST /api/simulate_rain/`

## Frontend (Vue 3)
```bash
cd frontend
npm install
npm run dev
```

## Frontend (React 18)
```bash
cd frontend-react
npm install
cp .env.example .env.local
npm run dev
```

El frontend consume `http://localhost:8000/api/...` por defecto. Si necesitas otra URL, define `VITE_API_BASE_URL`.

## Clima SIATA
El clima y pronóstico local se consulta desde datos públicos de SIATA. Si el servidor no responde
o el navegador bloquea la solicitud, la app muestra un respaldo local para que el panel no se rompa.

## TomTom Traffic
Para habilitar tráfico en vivo e incidentes viales:
```bash
VITE_TOMTOM_API_KEY=tu_api_key
```
Con esa clave la app consulta:
- `flowSegmentData` para velocidad y congestión.
- `incidentDetails` para accidentes y cierres dentro del área de Medellín.

## Mapbox
Para usar los estilos oficiales e interacción de Mapbox GL JS:
```bash
VITE_MAPBOX_ACCESS_TOKEN=tu_token_publico
```
Si no hay token, la app usa Leaflet como respaldo con teselas OSM.

## Predicción ML
El backend incluye un modelo scikit-learn que predice la congestión vehicular
con 2 horas de antelación basado en datos históricos.

Fuentes SIATA usadas:
- `https://siata.gov.co/data/scroll/temperatura2.json`
- `https://siata.gov.co/data/scroll/pronosticoPPT.json`

## Datos reales de Medellín
Reemplaza los archivos:
- `public/assets/data/accidents.json`
- `public/assets/data/medellin-roads.json`
- `backend/data/accidents.json`
- `backend/data/zones.json`

La capa de tráfico e incidentes en vivo sale directamente de TomTom, así que solo necesitas
mantener las coordenadas base y configurar `VITE_TOMTOM_API_KEY`.

## Despliegue
- En desarrollo se ejecutan backend y frontend por separado.
- Para producción, puedes compilar Vue/React y servirlo detrás de Django o publicarlo aparte.

## Evidencias
- Agrega capturas en `screenshots/`.
- Completa el video demo cuando esté listo.
