import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. RECUPERAR al recargar página
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    const userEmail = localStorage.getItem('user_email'); 
    const userLastname = localStorage.getItem('user_lastname');
    const userTelephone = localStorage.getItem('user_telephone'); // ✅ Nuevo
    const userIsAdmin = localStorage.getItem('user_is_admin') === 'true';

    if (userId) {
      setUser({
        id_key: userId,
        name: userName,
        email: userEmail || '',
        lastname: userLastname || '',
        telephone: userTelephone || '', // ✅ Nuevo (evita null)
        is_admin: userIsAdmin
      });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user_id', userData.id_key);
    localStorage.setItem('user_name', userData.name || '');
    localStorage.setItem('user_lastname', userData.lastname || '');
    if (userData.email) localStorage.setItem('user_email', userData.email);
    
    // 2. GUARDAR al iniciar sesión
    // Si viene null del backend, guardamos string vacío
    localStorage.setItem('user_telephone', userData.telephone || ''); 
    
    if (userData.is_admin) localStorage.setItem('user_is_admin', 'true');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_lastname');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_telephone'); // ✅ Limpiar
    localStorage.removeItem('user_is_admin');
    localStorage.removeItem('cart'); 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};