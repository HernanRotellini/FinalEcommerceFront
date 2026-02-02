import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para el menú desplegable

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false); // Cerramos menú al salir
    navigate('/register');
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false); // Cierra el menú al navegar
  };

  // 🛠️ FUNCIÓN TEMPORAL PARA HACERSE ADMIN
  const handleMakeAdmin = async () => {
    if (!user) return;
    try {
      const res = await api.put(`/clients/id/${user.id_key}`, {
        is_admin: true
      });

      login({
        ...user,
        is_admin: true
      });

      toast.success("👑 ¡Ahora eres Administrador!");
      setIsMenuOpen(false); // Cerramos menú
      
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

        {/* ==============================
            VISTA DE ESCRITORIO (Desktop)
           ============================== */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">
            Inicio
          </Link>

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
              <span className="text-sm text-gray-500">
                Hola, {user.name}
              </span>
              
              <Link to="/profile" className="text-gray-600 hover:text-blue-600">
                Mi Perfil
              </Link>
              
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

        {/* ==============================
            VISTA MÓVIL (Mobile)
           ============================== */}
        <div className="md:hidden flex items-center relative">
          {user ? (
            <>
              {/* Botón Trigger (Icono de Usuario) */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="focus:outline-none p-1 rounded-full hover:bg-gray-100"
              >
                {/* SVG Icono Usuario */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Menú Desplegable (Dropdown) */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl py-2 border border-gray-100 flex flex-col z-50">
                  {/* Cabecera del menú con nombre */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-500">Hola,</p>
                    <p className="font-bold text-gray-800 truncate">{user.name}</p>
                  </div>

                  {/* Links del menú móvil */}
                  <Link 
                    to="/" 
                    onClick={handleLinkClick}
                    className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    Inicio
                  </Link>

                  <Link 
                    to="/profile" 
                    onClick={handleLinkClick}
                    className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    Mi Perfil
                  </Link>

                  {user.is_admin && (
                    <Link 
                      to="/admin" 
                      onClick={handleLinkClick}
                      className="px-4 py-2 text-purple-600 font-semibold hover:bg-purple-50 transition-colors"
                    >
                      Panel Admin
                    </Link>
                  )}

                  {!user.is_admin && (
                    <button 
                      onClick={handleMakeAdmin}
                      className="text-left px-4 py-2 text-yellow-700 hover:bg-yellow-50 text-sm w-full"
                    >
                      ⚡ Hacerme Admin
                    </button>
                  )}

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button 
                      onClick={handleLogout} 
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium"
                    >
                      Salir
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Si NO está logueado en móvil
            <div className="flex items-center gap-3">
               <Link to="/" className="text-sm font-medium text-gray-600">Inicio</Link>
               <Link 
                to="/register" 
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium"
              >
                Ingresar
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}