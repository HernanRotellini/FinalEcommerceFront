import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client'; // Asegúrate de importar tu instancia de api
import toast from 'react-hot-toast'; // Para feedback visual

export default function Navbar() {
  const { user, logout, login } = useAuth(); // Necesitamos 'login' para actualizar el contexto
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/register');
  };

  // 🛠️ FUNCIÓN TEMPORAL PARA HACERSE ADMIN
  const handleMakeAdmin = async () => {
    if (!user) return;
    try {
      // 1. Enviamos el PUT al backend
      const res = await api.put(`/clients/id/${user.id_key}`, {
        is_admin: true
      });

      // 2. Actualizamos el contexto localmente para ver el cambio al instante
      login({
        ...user,
        is_admin: true
      });

      toast.success("👑 ¡Ahora eres Administrador!");
      
    } catch (error) {
      console.error(error);
      toast.error("Error al intentar ser admin");
    }
  };

  return (
    <nav className="bg-white shadow-md p-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-blue-600">
          TechZone
        </Link>

        {/* Menú */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">
            Inicio
          </Link>

          {/* 🔒 SOLO SE MUESTRA SI ES ADMIN */}
          {user?.is_admin && (
            <Link 
              to="/admin" 
              className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md text-sm font-bold transition-colors"
            >
              Panel Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden md:block">
                Hola, {user.name}
              </span>
              
              <Link to="/profile" className="text-gray-600 hover:text-blue-600">
                Mi Perfil
              </Link>
              
              {/* 🛠️ BOTÓN TEMPORAL (Solo visible si NO eres admin aún) */}
              {!user.is_admin && (
                <button 
                  onClick={handleMakeAdmin}
                  className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-1 rounded hover:bg-yellow-200"
                  title="Click para obtener permisos de Admin (Testing)"
                >
                  ⚡ Hacerme Admin
                </button>
              )}

              <button 
                onClick={handleLogout} 
                className="text-red-500 hover:text-red-700 font-medium"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link 
              to="/register" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}