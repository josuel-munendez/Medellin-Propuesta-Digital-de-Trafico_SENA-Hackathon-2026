import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="animate-fade-in min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <span className="text-9xl font-brand font-bold text-urban-blue/20">404</span>
        <h1 className="text-4xl font-bold text-urban-blue mt-4 mb-2">Página No Encontrada</h1>
        <p className="text-gray-600 mb-8">
          La página que buscas no existe o ha sido movida
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-4 gradient-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          🏠 Volver al Inicio
        </Link>
      </div>
    </div>
  )
}
