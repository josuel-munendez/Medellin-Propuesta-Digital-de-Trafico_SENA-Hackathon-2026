# 🏙️ UrbanLytics

## Plataforma Inteligente de Movilidad Urbana para Medellín

Proyecto desarrollado para el **HackData CTGI SENA 2026**.

---

## 📌 Tabla de Contenido

1. Introducción
2. Descripción del Proyecto
3. Problemática
4. Objetivos
5. Alcance del Proyecto
6. Público Objetivo
7. Funcionalidades Principales
8. Arquitectura del Sistema
9. Tecnologías Utilizadas
10. APIs y Fuentes de Datos
11. Estructura del Proyecto
12. Base de Datos
13. UX/UI y Experiencia de Usuario
14. Branding e Identidad Visual
15. Manual Técnico
16. Manual de Usuario
17. Funcionalidades PWA
18. Seguridad y Buenas Prácticas
19. Roadmap del Proyecto
20. Posibles Mejoras Futuras
21. Pitch del Proyecto
22. Integrantes y Roles
23. Instalación y Ejecución
24. Deploy
25. Evidencias Visuales
26. Conclusiones

---

# 1. 📖 Introducción

**UrbanLytics** es una plataforma web inteligente enfocada en movilidad urbana, monitoreo vial y visualización geoespacial para la ciudad de Medellín.

El sistema integra:

- Tráfico en tiempo real.
- Datos climáticos.
- Reportes ciudadanos.
- Análisis de accidentalidad.
- Mapas interactivos.
- Visualización analítica.
- Predicción de congestión.
- Rutas inteligentes.

La plataforma busca convertirse en una herramienta de apoyo para conductores, repartidores y ciudadanos, permitiendo tomar decisiones más seguras y eficientes durante sus desplazamientos.

> **Tagline**: *"La ciudad que se ve en datos"*

---

## 📋 Resumen Técnico Rápido

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vue 3 + Vite + Bootstrap 5 + Leaflet + Chart.js + PWA |
| **Backend** | Django 5 + DRF + scikit-learn |
| **Database** | SQLite (dev) / MySQL 8 (prod) |
| **APIs externas** | OpenWeatherMap, TomTom Traffic |
| **Auth** | DRF Token Authentication |
| **Formatos** | REST JSON, GeoJSON |

---



# 2. 🌍 Descripción del Proyecto

**UrbanLytics** funciona como una plataforma de movilidad inteligente inspirada en sistemas como:

- Waze
- Google Maps
- Didi Repartidor
- OpenWeatherMap API

El sistema permite visualizar información en tiempo real relacionada con:

- Congestión vehicular.
- Accidentes.
- Lluvias.
- Derrumbes.
- Construcciones viales.
- Rutas alternas.
- Zonas de alta peligrosidad.

Toda la información es presentada mediante un mapa interactivo dinámico con capas de datos geográficos.

---

# 3. ⚠️ Problemática

Medellín enfrenta múltiples problemas relacionados con movilidad urbana:

- Alta congestión vehicular.
- Accidentes frecuentes.
- Poca visualización preventiva de riesgos.
- Inundaciones y derrumbes durante temporadas de lluvia.
- Falta de integración entre datos climáticos y tráfico.
- Dificultad para encontrar rutas seguras y eficientes.
- Ausencia de sistemas colaborativos de reportes ciudadanos.

Actualmente los usuarios deben utilizar múltiples plataformas para obtener información fragmentada.

**UrbanLytics** busca centralizar toda esta información en una única plataforma inteligente.

---

# 4. 🎯 Objetivos

## Objetivo General

Desarrollar una plataforma web inteligente que permita monitorear el estado de las vías de Medellín en tiempo real utilizando datos geográficos, climáticos y ciudadanos.

## Objetivos Específicos

- Visualizar tráfico en tiempo real.
- Mostrar rutas alternas inteligentes.
- Identificar zonas peligrosas.
- Integrar datos climáticos mediante OpenWeatherMap API.
- Permitir reportes ciudadanos.
- Crear mapas interactivos dinámicos.
- Implementar funcionalidades PWA.
- Mejorar la seguridad vial.
- Optimizar tiempos de desplazamiento.

---

# 5. 📐 Alcance del Proyecto

El proyecto cubre:

- Visualización de mapas de Medellín.
- Monitoreo vial.
- Reportes ciudadanos.
- Datos climáticos.
- Estadísticas de accidentalidad.
- Visualización geográfica.
- Dashboard analítico.
- Sistema responsive.
- Plataforma PWA.

El sistema está orientado inicialmente para Medellín y el área metropolitana.

---

# 6. 👥 Público Objetivo

**UrbanLytics** está dirigido a:

- Conductores.
- Repartidores.
- Empresas logísticas.
- Motociclistas.
- Ciudadanos.
- Servicios de movilidad.
- Empresas de transporte.
- Entidades gubernamentales.

---

# 7. 🧠 Funcionalidades Principales

## 🚗 Tráfico en Tiempo Real

La plataforma permite visualizar:

- Flujo vehicular.
- Congestión.
- Velocidad promedio.
- Vías críticas.

**Visualización:**
- 🟢 Verde → tráfico fluido.
- 🟡 Amarillo → tráfico moderado.
- 🔴 Rojo → congestión alta.

## 🛣️ Rutas Inteligentes

El sistema calcula rutas alternativas considerando:

- Tráfico.
- Accidentes.
- Lluvia.
- Calles cerradas.
- Construcciones.

## 🌧️ Integración Climática

Integración con datos climáticos de OpenWeatherMap API:

- Intensidad de lluvia.
- Niveles de precipitación.
- Alertas climáticas.
- Riesgo de inundación.

## ⚠️ Zonas de Peligrosidad

Visualización de:

- Accidentes históricos.
- Mortalidad vial.
- Zonas de alto riesgo.
- Derrumbes.

Se utilizan:

- Heatmaps.
- Capas geográficas.
- Marcadores dinámicos.

## 📢 Reportes Ciudadanos

Los usuarios pueden reportar:

- Accidentes.
- Policías de tránsito.
- Derrumbes.
- Calles cerradas.
- Construcciones.
- Inundaciones.

Cada reporte contiene:

- Ubicación.
- Tipo de incidente.
- Fecha y hora.
- Nivel de gravedad.

## 📊 Dashboard Analítico

El sistema incluye:

- Gráficas estadísticas.
- Indicadores.
- Heatmaps.
- Mapas interactivos.
- Reportes históricos.

---

# 8. 🏗️ Arquitectura del Sistema

## Arquitectura General

```
Frontend (Vue 3)
        ↓
   API REST (Django)
        ↓
  Base de Datos (SQLite dev / MySQL 8 prod)
        ↓
Servicios Externos y APIs
```

## Componentes

### Frontend

Responsable de:

- Interfaces.
- Mapas.
- Visualización.
- UX/UI.

### Backend

Responsable de:

- APIs.
- Procesamiento de datos.
- Lógica de negocio.
- Integración externa.

### Base de Datos

Almacenamiento de:

- Reportes.
- Usuarios.
- Historial.
- Datos procesados.

---

# 9. 💻 Tecnologías Utilizadas

## Frontend

- Vue 3 (^3.5.34)
- Vite (^8.0.12)
- Bootstrap 5 (^5.3.8)
- Leaflet (^1.9.4)
- leaflet.heat (^0.2.0)
- Chart.js (^4.5.1)
- vite-plugin-pwa (^1.3.0)
- Axios
- TomTom Traffic Flow API
- OpenWeatherMap API
- Vue Composition API (ref/reactive)
- CSS3 custom properties (Design system)
- SVG (iconografía sidebar)
- GeoJSON (polígonos zonas de riesgo)

## Backend

- Python
- Django
- Django REST Framework (DRF)
- django-cors-headers
- Django ORM (incluido)

## Base de Datos

- SQLite (desarrollo)
- MySQL 8.0 (producción)

## Visualización

- Leaflet Heat
- Chart.js
- Plotly

## DevOps y Deploy

- GitHub
- Vercel / Netlify (frontend)
- Render / PythonAnywhere (backend)

---

# 10. 🌐 APIs y Fuentes de Datos

## APIs Utilizadas

### OpenWeatherMap API
Datos climáticos y precipitación.

### TomTom Traffic Flow API
Geolocalización y rutas.

### OpenStreetMap
Visualización cartográfica.

### Datos Abiertos Medellín
Información vial y accidentalidad.

### Datos.gov.co
Datasets públicos.

## Fuentes de Datos

- [Medellín.gov.co](https://www.medellin.gov.co/)
- [Datos.gov.co](https://www.datos.gov.co/)
- [OpenWeatherMap API](https://siata.gov.co/)
- [Google Maps Platform](https://cloud.google.com/maps-platform)

---

# 11. 📂 Estructura del Proyecto

```
urbanlytics/
│
├── frontend/
├── backend/
├── docs/
├── assets/
│   └── branding/
│       ├── logo/
│       ├── colors/
│       ├── typography/
│       └── icons/
├── screenshots/
├── public/
├── components/
├── services/
├── data/
├── README.md
├── package.json (Vue 3.5.34, Vite 8.0.12, Bootstrap 5.3.8, Leaflet 1.9.4, leaflet.heat 0.2.0, Chart.js 4.5.1, vite-plugin-pwa 1.3.0)
└── requirements.txt (Django 5.1, DRF 3.15, django-cors-headers 4.6, mysqlclient 2.2.4, scikit-learn 1.5)
```

---

# 12. 🗄️ Base de Datos

## Tablas Principales

### usuarios

| Campo      | Tipo      |
|------------|-----------|
| id         | integer   |
| nombre     | varchar   |
| correo     | varchar   |
| contraseña | varchar   |

### reportes

| Campo       | Tipo      |
|-------------|-----------|
| id          | integer   |
| tipo        | varchar   |
| descripcion | text      |
| latitud     | float     |
| longitud    | float     |
| fecha       | datetime  |

### incidentes

| Campo       | Tipo      |
|-------------|-----------|
| id          | integer   |
| categoria   | varchar   |
| nivel_riesgo| integer   |
| zona        | varchar   |

---

# 13. 🎨 UX/UI y Experiencia de Usuario

## Principios UX

- Simplicidad.
- Accesibilidad.
- Rapidez.
- Diseño responsive.
- Navegación intuitiva.

## Diseño Visual

Inspirado en:

- Tesla.
- Google Maps.
- Waze.
- Uber.

## Componentes Visuales

- Sidebar interactivo.
- Dashboard moderno.
- Tarjetas estadísticas.
- Heatmaps.
- Mapas dinámicos.
- Alertas visuales.

---

# 14. 🎨 Branding e Identidad Visual

## Nombre de Marca

**UrbanLytics**

> Urban (Urbano) + Analytics (Analítica)

## Slogan / Tagline

> *"La ciudad que se ve en datos"*

## Concepto de Marca

Plataforma de inteligencia urbana que transforma datos complejos de movilidad en decisiones claras. Representa la intersección entre la ciudad y la analítica de datos.

## Paleta de Colores Oficial

| Uso                | Nombre          | HEX       |
|--------------------|-----------------|-----------|
| Fondos oscuros     | Urban Blue      | #0A2540   |
| CTAs, acentos, éxito| Data Green     | #00D26A   |
| Fondos claros      | Cloud White     | #F6F9FC   |
| Alertas, congestión| Alert Amber     | #FFB800   |
| Zonas críticas     | Danger Red      | #E63946   |
| Mapas, tiempo real | Tech Cyan       | #00B4D8   |
| Predicciones, IA   | Insight Purple  | #7B2CBF   |

## Tipografía

- **Principal**: Inter (títulos, UI, dashboards)
- **Secundaria**: Space Grotesk (datos, números, métricas)
- **Marca**: Montserrat Bold (logo)

## Personalidad de Marca

- Inteligente: Basada en datos, IA y predicciones.
- Confiable: Segura, precisa, profesional.
- Moderna: Tecnológica, innovadora, ágil.
- Humana: Accesible, clara, orientada al ciudadano.
- Dinámica: En movimiento, en constante evolución.

## Valores

1. Precisión analítica.
2. Accesibilidad urbana.
3. Innovación constante.
4. Seguridad vial.
5. Sostenibilidad.

---

# 15. 🛠️ Manual Técnico

## Funcionamiento General

1. El usuario accede al sistema.
2. El frontend carga el mapa.
3. El backend consulta APIs externas.
4. Los datos son procesados.
5. El sistema actualiza el mapa.
6. Se muestran rutas y alertas.

## Flujo de Datos

```
Usuario → Frontend → API → Procesamiento → Base de Datos → Visualización
```

## Integración de APIs

El backend consume:

- APIs climáticas.
- APIs geográficas.
- Datos abiertos.
- Servicios de tráfico.

---

# 16. 👨‍💻 Manual de Usuario

## Inicio

El usuario accede a la plataforma desde navegador web.

## Navegación

El usuario puede:

- Explorar el mapa.
- Consultar tráfico.
- Ver lluvia.
- Reportar incidentes.
- Consultar zonas peligrosas.

## Crear Reportes

Pasos:

1. Abrir menú de reportes.
2. Seleccionar incidente.
3. Compartir ubicación.
4. Enviar reporte.

## Consultar Rutas

El usuario:

1. Selecciona origen.
2. Selecciona destino.
3. El sistema calcula rutas óptimas.

---

# 17. 📱 Funcionalidades PWA

## Características

- Instalación en móvil.
- Funcionamiento offline.
- Caché inteligente.
- Responsive Design.

## Archivos PWA

### manifest.json

Contiene:

- Nombre app: **UrbanLytics**.
- Iconos.
- Tema.
- Configuración instalación.

### service-worker.js

Responsable de:

- Caché.
- Offline mode.
- Optimización.

---

# 18. 🔒 Seguridad y Buenas Prácticas

## Seguridad

- Validación de datos.
- Sanitización.
- HTTPS.
- Protección APIs.
- Manejo seguro de rutas.

## Buenas Prácticas

- Código modular.
- Commits descriptivos.
- Componentización.
- Documentación clara.
- Arquitectura escalable.

---

# 19. 🚀 Roadmap del Proyecto

## Fase 1

- Diseño UI.
- Branding.
- Mapa base.

## Fase 2

- Integración APIs.
- Dashboard.
- Reportes.

## Fase 3

- IA.
- Predicción.
- Optimización.

---

# 20. 🔮 Posibles Mejoras Futuras

- Machine Learning avanzado.
- Predicción automática de accidentes.
- Sistema de reputación de usuarios.
- Alertas push.
- Aplicación móvil nativa.
- Reconocimiento visual.
- Integración IoT.

---

# 21. 🎤 Pitch del Proyecto

## Problema

Medellín enfrenta problemas de congestión, accidentalidad y desinformación vial.

## Solución

**UrbanLytics** integra tráfico, clima y reportes ciudadanos en una plataforma inteligente.

## Diferencial

- Datos climáticos.
- IA.
- Mapas interactivos.
- Reportes colaborativos.
- Predicción vial.

## Impacto

- Mejor movilidad.
- Menos accidentes.
- Optimización de rutas.
- Información en tiempo real.

---

# 22. 👨‍👩‍👧‍👦 Integrantes y Roles

| Rol                        | Responsabilidad         |
|----------------------------|-------------------------|
| Backend Developer          | APIs y lógica           |
| Frontend Developer         | Interfaces y mapas      |
| UX/UI Designer             | Experiencia visual      |
| Diseñador Audiovisual & Branding | Marca y pitch     |

---

# 23. ⚙️ Instalación y Ejecución

## Clonar repositorio

```bash
git clone https://github.com/usuario/urbanlytics
cd urbanlytics
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
pip install -r requirements.txt (Django 5.1, DRF 3.15, django-cors-headers 4.6, mysqlclient 2.2.4, scikit-learn 1.5)
uvicorn main:app --reload
```

---

# 24. 🌐 Deploy

## Plataformas sugeridas

- Vercel.
- Netlify.
- Render.
- GitHub Pages.

---

# 25. 🖼️ Evidencias Visuales

## Capturas necesarias

- Dashboard.
- Heatmaps.
- Reportes.
- Vista móvil.
- Gráficas.
- Mapas.

---

# 26. ✅ Conclusiones

**UrbanLytics** busca transformar la movilidad urbana de Medellín mediante una plataforma inteligente basada en datos, geolocalización e inteligencia artificial.

La solución integra tecnología, experiencia de usuario y analítica avanzada para ofrecer información vial en tiempo real, mejorar la seguridad de los ciudadanos y optimizar los desplazamientos dentro de la ciudad.

El proyecto representa una propuesta moderna, escalable y alineada con tendencias actuales de Smart Cities y movilidad inteligente.

---

*© 2026 UrbanLytics — HackData CTGI SENA — Medellín, Colombia*
*"La ciudad que se ve en datos"*
