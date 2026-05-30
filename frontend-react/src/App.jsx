import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import TrafficMap from './pages/TrafficMap'
import Reports from './pages/Reports'
import SmartRoutes from './pages/SmartRoutes'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import About from './pages/About'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="map" element={<TrafficMap />} />
          <Route path="routes" element={<SmartRoutes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
