import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaurar sesión al cargar
  useEffect(() => {
    const storedToken = localStorage.getItem('urbanlytics-auth-token') || 
                       sessionStorage.getItem('urbanlytics-auth-token')
    
    if (storedToken) {
      restoreSession(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const restoreSession = async (authToken) => {
    try {
      const response = await authAPI.getMe()
      setUser(response.data.user)
      setDashboard(response.data.dashboard)
      setToken(authToken)
    } catch (error) {
      console.error('Error restaurando sesión:', error)
      clearAuth()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password, rememberMe = true) => {
    try {
      const response = await authAPI.login(username, password)
      const { token: authToken, user: userData, dashboard: dashboardData } = response.data

      // Persistir token
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('urbanlytics-auth-token', authToken)

      setUser(userData)
      setToken(authToken)
      setDashboard(dashboardData)

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Error de autenticación' 
      }
    }
  }

  const logout = async () => {
    try {
      if (token) {
        await authAPI.logout()
      }
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    } finally {
      clearAuth()
    }
  }

  const clearAuth = () => {
    localStorage.removeItem('urbanlytics-auth-token')
    sessionStorage.removeItem('urbanlytics-auth-token')
    setUser(null)
    setToken(null)
    setDashboard(null)
  }

  const isAdmin = user?.is_admin || false

  const value = {
    user,
    token,
    dashboard,
    loading,
    isAdmin,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
