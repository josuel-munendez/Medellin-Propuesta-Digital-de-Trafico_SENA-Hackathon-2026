# Manual de usuario

## Dashboard
Abre el frontend en `http://localhost:5173`. La pestaña Inicio muestra el mapa de calor de accidentes, zonas por riesgo, clima, alerta de ruta, gráfico horario y pronóstico.

## Filtro horario
Usa los sliders "Desde" y "Hasta". El sistema consulta de nuevo la API y actualiza el heatmap, el gráfico y el pronóstico.

## Zonas de riesgo
Los polígonos del mapa usan colores:
- Rojo: riesgo alto.
- Naranja: riesgo medio.
- Verde: riesgo bajo.

Haz clic en una zona para seleccionarla. La tarjeta de alerta cambia según el riesgo y el estado de lluvia.

## Clima y lluvia
El botón "Actualizar clima" consulta el backend. Si existe `OPENWEATHER_API_KEY`, usa clima real; si no, usa fallback local. El botón "Simular lluvia" alterna lluvia para la demo del MVP.

## Pronóstico
La tarjeta "Pronóstico de congestión" muestra las próximas 2 horas usando una regresión lineal simple sobre accidentes por hora.

## Rastreo en Vivo
La pestaña "Rastreo en Vivo" muestra unidades simuladas, rastreo GPS del dispositivo y una capa opcional de tráfico si se configura `VITE_TOMTOM_API_KEY`.

## PWA
En navegadores compatibles, instala Urbanlytics desde el icono de instalación. En modo offline, la app mantiene assets precacheados y muestra fallback básico.
