# Medellín Movilidata OS

MVP full stack para HackData CTGI SENA 2026 con backend en Django REST, frontend en Vue 3 y soporte PWA.

## Estructura
- `backend/` Proyecto Django + SQLite + DRF
- `frontend/` SPA Vue 3 + Vite + PWA
- `docs/` Manual técnico, manual de usuario y guía de marca
- `screenshots/` Capturas de pantalla de soporte

## Arquitectura
- **Model**: `backend/api/models.py` define `Accident` y `Zone`.
- **View/Controller**: `backend/api/views.py` expone la API REST.
- **View**: `frontend/src/App.vue` consume la API y renderiza el dashboard.

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

## Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend consume `http://localhost:8000/api/...` por defecto. Si necesitas otra URL, define `VITE_API_BASE_URL`.

## PWA
- Manifest y service worker con `vite-plugin-pwa`
- Fallback offline en `frontend/public/offline.html`

## Despliegue
- En desarrollo se ejecutan backend y frontend por separado.
- Para producción, puedes compilar Vue y servirlo detrás de Django o publicarlo aparte.

## Evidencias
- Agrega capturas en `screenshots/`.
- Completa el video demo cuando esté listo.
