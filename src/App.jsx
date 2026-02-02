import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import api from './api/client';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    setMobileMenuOpen(false);
    navigate('/register');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleMakeAdmin = async () => {
    if (!user) return;
    try {
      await api.put(`/clients/id/${user.id_key}`, { is_admin: true });
      login({ ...user, is_admin: true });
      toast.success("👑 ¡Ahora eres Administrador!");
      setShowMenu(false);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al asignar permisos");
    }
  };

  return (
    <nav className="bg-gray-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl md:text-2xl font-bold text-blue-400 z-50 relative" onClick={closeMobileMenu}>
          ⚡ TechZone
        </Link>
        
        <button 
          className="md:hidden text-gray-300 hover:text-white z-50 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>

        <div className={`
          fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex flex-col justify-center items-center gap-8 transition-transform duration-300 z-40
          md:static md:bg-transparent md:flex-row md:gap-6 md:translate-x-0 md:justify-end
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          
          <Link to="/" onClick={closeMobileMenu} className="text-xl md:text-base hover:text-blue-300 font-medium">Catálogo</Link>

          {user?.is_admin && (
            <Link 
              to="/admin" 
              onClick={closeMobileMenu}
              className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md text-sm font-bold shadow-md shadow-purple-900/50"
            >
              Panel Admin
            </Link>
          )}

          {user ? (
             <div className="flex flex-col md:flex-row items-center gap-6 md:gap-4">
                <Link to="/checkout" onClick={closeMobileMenu} className="text-xl md:text-base hover:text-blue-300 font-medium">Checkout</Link>
                
                {!user.is_admin && user.id_key === 1 && (
                  <button 
                    onClick={handleMakeAdmin}
                    className="text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded font-bold hover:bg-yellow-300 animate-pulse"
                  >
                    ⚡ Hacerme Admin
                  </button>
                )}

                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)} 
                    className="hidden md:flex w-10 h-10 rounded-full bg-blue-600 items-center justify-center font-bold text-sm border-2 border-gray-700 hover:border-blue-400 transition-colors"
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </button>

                  <div className="md:hidden flex flex-col items-center gap-4 border-t border-gray-700 pt-6 mt-2 w-full">
                    <span className="text-gray-400 text-sm">Hola, {user.name}</span>
                    <Link to="/profile" onClick={closeMobileMenu} className="text-lg hover:text-blue-300">👤 Mi Perfil</Link>
                    <Link to="/my-orders" onClick={closeMobileMenu} className="text-lg hover:text-blue-300">🛍️ Mis Compras</Link>
                    <button onClick={handleLogout} className="text-lg text-red-400 hover:text-red-300 font-bold">🚪 Cerrar Sesión</button>
                  </div>

                  {showMenu && (
                    <div className="hidden md:block absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 z-50 animate-fade-in text-gray-900">
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <p className="text-sm text-gray-500">Hola,</p>
                        <p className="text-sm font-bold truncate">{user.name}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/profile" onClick={() => setShowMenu(false)} className="block px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600">👤 Mi Perfil</Link>
                        <Link to="/my-orders" onClick={() => setShowMenu(false)} className="block px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600">🛍️ Mis Compras</Link>
                        <div className="border-t my-1"></div>
                        <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">🚪 Cerrar Sesión</button>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          ) : (
             <Link to="/register" onClick={closeMobileMenu} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">
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
        <ProductProvider>
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <Toaster position="bottom-right" />
            <Navigation />
            
            <div className="container mx-auto p-4 md:p-6">
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