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
- Mapbox GL JS
- Leaflet + leaflet.heat
- Chart.js
- TomTom Traffic API
- SIATA
- PWA con vite-plugin-pwa
- Datos estáticos JSON para siniestralidad y vías base

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

Si no hay token, la app mantiene el mapa visible con teselas OSM dentro de Mapbox GL JS.

Fuentes SIATA usadas:
- `https://siata.gov.co/data/scroll/temperatura2.json`
- `https://siata.gov.co/data/scroll/pronosticoPPT.json`

## Datos reales de Medellín
Reemplaza los archivos:
- `public/assets/data/accidents.json`
- `public/assets/data/medellin-roads.json`

La capa de tráfico e incidentes en vivo ahora sale directamente de TomTom, así que solo necesitas
mantener las coordenadas base y configurar `VITE_TOMTOM_API_KEY`.

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
