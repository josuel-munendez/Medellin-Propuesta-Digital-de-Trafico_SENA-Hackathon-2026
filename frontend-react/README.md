# 🏙️ UrbanLytics - Frontend React

## Plataforma Inteligente de Movilidad Urbana para Medellín

> **"La ciudad que se ve en datos"**

Proyecto desarrollado para el **HackData CTGI SENA 2026**.

---

## 📌 Descripción

UrbanLytics es una plataforma web inteligente enfocada en movilidad urbana, monitoreo vial y visualización geoespacial para la ciudad de Medellín.

### Funcionalidades Principales

- 🚦 **Tráfico en Tiempo Real**: Visualización con datos TomTom
- 📢 **Reportes Ciudadanos**: Sistema colaborativo de incidentes
- 🌧️ **Datos Climáticos SIATA**: Integración con red de monitoreo
- 📊 **Dashboard Analítico**: Gráficas y análisis predictivo
- 🗺️ **Mapas Interactivos**: Leaflet + heatmaps
- 🛣️ **Rutas Inteligentes**: Cálculo de mejores rutas
- ⚠️ **Zonas Peligrosas**: Heatmaps de accidentalidad

---

## 💻 Tecnologías

### Frontend
- **React 18** - Biblioteca UI
- **Vite 5** - Build tool
- **Tailwind CSS 4** - Styling
- **React Router 6** - Routing
- **Leaflet** - Mapas interactivos
- **Chart.js** - Visualización de datos
- **Axios** - Cliente HTTP

### Backend (Separado)
- **Django 5** - API REST
- **Django REST Framework** - API endpoints
- **SQLite/MySQL** - Base de datos

---

## 🚀 Instalación y Ejecución

### Requisitos Previos
- Node.js 18+
- npm 9+
- Backend Django corriendo en `http://localhost:8000`

### Pasos de Instalación

1. **Navegar al directorio del frontend React**:
```bash
cd frontend-react
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MAPBOX_ACCESS_TOKEN=tu_mapbox_token
VITE_TOMTOM_API_KEY=tu_tomtom_key
```

4. **Iniciar servidor de desarrollo**:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5174`

---

## 📦 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Construir para producción |
| `npm run preview` | Vista previa del build |
| `npm run lint` | Ejecutar linter ESLint |

---

## 🏗️ Estructura del Proyecto

```
frontend-react/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes React reutilizables
│   │   └── Layout.jsx   # Layout principal con navegación
│   ├── contexts/        # Contextos de React
│   │   └── AuthContext.jsx  # Autenticación
│   ├── pages/           # Páginas de la aplicación
│   │   ├── Home.jsx         # Página principal
│   │   ├── TrafficMap.jsx   # Mapa interactivo
│   │   ├── Reports.jsx      # Reportes ciudadanos
│   │   ├── Dashboard.jsx    # Dashboard analítico
│   │   ├── Login.jsx        # Autenticación
│   │   ├── About.jsx        # Sobre el proyecto
│   │   └── NotFound.jsx     # 404
│   ├── services/        # Servicios y APIs
│   │   └── api.js       # Cliente API con Axios
│   ├── App.jsx          # Componente principal con routing
│   ├── main.jsx         # Entry point de React
│   └── index.css        # Estilos globales + Tailwind
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 🔐 Autenticación

El sistema usa **autenticación por tokens** (Django Token Auth).

### Credenciales Demo

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `Admin123!` |
| Usuario | `usuario` | `Usuario123!` |

### Persistencia de Sesión
- **Recordarme**: Token en `localStorage`
- **Sin recordarme**: Token en `sessionStorage`

---

## 🎨 Design System

### Paleta de Colores Oficial

| Uso | Nombre | HEX |
|-----|--------|-----|
| Fondos oscuros | Urban Blue | `#0A2540` |
| CTAs, éxito | Data Green | `#00D26A` |
| Fondos claros | Cloud White | `#F6F9FC` |
| Alertas | Alert Amber | `#FFB800` |
| Zonas críticas | Danger Red | `#E63946` |
| Mapas, tiempo real | Tech Cyan | `#00B4D8` |
| Predicciones, IA | Insight Purple | `#7B2CBF` |

### Tipografía
- **Principal**: Inter (títulos, UI, dashboards)
- **Métricas**: Space Grotesk (datos, números)
- **Marca**: Montserrat Bold (logo)

---

## 📱 PWA (Progressive Web App)

La aplicación incluye soporte PWA:
- ✅ Instalación en dispositivos móviles
- ✅ Funcionamiento offline
- ✅ Caché inteligente
- ✅ Service Worker

### Archivos PWA
- `manifest.json` - Configuración de la app
- `service-worker.js` - Caché y offline mode

---

## 🔌 Integración con Backend

### Endpoints de API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/accidents/` | GET | Listar accidentes |
| `/api/zones/` | GET | Zonas de riesgo |
| `/api/weather/` | GET | Clima actual |
| `/api/siata_weather/` | GET | Clima SIATA |
| `/api/congestion_prediction/` | GET | Predicción ML |
| `/api/auth/login/` | POST | Iniciar sesión |
| `/api/auth/logout/` | POST | Cerrar sesión |
| `/api/dashboard/` | GET | Dashboard usuario |
| `/api/admin/accidents/` | CRUD | Admin accidentes |
| `/api/admin/zones/` | CRUD | Admin zonas |
| `/api/admin/users/` | CRUD | Admin usuarios |

### Configuración CORS
El backend debe permitir `http://localhost:5174` en `CORS_ALLOWED_ORIGINS`.

---

## 🌐 Deploy

### Vercel (Recomendado)
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
# Subir carpeta dist/
```

### Configuración de Producción
1. Setear variables de entorno en la plataforma
2. Configurar `VITE_API_BASE_URL` con URL del backend en producción
3. Build y deploy

---

## 🧪 Desarrollo

### Agregar Nueva Página
1. Crear archivo en `src/pages/NuevaPagina.jsx`
2. Agregar ruta en `src/App.jsx`
3. Agregar item de navegación en `src/components/Layout.jsx`

### Agregar Nuevo Componente
1. Crear archivo en `src/components/NuevoComponente.jsx`
2. Exportar como default
3. Importar donde se necesite

### Consumir API
```javascript
import { accidentsAPI } from '../services/api'

const response = await accidentsAPI.getAll()
const data = response.data
```

---

## 🐛 Debugging

### Problemas Comunes

**Error CORS**:
- Verificar que backend tenga `http://localhost:5174` en CORS_ALLOWED_ORIGINS

**Mapa no carga**:
- Verificar Leaflet CSS importado en `main.jsx`

**Error 401**:
- Token expirado o inválido, hacer login nuevamente

**API no responde**:
- Verificar que Django esté corriendo en `http://localhost:8000`

---

## 📚 Recursos Adicionales

- [Documentación Completa](../docs/)
- [Manual Técnico](../docs/technical-manual.md)
- [Manual de Usuario](../docs/user-manual.md)
- [Branding Guide](../docs/branding-guide.md)

---

## 👥 Equipo

| Rol | Responsabilidad |
|-----|----------------|
| Backend Developer | APIs y lógica |
| Frontend Developer | Interfaces y mapas |
| UX/UI Designer | Experiencia visual |
| Diseñador Audiovisual | Marca y pitch |

---

## 📄 Licencia

Proyecto desarrollado para HackData CTGI SENA 2026.

---

*© 2026 UrbanLytics — Medellín, Colombia*  
*"La ciudad que se ve en datos"*
