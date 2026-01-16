import { useState } from 'react'; 
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext'; // ✅ NUEVO IMPORT
import api from './api/client';

// Importación de componentes
import Catalog from './components/Catalog';
import ProductDetail from './components/ProductDetail';
import Checkout from './components/Checkout';
import AdminPanel from './components/AdminPanel';
import Register from './components/Register';
import OrdersHistory from './components/OrdersHistory';
import UserProfile from './components/UserProfile';

function Navigation() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    navigate('/register');
  };

  // 🛠️ FUNCIÓN TEMPORAL: HACERSE ADMIN
  const handleMakeAdmin = async () => {
    if (!user) return;
    try {
      await api.put(`/clients/id/${user.id_key}`, { is_admin: true });
      login({ ...user, is_admin: true });
      toast.success("👑 ¡Ahora eres Administrador!");
      setShowMenu(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al asignar permisos");
    }
  };

  return (
    <nav className="bg-gray-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-400">⚡ TechZone</Link>
        
        <div className="flex gap-6 items-center">
          <Link to="/" className="hover:text-blue-300">Catálogo</Link>

          {/* 🔒 ENLACE ADMIN: Solo visible si es admin */}
          {user?.is_admin && (
            <Link 
              to="/admin" 
              className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md text-sm font-bold transition-colors shadow-md shadow-purple-900/50"
            >
              Panel Admin
            </Link>
          )}

          {user ? (
             <div className="flex items-center gap-4">
                <Link to="/checkout" className="hover:text-blue-300">Checkout</Link>
                
                {/* 🛠️ BOTÓN TEMPORAL (Solo si NO es admin) */}
                {!user.is_admin && user.id_key === 1 && (
                  <button 
                    onClick={handleMakeAdmin}
                    className="text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded font-bold hover:bg-yellow-300 animate-pulse"
                    title="Click para ser Admin (Testing)"
                  >
                    ⚡ Hacerme Admin
                  </button>
                )}

                {/* --- MENÚ DE USUARIO --- */}
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)} 
                    className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm border-2 border-gray-700 hover:border-blue-400 transition-colors focus:outline-none"
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 z-50 animate-fade-in">
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <p className="text-sm text-gray-500">Hola,</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                        {user.is_admin && <p className="text-xs text-purple-600 font-bold mt-1">Administrador</p>}
                      </div>

                      <div className="py-1">
                        <Link 
                          to="/profile" 
                          onClick={() => setShowMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        >
                          👤 Mi Perfil
                        </Link>
                        
                        <Link 
                          to="/my-orders" 
                          onClick={() => setShowMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        >
                          🛍️ Mis Compras
                        </Link>

                        <div className="border-t my-1"></div>

                        <button 
                          onClick={handleLogout} 
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          🚪 Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          ) : (
             <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors">
               Ingresar
             </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* ✅ ENVOLVEMOS LA APP CON PRODUCT PROVIDER */}
        <ProductProvider>
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <Toaster position="bottom-right" />
            <Navigation />
            
            <div className="container mx-auto p-6">
              <Routes>
                <Route path="/" element={<Catalog />} />
                <Route path="/register" element={<Register />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/my-orders" element={<OrdersHistory />} />
                <Route path="/profile" element={<UserProfile />} />
              </Routes>
            </div>
          </div>
        </ProductProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;