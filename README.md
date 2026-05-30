# Urbanlytics

Urbanlytics es un MVP full stack para analizar riesgo vial en Medellín. Integra Django REST, SQLite en desarrollo, Vue 3, Leaflet, Chart.js, Bootstrap 5 y PWA para mostrar accidentes, zonas de riesgo, clima y pronóstico simple de congestión.

## Tecnologías
- Backend: Django, Django REST Framework, django-cors-headers, SQLite ahora, MySQL/PostgreSQL después, OpenWeatherMap, scikit-learn.
- Frontend: Vue 3, Vite, Bootstrap 5, Leaflet, leaflet.heat, Chart.js, vite-plugin-pwa.
- Arquitectura: Django MVT + DRF como controlador REST; Vue actúa como capa de vista.

## Estructura
- `backend/`: API Django, modelos, endpoints y comando de carga semilla.
- `frontend/`: SPA Vue oficial del proyecto.
- `docs/`: manual técnico, manual de usuario y guía de marca.
- `version_proyecto_compañero/`: fuente histórica usada para integrar la pestaña de rastreo en vivo.

## Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Por defecto el backend usa SQLite para avanzar rápido en desarrollo. Solo necesitas la API key de clima si quieres clima real:
```bash
export OPENWEATHER_API_KEY=tu_api_key_opcional
```

Cuando se migre a MySQL, activa:
```bash
export DATABASE_ENGINE=mysql
export MYSQL_DATABASE=urbanlytics_db
export MYSQL_USER=root
export MYSQL_PASSWORD=
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
```

Ejecuta migraciones y datos:
```bash
python manage.py migrate
python manage.py load_data
python manage.py runserver
```

Credenciales demo:
- Administrador: `admin` / `Admin123!`
- Usuario: `usuario` / `Usuario123!`

## Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend usa `http://localhost:8000/api` por defecto. Puedes cambiarlo con `VITE_API_BASE_URL`.

## Endpoints
- `GET /api/accidents/?hour_from=6&hour_to=12`
- `GET /api/zones/`
- `GET /api/weather/`
- `POST /api/simulate_rain/`
- `GET /api/congestion_prediction/?hour=8`
- `POST /api/auth/login/`
- `GET /api/dashboard/`

## Capturas
Agrega evidencias de la demo en `screenshots/`: dashboard, heatmap, filtro horario, alerta por lluvia, PWA instalada y rastreo en vivo.

## Integrantes
- Equipo Urbanlytics SENA Hackathon 2026.

## Escalabilidad futura
- Migrar a PostgreSQL/PostGIS para consultas geoespaciales reales.
- Añadir Redis para cachear clima, zonas y consultas frecuentes.
- Separar predicciones en microservicio con colas para entrenamiento offline.
- Usar Celery para ingesta periódica de clima/tráfico.
- Desplegar backend y frontend detrás de Nginx con variables de entorno por ambiente.
