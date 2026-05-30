# Urbanlytics

Urbanlytics es un MVP full stack para analizar riesgo vial en Medellín. Integra Django REST, SQLite en desarrollo, Vue 3, Leaflet, Chart.js, Bootstrap 5 y PWA para mostrar accidentes, zonas de riesgo, clima y pronóstico simple de congestión.

## Tecnologías
- Vue 3 + Vite
- Bootstrap 5
- Leaflet + leaflet.heat
- Chart.js
- PWA con vite-plugin-pwa
- Datos estáticos JSON (sin backend)

## Estructura principal
- `src/main.js`, `src/App.vue`
- `src/assets/css/`, `src/assets/js/`
- `public/assets/data/` (JSON de muestra)
- `public/assets/img/` (logos placeholder)
- `docs/` (manual técnico, usuario y branding)
- `screenshots/` (espacio para capturas)

## Requisitos
- Node.js 20+
- npm 10+

## Instalación y ejecución
```bash
export OPENWEATHER_API_KEY=tu_api_key_opcional
```

Cuando se migre a MySQL, activa:
```bash
npm run build
npm run preview
```

## PWA
La aplicación incluye:
- `manifest.json` generado por Vite PWA
- Service Worker con fallback a `offline.html`

## Clima en vivo (opcional)
Para usar OpenWeatherMap, crea un archivo `.env` o `.env.local` en el directorio `frontend`:
```bash
VITE_OPENWEATHER_API_KEY=tu_api_key
```
También puedes activar SIATA para clima de Medellín:
```bash
SIATA_WEATHER_API_URL=https://api.siata.gov.co/v1/observations?limit=1
SIATA_API_KEY=
```
Si no hay API key o URL, el backend devuelve una respuesta simulada para la demo.

## Datos reales de Medellín
Reemplaza los archivos:
- `public/assets/data/accidents.json`
- `public/assets/data/traffic.json`

Mantén el mismo formato de claves para no romper el dashboard.

## Despliegue
### Netlify
1. Conecta el repositorio.
2. Build command: `npm run build`
3. Publish directory: `dist`

### GitHub Pages
1. Ejecuta `npm run build`.
2. Publica la carpeta `dist` con la estrategia que uses en tu flujo CI/CD.

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
