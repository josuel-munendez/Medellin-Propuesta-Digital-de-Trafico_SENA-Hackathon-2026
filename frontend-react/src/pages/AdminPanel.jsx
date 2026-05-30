import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { accidentsAPI, zonesAPI } from '../services/api'
import { Navigate } from 'react-router-dom'

export default function AdminPanel() {
  const { user, isAuthenticated, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('accidents')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Data states
  const [accidents, setAccidents] = useState([])
  const [zones, setZones] = useState([])
  const [editingItem, setEditingItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({})

  // Check admin access
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'accidents') {
        const response = await accidentsAPI.getAll()
        setAccidents(response.data)
      } else if (activeTab === 'zones') {
        const response = await zonesAPI.getAll()
        setZones(response.data)
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter data
  const filteredAccidents = accidents.filter(a => 
    a.type?.includes(searchTerm) || 
    a.zone?.includes(searchTerm) ||
    a.description?.includes(searchTerm)
  )

  const filteredZones = zones.filter(z => 
    z.name?.includes(searchTerm) || 
    z.risk_level?.includes(searchTerm)
  )

  // Pagination
  const paginatedAccidents = filteredAccidents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedZones = filteredZones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredAccidents.length / itemsPerPage)

  // CRUD Operations
  const handleDelete = async (id, type) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    try {
      if (type === 'accident') {
        await accidentsAPI.delete(id)
        setAccidents(accidents.filter(a => a.id !== id))
      } else if (type === 'zone') {
        await zonesAPI.delete(id)
        setZones(zones.filter(z => z.id !== id))
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Error eliminando registro')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData(item)
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    setFormData({})
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (activeTab === 'accidents') {
        if (editingItem) {
          await accidentsAPI.update(editingItem.id, formData)
        } else {
          await accidentsAPI.create(formData)
        }
      } else if (activeTab === 'zones') {
        if (editingItem) {
          await zonesAPI.update(editingItem.id, formData)
        } else {
          await zonesAPI.create(formData)
        }
      }
      
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error guardando registro')
    }
  }

  const renderAccidentsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zona</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Severidad</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedAccidents.map((accident) => (
            <tr key={accident.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-600">{accident.id}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-tech-cyan/10 text-tech-cyan rounded-lg text-sm font-semibold">
                  {accident.type}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-800">{accident.zone || 'N/A'}</td>
              <td className="px-6 py-4">
                <span className={`
                  px-3 py-1 rounded-lg text-sm font-bold
                  ${accident.severity === 'high' ? 'bg-danger-red text-white' :
                    accident.severity === 'medium' ? 'bg-alert-amber text-urban-blue' :
                    'bg-data-green text-urban-blue'}
                `}>
                  {accident.severity || 'medium'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{accident.date || 'N/A'}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(accident)}
                    className="px-3 py-1 bg-urban-blue/10 text-urban-blue rounded-lg text-sm hover:bg-urban-blue/20 transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(accident.id, 'accident')}
                    className="px-3 py-1 bg-danger-red/10 text-danger-red rounded-lg text-sm hover:bg-danger-red/20 transition-colors"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderZonesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nivel de Riesgo</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedZones.map((zone) => (
            <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-600">{zone.id}</td>
              <td className="px-6 py-4 text-sm font-semibold text-gray-800">{zone.name}</td>
              <td className="px-6 py-4">
                <span className={`
                  px-3 py-1 rounded-lg text-sm font-bold
                  ${zone.risk_level === 'alta' ? 'bg-danger-red text-white' :
                    zone.risk_level === 'media' ? 'bg-alert-amber text-urban-blue' :
                    'bg-data-green text-urban-blue'}
                `}>
                  {zone.risk_level}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(zone)}
                    className="px-3 py-1 bg-urban-blue/10 text-urban-blue rounded-lg text-sm hover:bg-urban-blue/20 transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id, 'zone')}
                    className="px-3 py-1 bg-danger-red/10 text-danger-red rounded-lg text-sm hover:bg-danger-red/20 transition-colors"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl lg:text-4xl font-bold text-urban-blue">
            🔐 Panel de Administración
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de datos del sistema - Usuario: {user?.username}
          </p>
        </div>
        
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-data-green text-white font-bold rounded-xl hover:bg-data-green/90 transition-colors"
        >
          ➕ Crear Nuevo
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('accidents'); setCurrentPage(1); setSearchTerm('') }}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'accidents'
                ? 'bg-urban-blue/10 text-urban-blue border-b-2 border-urban-blue'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🚗 Accidentes ({accidents.length})
          </button>
          <button
            onClick={() => { setActiveTab('zones'); setCurrentPage(1); setSearchTerm('') }}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'zones'
                ? 'bg-urban-blue/10 text-urban-blue border-b-2 border-urban-blue'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            ⚠️ Zonas ({zones.length})
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Buscar..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-urban-blue border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === 'accidents' && renderAccidentsTable()}
            {activeTab === 'zones' && renderZonesTable()}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAccidents.length)} de {filteredAccidents.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 bg-urban-blue text-white rounded-lg">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="font-brand text-2xl font-bold text-urban-blue mb-6">
              {editingItem ? '✏️ Editar Registro' : '➕ Crear Registro'}
            </h2>
            
            <div className="space-y-4">
              {activeTab === 'accidents' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo</label>
                    <input
                      type="text"
                      value={formData.type || ''}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Zona</label>
                    <input
                      type="text"
                      value={formData.zone || ''}
                      onChange={(e) => setFormData({...formData, zone: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Severidad</label>
                    <select
                      value={formData.severity || 'medium'}
                      onChange={(e) => setFormData({...formData, severity: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'zones' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nivel de Riesgo</label>
                    <select
                      value={formData.risk_level || 'baja'}
                      onChange={(e) => setFormData({...formData, risk_level: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-urban-blue text-white font-bold rounded-xl hover:bg-urban-blue/90 transition-colors"
              >
                💾 Guardar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
