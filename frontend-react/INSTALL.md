# 🚀 Guía Rápida de Instalación - UrbanLytics React

## Instalación Automática (Windows)

### Opción 1: Script PowerShell

1. **Abrir PowerShell en el directorio del proyecto**
2. **Ejecutar**:
```powershell
cd frontend-react
npm install
Copy-Item .env.example .env.local
Write-Host "`n✅ Instalación completada!" -ForegroundColor Green
Write-Host "`n📝 Pasos siguientes:" -ForegroundColor Yellow
Write-Host "1. Editar .env.local con tus API keys" -ForegroundColor Cyan
Write-Host "2. Asegurarte que Django esté corriendo en http://localhost:8000" -ForegroundColor Cyan
Write-Host "3. Ejecutar: npm run dev" -ForegroundColor Cyan
```

### Opción 2: Instalación Manual

```bash
# Navegar al directorio
cd frontend-react

# Instalar dependencias
npm install

# Copiar variables de entorno
copy .env.example .env.local

# Editar .env.local con tu editor favorito
notepad .env.local
```

---

## 🔧 Configuración de Variables de Entorno

Editar archivo `.env.local`:

```env
# URL del backend Django
VITE_API_BASE_URL=http://localhost:8000/api

# Mapbox Access Token (obtener en https://mapbox.com)
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here

# TomTom API Key (obtener en https://developer.tomtom.com)
VITE_TOMTOM_API_KEY=your_api_key_here
```

### Obtener API Keys

#### Mapbox
1. Ir a https://www.mapbox.com/
2. Crear cuenta gratuita
3. Copiar "Default public token"
4. Pegar en `VITE_MAPBOX_ACCESS_TOKEN`

#### TomTom
1. Ir a https://developer.tomtom.com/
2. Crear cuenta gratuita
3. Crear nueva app
4. Copiar API key
5. Pegar en `VITE_TOMTOM_API_KEY`

---

## ▶️ Ejecutar el Proyecto

### Terminal 1: Backend Django
```bash
cd backend
python manage.py runserver
```

### Terminal 2: Frontend React
```bash
cd frontend-react
npm run dev
```

### Acceder a la Aplicación
- Frontend: http://localhost:5174
- Backend API: http://localhost:8000/api
- Admin Django: http://localhost:8000/admin

---

## 🧪 Credenciales de Prueba

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `Admin123!` |
| Usuario | `usuario` | `Usuario123!` |

---

## ⚠️ Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Error CORS
Editar `backend/movilidata/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5174',  # Agregar esta línea
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

### Puerto 5174 ocupado
```bash
# Windows
netstat -ano | findstr :5174
taskkill /PID <PID> /F

# Cambiar puerto en vite.config.js
server: {
  port: 5175,  # Cambiar a otro puerto
}
```

### Mapa no carga
- Verificar que Leaflet CSS esté importado en `main.jsx`
- Verificar conexión a internet (CDN de Leaflet)

---

## 📦 Build para Producción

```bash
npm run build
```

Los archivos se generarán en `frontend-react/dist/`

### Deploy en Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy en Netlify
1. Ejecutar `npm run build`
2. Subir carpeta `dist/` a Netlify
3. Configurar variables de entorno en el dashboard

---

## 📞 Soporte

Si tienes problemas:
1. Verificar que Django esté corriendo
2. Verificar variables de entorno
3. Revisar consola del navegador (F12)
4. Revisar logs de Django

---

*Documentación creada para HackData CTGI SENA 2026*
