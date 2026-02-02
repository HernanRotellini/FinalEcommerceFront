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
    <div className="max-w-7xl xl:max-w-8xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-4 md:my-8">
      <div className="flex flex-col md:flex-row bg-white">
        <div className="w-full md:w-1/2 relative min-h-[300px] md:min-h-[500px] bg-gray-100">
          {product.image_url ? (
            <img src={getImageUrl(product.image_url)} alt={product.name} className="absolute inset-0 w-full h-full object-contain md:object-cover p-4 md:p-0" />
          ) : (
            <div className="flex items-center justify-center h-full text-9xl text-gray-300">📦</div>
          )}
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4 text-gray-800">{product.name}</h1>
          <p className="text-3xl md:text-5xl text-blue-600 font-bold mb-4 md:mb-6">${product.price}</p>
          
          <div className="mb-6">
            <span className={`text-base md:text-lg font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `Disponibles: ${product.stock} unidades` : 'Agotado'}
            </span>
          </div>

          {product.stock > 0 && (
            <div className="flex items-center gap-4 mb-8">
              <span className="text-gray-900 text-sm">Cantidad:</span>
              <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                <button onClick={decreaseQty} className="px-3 py-2 md:px-4 md:py-3 bg-gray-50 hover:bg-gray-200 font-bold border-r">-</button>
                <input type="number" className="w-12 md:w-16 text-center font-bold text-lg border-none focus:ring-0 appearance-none p-0 outline-none" value={quantity} onChange={handleQuantityChange} onBlur={handleBlur} />
                <button onClick={increaseQty} className="px-3 py-2 md:px-4 md:py-3 bg-gray-50 hover:bg-gray-200 font-bold border-l">+</button>
              </div>
            </div>
          )}

          <button 
            onClick={handleAddToCart} 
            disabled={product.stock === 0} 
            className={`w-full py-3 md:py-4 rounded-lg text-lg font-bold transition-transform active:scale-95 shadow-lg ${
              product.stock === 0 
              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {product.stock === 0 ? 'Sin Stock' : `Agregar al Carrito`}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 border-t p-6 md:p-10">
         <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Opiniones</h2>
         <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 order-2 md:order-1">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                <h3 className="font-bold mb-4 text-gray-700">Escribe una reseña</h3>
                 <form onSubmit={submitReview} className="space-y-4">
                   <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseFloat(e.target.value)})} className="w-full border p-2 rounded">
                      <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                      <option value="4">⭐⭐⭐⭐ (4)</option>
                      <option value="3">⭐⭐⭐ (3)</option>
                      <option value="2">⭐⭐ (2)</option>
                      <option value="1">⭐ (1)</option>
                   </select>
                   <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="w-full border p-2 rounded h-24" placeholder="Comentario..." />
                   <button className="w-full bg-gray-900 text-white py-2 rounded font-bold hover:bg-black">Publicar</button>
                 </form>
              </div>
            </div>

            <div className="md:col-span-8 order-1 md:order-2">
               <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-600">{product.reviews ? product.reviews.length : 0} Valoraciones</span>
                  <button onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')} className="text-sm text-blue-600 hover:underline">
                    Ordenar: {sortOrder === 'desc' ? 'Más altas' : 'Más bajas'}
                  </button>
               </div>
               
               <div className="space-y-4">
                 {getSortedReviews().length > 0 ? getSortedReviews().map((review, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center gap-1 text-yellow-500 mb-2 text-sm">
                           {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                           <span className="text-gray-400 text-xs ml-2">Usuario #{review.client_id}</span>
                        </div>
                        <p className="text-gray-700">{review.comment || <em className="text-gray-400">Sin comentario</em>}</p>
                    </div>
                 )) : <p className="text-gray-500 italic">No hay opiniones todavía.</p>}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}