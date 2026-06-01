# Manual de Usuario — Medellín Movilidata OS

> Plataforma de movilidad segura guiada por datos.
> Versión 1.0.0 — HackData CTGI SENA 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos del sistema](#2-requisitos-del-sistema)
3. [Inicio rápido](#3-inicio-rápido)
4. [Navegación principal](#4-navegación-principal)
5. [Dashboard — Inicio](#5-dashboard--inicio)
6. [Reportero de accidentes](#6-reportero-de-accidentes)
7. [Rastreo en tiempo real](#7-rastreo-en-tiempo-real)
8. [Panel de administración](#8-panel-de-administración)
9. [Uso offline (PWA)](#9-uso-offline-pwa)
10. [Solución de problemas](#10-solución-de-problemas)

---

## 1. Introducción

**Medellín Movilidata OS** es una plataforma web de código abierto que integra datos históricos de accidentes de tránsito, visualización de tráfico en tiempo real, datos climáticos y predicción de congestión usando machine learning, todo en un solo tablero interactivo.

### ¿Para quién es?

- **Ciudadanos**: para planificar rutas seguras evitando zonas de alto riesgo.
- **Autoridades de movilidad**: para monitorear incidentes y tomar decisiones informadas.
- **Desarrolladores**: API REST abierta para integraciones personalizadas.

---

## 2. Requisitos del sistema

### Para usar la aplicación (usuario final)

- Navegador web moderno: Chrome 90+, Firefox 90+, Edge 90+, Safari 15+.
- Conexión a internet (para cargar mapas y datos de tráfico).
- GPS (opcional, para la función de rastreo en tiempo real).
- No requiere instalación — funciona como aplicación web progresiva (PWA).

### Para ejecutar el proyecto localmente (desarrollador)

| Herramienta | Versión |
|---|---|
| Python | 3.11+ |
| Node.js | 20+ |
| npm | 10+ |

Ver [README.md](../README.md) para instrucciones detalladas de instalación.

---

## 3. Inicio rápido

### Opción A — Usar la aplicación desplegada

1. Abre el navegador en la URL donde está desplegada la aplicación.
2. Espera a que cargue el mapa de Medellín.
3. Explora las secciones usando el menú lateral izquierdo.

### Opción B — Ejecutar localmente

**Backend:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Frontend (Vue 3, en otra terminal):**
```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

---

## 4. Navegación principal

La interfaz está dividida en dos paneles:

```
┌─────────────────────────────────────────────────┐
│  ☰ Menú lateral       │   Panel principal       │
│                        │                         │
│  🏠 Inicio             │   (contenido variable   │
│  📋 Nosotros           │    según la sección)    │
│  🛠️ Servicios          │                         │
│  🚦 Rastreo            │                         │
│  🚗 Accidentes         │                         │
│  🔐 Login              │                         │
└─────────────────────────────────────────────────┘
```

En dispositivos móviles (≤991px), el menú se colapsa en un botón de hamburguesa en la parte superior.

---

## 5. Dashboard — Inicio

El dashboard principal es la vista más completa del sistema. Se compone de:

### 5.1 Mapa interactivo

- **Heatmap**: Mapa de calor que muestra la concentración de accidentes en Medellín.
- **Zonas de riesgo**: Polígonos coloreados según nivel de riesgo:
  - 🔴 **Alta** — Zonas con alta incidencia de accidentes.
  - 🟡 **Media** — Zonas con incidencia moderada.
  - 🟢 **Baja** — Zonas con baja incidencia.
- **Interacción**: Puedes hacer zoom, arrastrar y hacer clic en el mapa.

### 5.2 Filtro horario

Usa los controles de filtro para ver accidentes en un rango horario específico:

1. Ingresa una hora de inicio (0-23).
2. Ingresa una hora de fin (0-23).
3. El heatmap y la gráfica se actualizarán automáticamente.

**Ejemplo**: Filtrar entre las 6:00 y las 9:00 para ver accidentes en hora pico matutina.

### 5.3 Gráfica de tendencia horaria

Gráfico de barras interactivo (Chart.js) que muestra:
- **Barras azules**: Número de accidentes por hora.
- **Línea naranja**: Intensidad acumulada por hora.

Pasa el cursor sobre las barras para ver valores detallados.

### 5.4 Widget de predicción de congestión

El sistema usa machine learning para predecir la congestión en las próximas 2 horas:

- **Algoritmo**: Regresión lineal con scikit-learn.
- **Datos**: Últimos 30 días de accidentes con ponderación exponencial (datos recientes tienen más peso).
- **Factores**: Día de la semana (fines de semana tienen 20% menos congestión).
- **Resultado**: Predicción por hora con nivel de riesgo (baja/media/alta) y nivel de confianza.
- **Confianza**: Entre 0.30 (baja) y 0.95 (alta), basada en R² del modelo, cantidad de muestras y horizonte de predicción.

### 5.5 Widget de clima

Muestra el estado del clima actual:
- **Temperatura**: En grados Celsius.
- **Condición**: Descripción del clima (soleado, nublado, lluvioso).
- **Lluvia simulada**: Indicador visual si la lluvia está activa.

### 5.6 Simulación de lluvia

Usa el botón **Simular lluvia** para activar/desactivar el estado de lluvia en el sistema. Esto activa alertas visuales de riesgo en el dashboard.

---

## 6. Reportero de accidentes

Sección para visualizar y reportar accidentes en un mapa dedicado.

### 6.1 Visualización

- El mapa muestra un heatmap de todos los accidentes registrados.
- Usa el **filtro por severidad** (baja/media/alta) para colorear los marcadores según su nivel de intensidad:
  - **1-3**: Baja (verde)
  - **4-7**: Media (amarillo)
  - **8-10**: Alta (rojo)

### 6.2 Reportar un accidente

1. Haz clic en cualquier punto del mapa. Las coordenadas se capturan automáticamente.
2. Completa el formulario:
   - **Intensidad** (1-10): Gravedad del accidente.
   - **Hora** (0-23): Hora aproximada del accidente.
   - **Fecha**: Fecha del accidente.
3. Haz clic en **Reportar accidente**.

### 6.3 Lista de accidentes

Debajo del mapa se muestra una tabla con todos los accidentes reportados, incluyendo coordenadas, intensidad, hora y fecha.

---

## 7. Rastreo en tiempo real

Sección de seguimiento de tráfico en vivo. Esta vista requiere:
- **Permiso de ubicación**: El navegador solicitará acceso a tu ubicación GPS.
- **Conexión a internet**: Para cargar datos de tráfico de TomTom.

### 7.1 Características

- **Tu ubicación**: Marcador azul que muestra tu posición actual (si diste permiso).
- **Tráfico TomTom**: Segmentos de flujo vehicular coloreados por nivel de congestión:
  - 🟢 Fluido
  - 🟡 Moderado
  - 🟠 Congestionado
  - 🔴 Bloqueado
- **Incidentes**: Marcadores que muestran incidentes de tráfico reportados por TomTom.
- **Rutas simuladas**: El sistema puede simular rutas de:
  - 🚌 Bus MIO
  - 🚇 Metro de Medellín
  - 🚗 Vehículo particular
- **Capa MapGIS**: Capa adicional de mapas base desde servidor MapGIS.

### 7.2 Controles

- Usa los botones en la parte superior para alternar entre tipos de ruta simulada.
- Los segmentos de TomTom y los incidentes se actualizan automáticamente.

---

## 8. Panel de administración

Accede al panel administrativo desde la sección **Login** en el menú.

### 8.1 Iniciar sesión

1. Ingresa tu nombre de usuario y contraseña.
2. Haz clic en **Iniciar sesión**.
3. Si las credenciales son válidas, el token se almacena en localStorage.

### 8.2 Dashboard admin

Después de iniciar sesión, verás un resumen con:
- Total de accidentes registrados.
- Total de zonas de riesgo.
- Resumen del clima actual.

### 8.3 Gestión de accidentes

- **Ver todos**: Tabla con todos los accidentes (ID, ubicación, intensidad, hora, fecha).
- **Crear**: Formulario para añadir un nuevo accidente.
- **Editar**: Haz clic en el botón **Editar** junto a un accidente.
- **Eliminar**: Haz clic en **Eliminar** (requiere confirmación).

### 8.4 Gestión de usuarios (superadmin)

- Lista de usuarios registrados.
- Posibilidad de eliminar usuarios.

### 8.5 Cerrar sesión

Haz clic en **Cerrar sesión** para eliminar el token y volver al modo público.

---

## 9. Uso offline (PWA)

La aplicación es una **Progressive Web App (PWA)**, lo que significa que puede funcionar sin conexión a internet después de la primera carga.

### 9.1 Instalar la aplicación

**Chrome/Edge:**
1. Abre la aplicación.
2. Haz clic en el icono de instalar (➕ en la barra de direcciones).
3. Confirma la instalación.

**Firefox:**
1. Abre la aplicación.
2. En el menú, selecciona "Instalar aplicación".

### 9.2 Modo offline

- Los recursos básicos (HTML, CSS, JS) se cachean automáticamente.
- Cuando no hay conexión, se muestra la página `offline.html` con un mensaje amigable.
- Los datos en tiempo real (TomTom, API) no estarán disponibles sin conexión.

---

## 10. Solución de problemas

### El mapa no carga

1. Verifica tu conexión a internet.
2. Espera unos segundos — el mapa intenta cargar Mapbox GL primero; si falla, usa Leaflet como respaldo automático.
3. Si usas la versión local, asegúrate de que el backend esté corriendo.

### Las predicciones ML no se muestran

1. Asegúrate de que hay datos de accidentes en la base de datos.
2. Verifica que el backend esté corriendo (`python manage.py runserver`).
3. El endpoint de predicción requiere scikit-learn instalado (`pip install scikit-learn`).

### No se ve el tráfico TomTom

1. Verifica que la variable de entorno `VITE_TOMTOM_API_KEY` esté configurada.
2. Asegúrate de tener conexión a internet.
3. La API de TomTom puede tener restricciones geográficas.

### Error de conexión al backend

1. Verifica que el servidor Django esté corriendo en `http://localhost:8000`.
2. Verifica que el puerto 8000 no esté bloqueado.
3. Revisa la consola del navegador para mensajes de error CORS.

### La aplicación no responde

1. Recarga la página (F5).
2. Limpia el caché del navegador.
3. Si el problema persiste, reinicia los servidores (backend y frontend).

---

## Apéndice A: Atajos y características

| Característica | Cómo acceder |
|---|---|
| Dashboard principal | Menú > Inicio |
| Reportar accidente | Menú > Accidentes |
| Ver tráfico en vivo | Menú > Rastreo |
| Admin panel | Menú > Login |
| Mapa offline | Automático (PWA) |
| Filtro horario | Dashboard > controles de filtro |
| Simular lluvia | Dashboard > botón Simular lluvia |

## Apéndice B: Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/accidents/` | Listar accidentes |
| GET | `/api/accidents/?hour_from=6&hour_to=12` | Accidentes por rango horario |
| GET | `/api/zones/` | Zonas de riesgo |
| GET | `/api/weather/` | Estado del clima |
| POST | `/api/simulate_rain/` | Alternar lluvia simulada |
| GET | `/api/congestion_prediction/?hour=8` | Predicción de congestión |

---

*Documento generado el 01/06/2026 — Medellín Movilidata OS v1.0.0*
