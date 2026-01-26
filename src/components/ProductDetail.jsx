import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchProduct = () => {
    api.get(`/products/id/${id}`).then(res => setProduct(res.data));
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`;
  };

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    if (val === '') { setQuantity(''); return; }
    const parsed = parseInt(val);
    if (!isNaN(parsed)) {
      if (parsed > product.stock) {
        setQuantity(product.stock);
        toast.error(`Stock máximo disponible: ${product.stock}`);
      } else {
        setQuantity(parsed);
      }
    }
  };

  const handleBlur = () => {
    if (quantity === '' || quantity < 1) setQuantity(1);
  };

  const decreaseQty = () => { if (quantity > 1) setQuantity(Number(quantity) - 1); };
  const increaseQty = () => { if (product && quantity < product.stock) setQuantity(Number(quantity) + 1); };

  // --- FUNCIÓN PRINCIPAL CAMBIADA ---
  const handleAddToCart = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      toast.error("Debes iniciar sesión para comprar");
      navigate('/register');
      return;
    }

    const finalQty = quantity === '' || quantity < 1 ? 1 : quantity;

    try {
      await api.post(`/cart/${userId}/items`, {
        product_id: product.id_key,
        quantity: finalQty
      });
      toast.success(`Agregado al carrito (${finalQty} unidades)`);
      if (quantity === '') setQuantity(1);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Error al agregar";
      toast.error(msg);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', { ...newReview, product_id: parseInt(id) });
      toast.success('Reseña agregada');
      setNewReview({ rating: 5, comment: '' });
      fetchProduct();
    } catch (error) { toast.error('Error al enviar reseña'); }
  };

  const getSortedReviews = () => {
    if (!product?.reviews) return [];
    return [...product.reviews].sort((a, b) => sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating);
  };

  if (!product) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="max-w-7xl xl:max-w-8xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-8">
      {/* ... (El resto del renderizado es idéntico a tu versión anterior) ... */}
      <div className="md:flex bg-white">
        <div className="md:w-1/2 relative min-h-[500px] bg-gray-100">
          {product.image_url ? (
            <img src={getImageUrl(product.image_url)} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-9xl text-gray-300">📦</div>
          )}
        </div>
        <div className="md:w-1/2 p-10 flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">{product.name}</h1>
          <p className="text-5xl text-blue-600 font-bold mb-6">${product.price}</p>
          <div className="mb-6">
            <span className={`text-lg font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `Disponibles: ${product.stock} unidades` : 'Agotado'}
            </span>
          </div>

          {product.stock > 0 && (
            <div className="flex items-center gap-4 mb-8">
              <span className="text-gray-900 text-sm">Seleccionar cantidad</span>
              <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                <button onClick={decreaseQty} className="px-4 py-3 bg-gray-50 text-gray-600 hover:bg-gray-200 font-bold transition-colors border-r" disabled={quantity <= 1}>-</button>
                <input type="number" className="w-16 text-center font-bold text-lg border-none focus:ring-0 appearance-none p-0 outline-none no-spinner" value={quantity} onChange={handleQuantityChange} onBlur={handleBlur} min="1" max={product.stock} />
                <button onClick={increaseQty} className="px-4 py-3 bg-gray-50 text-gray-600 hover:bg-gray-200 font-bold transition-colors border-l" disabled={quantity >= product.stock}>+</button>
              </div>
            </div>
          )}

          <button onClick={handleAddToCart} disabled={product.stock === 0} className={`w-full py-4 rounded-lg text-lg font-bold transition-transform active:scale-95 ${product.stock === 0 ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'}`}>
            {product.stock === 0 ? 'Sin Stock' : `Agregar al Carrito`}
          </button>
        </div>
      </div>
      
      {/* Sección de reviews abreviada para no ocupar espacio, usar la misma que ya tenías */}
      <div className="bg-gray-50 border-t p-8 md:p-10">
         {/* ... Mantener tu código de Reviews aquí ... */}
         <h2 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">Opiniones de Clientes</h2>
         {/* (Pega aquí la misma sección de reviews que ya tenías en el código anterior) */}
         <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                <h3 className="font-bold mb-4 text-gray-700">Escribe una reseña</h3>
                 <form onSubmit={submitReview} className="space-y-4">
                   {/* ... Inputs del form ... */}
                   <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseFloat(e.target.value)})} className="w-full border p-2 rounded">
                      <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                      {/* ... */}
                   </select>
                   <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="w-full border p-2 rounded h-24" placeholder="Comentario..." />
                   <button className="w-full bg-gray-900 text-white py-2 rounded">Publicar</button>
                 </form>
              </div>
            </div>
            <div className="md:col-span-8">
               {/* ... Lista de reviews ... */}
               <div className="space-y-4">
                 {getSortedReviews().map((review, i) => (
                    <div key={i} className="bg-white p-4 rounded shadow-sm"><p>"{review.comment}"</p></div>
                 ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}