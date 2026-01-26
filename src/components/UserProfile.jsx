import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    lastname: user?.lastname || '',
    email: user?.email || '',
    telephone: user?.telephone || ''
  });

  useEffect(() => {
    if (user?.id_key) {
      api.get(`/clients/id/${user.id_key}`)
        .then(res => {
          setFormData(prev => ({
            ...prev,
            name: res.data.name,
            lastname: res.data.lastname,
            email: res.data.email,
            telephone: res.data.telephone || ''
          }));
        })
        .catch(err => {
          console.error(err);
        });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ VALIDACIÓN DE TELÉFONO
    // Eliminamos todo lo que no sea número para contar los dígitos reales
    const phoneDigits = formData.telephone.replace(/\D/g, '');

    // Permitimos vacío si es opcional, pero si escribe algo debe cumplir el rango
    if (formData.telephone && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      toast.error("El teléfono debe tener entre 10 y 13 números (Ej: 11 1234 5678 o 54 9 11...)");
      return;
    }

    setLoading(true);

    try {
      const response = await api.put(`/clients/id/${user.id_key}`, formData);
      
      toast.success("Perfil actualizado correctamente");
      
      login({
        ...user,
        name: response.data.name,
        lastname: response.data.lastname,
        email: response.data.email,
        telephone: formData.telephone
      });

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Error al actualizar perfil";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Cargando perfil...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 mt-10">
      <div className="flex items-center gap-4 mb-8 border-b pb-4">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hola, {user.name} {user.lastname}</h1>
          <p className="text-gray-500">{user.email}</p>
          {user.is_admin && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Administrador</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
            <input
              name="lastname"
              type="text"
              value={formData.lastname}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            readOnly
            value={formData.email}
            className="w-full border p-3 rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            name="telephone"
            type="tel"
            value={formData.telephone}
            onChange={handleChange}
            placeholder="Ej: 11 1234 5678"
            className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Incluye código de área sin 0 y número sin 15 (mínimo 10 dígitos).</p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
              loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}