import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Estados
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  // ✅ SOLO Email y Password para registro
  const [registerData, setRegisterData] = useState({ email: '', password: '' });

  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });

  // --- LOGIN ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/clients/login', loginData);
      
      // Manejo seguro del nombre (si es null, usamos "Usuario")
      const userName = response.data.name || 'Usuario';
      toast.success(`¡Hola de nuevo, ${userName}!`);
      
      login({
        id_key: response.data.id_key,
        name: userName, // Guardamos un fallback en el contexto
        email: loginData.email,
        lastname: response.data.lastname || '',
        is_admin: response.data.is_admin
      });
      
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error("Error Login:", error);
      toast.error('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTRO SIMPLIFICADO ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/clients', registerData);
      
      toast.success(`¡Cuenta creada! Bienvenido.`);
      
      // Auto-login (Nombre vacío inicialmente)
      login({
        id_key: response.data.id_key,
        name: 'Usuario', // Nombre temporal hasta que complete perfil
        email: registerData.email,
        lastname: '',
        is_admin: false
      });
      
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error("Error Registro:", error);
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
         toast.error(`Error: ${detail[0].msg}`);
      } else {
         toast.error(detail || 'Error al registrarse');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md transition-all duration-300">
        
        <div className="text-center mb-8">
          <span className="text-4xl">{isLogin ? '👋' : '🚀'}</span>
          <h2 className="text-2xl font-bold mt-2 text-gray-800">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta Rápida'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin ? 'Accede a tu historial y compras' : 'Solo necesitas tu email'}
          </p>
        </div>

        {/* --- FORMULARIO LOGIN --- */}
        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" required 
                value={loginData.email} onChange={handleLoginChange}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" name="password" required 
                value={loginData.password} onChange={handleLoginChange}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="******" />
            </div>
            <button type="submit" disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          /* --- FORMULARIO REGISTRO (SIMPLIFICADO) --- */
          <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
            
            {/* Solo Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" required 
                value={registerData.email} onChange={handleRegisterChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="tu@email.com" />
            </div>

            {/* Solo Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" name="password" required 
                value={registerData.password} onChange={handleRegisterChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Crea una contraseña segura" />
            </div>

            <button type="submit" disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
              {loading ? 'Crear Cuenta' : 'Registrarme'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            {isLogin ? "¿No tienes cuenta aún?" : "¿Ya tienes cuenta?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-bold text-blue-600 hover:underline focus:outline-none"
            >
              {isLogin ? "Regístrate gratis" : "Inicia Sesión"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}