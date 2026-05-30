import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('urbanlytics-auth-token') || 
                sessionStorage.getItem('urbanlytics-auth-token')
  
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  
  return config
})

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('urbanlytics-auth-token')
      sessionStorage.removeItem('urbanlytics-auth-token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ==================== ENDPOINTS PÚBLICOS ====================

export const accidentsAPI = {
  getAll: (hourFrom, hourTo) => {
    const params = {}
    if (hourFrom !== undefined) params.hour_from = hourFrom
    if (hourTo !== undefined) params.hour_to = hourTo
    return api.get('/accidents/', { params })
  },
}

export const zonesAPI = {
  getAll: () => api.get('/zones/'),
}

export const weatherAPI = {
  getCurrent: () => api.get('/weather/'),
  getSiata: () => api.get('/siata_weather/'),
  toggleRain: () => api.post('/simulate_rain/', {}),
}

export const predictionAPI = {
  getCongestion: (hour) => {
    const params = hour !== undefined ? { hour } : {}
    return api.get('/congestion_prediction/', { params })
  },
}

// ==================== AUTENTICACIÓN ====================

export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login/', { username, password }),
  
  logout: () => 
    api.post('/auth/logout/', {}),
  
  getMe: () => 
    api.get('/auth/me/'),
  
  getDashboard: () => 
    api.get('/dashboard/'),
}

// ==================== ADMIN CRUD ====================

export const adminAccidentsAPI = {
  getAll: () => api.get('/admin/accidents/'),
  create: (data) => api.post('/admin/accidents/', data),
  update: (id, data) => api.put(`/admin/accidents/${id}/`, data),
  delete: (id) => api.delete(`/admin/accidents/${id}/`),
}

export const adminZonesAPI = {
  getAll: () => api.get('/admin/zones/'),
  create: (data) => api.post('/admin/zones/', data),
  update: (id, data) => api.put(`/admin/zones/${id}/`, data),
  delete: (id) => api.delete(`/admin/zones/${id}/`),
}

export const adminUsersAPI = {
  getAll: () => api.get('/admin/users/'),
  create: (data) => api.post('/admin/users/', data),
  update: (id, data) => api.put(`/admin/users/${id}/`, data),
  delete: (id) => api.delete(`/admin/users/${id}/`),
}

export default api
