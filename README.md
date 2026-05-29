# Medellín Movilidata OS

Aplicación web front-end (hackathon HackData CTGI SENA 2026) para visualizar siniestralidad, congestión y alertas climáticas de movilidad en Medellín.

## Objetivo
Reducir riesgos de movilidad urbana mediante:
- Identificación de puntos críticos de accidentes.
- Lectura de tendencias horarias de accidentalidad y congestión.
- Alertas de seguridad en escenarios de lluvia.

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
npm install
npm run dev
```

## Build de producción
```bash
npm run build
npm run preview
```

## PWA
La aplicación incluye:
- `manifest.json` generado por Vite PWA
- Service Worker con fallback a `offline.html`

## Clima en vivo (opcional)
Para usar OpenWeatherMap, crea un archivo `.env`:
```bash
VITE_OPENWEATHER_API_KEY=tu_api_key
```
Si no hay API key, se muestra clima simulado para demo.

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
Agregar imágenes en `screenshots/` y enlazarlas aquí.

## Video demo
Agregar enlace del video demo aquí: **[pendiente]**

## Equipo (placeholder)
- Rol 1: Pendiente
- Rol 2: Pendiente
- Rol 3: Pendiente
