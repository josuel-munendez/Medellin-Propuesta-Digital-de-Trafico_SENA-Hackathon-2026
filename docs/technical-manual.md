# Manual técnico

## Arquitectura
- Front-end SPA con Vue 3 + Vite.
- UI responsiva con Bootstrap 5.
- Visualización geoespacial con Leaflet + `leaflet.heat`.
- Tendencias con Chart.js.
- PWA con `vite-plugin-pwa` (service worker + `manifest.json`).

## Estructura clave
- `src/App.vue`: dashboard principal.
- `src/assets/js/weather.js`: integración simulada/real con OpenWeatherMap.
- `public/assets/data/*.json`: datasets estáticos preprocesados.
- `public/offline.html`: fallback offline.

## Variables de entorno
- `VITE_OPENWEATHER_API_KEY`: API key opcional para clima en vivo.
