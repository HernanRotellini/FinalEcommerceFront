import { useState } from 'react'; // Ya no necesitas useEffect
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useProducts } from '../context/ProductContext'; // ✅ Usamos el hook

export default function Catalog() {
  // ✅ Obtenemos los datos del contexto
  const { activeProducts, categories, loading } = useProducts();
  
  const [selectedCat, setSelectedCat] = useState(null);
  const navigate = useNavigate();
  
  // Filtrado local
  const filtered = selectedCat 
    ? activeProducts.filter(p => p.category_id === selectedCat) 
    : activeProducts;

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`;
  };

  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    e.preventDefault();

    const userId = localStorage.getItem('user_id');
    if (!userId) {
      toast.error("Debes iniciar sesión para comprar");
      navigate('/register');
      return;
    }

    try {
      await api.post(`/cart/${userId}/items`, {
        product_id: product.id_key,
        quantity: 1
      });
      toast.success(`Agregado al carrito: ${product.name}`);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Error al agregar";
      toast.error(msg);
    }
  };

  if (loading) return <div className="text-center p-10">Cargando catálogo...</div>;

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
        <button onClick={() => setSelectedCat(null)} 
          className={`px-4 py-2 rounded-full ${!selectedCat ? 'bg-blue-600 text-white' : 'bg-white'}`}>
          Todos
        </button>
        {categories.map(cat => (
          <button key={cat.id_key} onClick={() => setSelectedCat(cat.id_key)}
            className={`px-4 py-2 rounded-full ${selectedCat === cat.id_key ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map(p => (
          <div 
            key={p.id_key} 
            onClick={() => navigate(`/product/${p.id_key}`)}
            className="bg-white rounded-xl shadow p-4 hover:shadow-xl transition cursor-pointer flex flex-col h-full"
          >
            <div className="h-48 bg-gray-100 rounded mb-4 overflow-hidden flex items-center justify-center">
              {p.image_url ? (
                <img 
                  src={getImageUrl(p.image_url)} 
                  alt={p.name} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <span className="text-4xl">💻</span>
              )}
            </div>

            <h3 className="font-bold text-lg mb-1 truncate">{p.name}</h3>
            <p className="text-gray-500 text-sm mb-3">Stock: {p.stock}</p>
            
            <div className="flex justify-between items-center mt-auto">
              <span className="text-xl font-bold text-blue-600">${p.price}</span>
              <button 
                onClick={(e) => handleAddToCart(e, p)}
                disabled={p.stock === 0}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  p.stock === 0 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {p.stock === 0 ? 'Sin Stock' : 'Agregar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}