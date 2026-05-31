import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { id: '/', label: 'Inicio', icon: '🏠' },
  { id: '/map', label: 'Mapa en Vivo', icon: '🗺️' },
  { id: '/routes', label: 'Rutas', icon: '🧭' },
  { id: '/reports', label: 'Reportes', icon: '📢' },
  { id: '/dashboard', label: 'Dashboard', icon: '📊' },
  { id: '/about', label: 'Nosotros', icon: '👥' },
]

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cloud-white">
      {/* Navbar Mobile */}
      <header className="lg:hidden gradient-primary text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏙️</span>
            </div>
            <div>
              <h1 className="font-brand font-bold text-lg">UrbanLytics</h1>
              <p className="text-xs text-white/70">Movilidad Inteligente</p>
            </div>
          </div>

          <Link 
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={isAuthenticated ? 'Dashboard' : 'Login'}
          >
            {isAuthenticated ? (
              <span className="text-xl">👤</span>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            )}
          </Link>
        </div>
      </header>

      {/* Sidebar Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 gradient-primary text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:w-72
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-4xl">🏙️</span>
              </div>
              <div>
                <h1 className="font-brand font-bold text-xl">UrbanLytics</h1>
                <p className="text-sm text-white/70">La ciudad que se ve en datos</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.id
              return (
                <Link
                  key={item.id}
                  to={item.id}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-white/20 text-white shadow-lg' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/10">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="px-4 py-3 bg-white/10 rounded-lg">
                  <p className="font-medium text-sm">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-white/70 capitalize">{user?.role || 'user'}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setSidebarOpen(false)}
                className="block w-full px-4 py-3 bg-data-green hover:bg-data-green/90 text-urban-blue font-semibold rounded-lg transition-colors text-center"
              >
                Iniciar Sesión
              </Link>
            )}
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span>SENA CTGI 2026</span>
              <span className="px-2 py-1 bg-white/10 rounded">v2.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
