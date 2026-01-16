import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
// 1. ✅ Importamos el hook de productos
import { useProducts } from '../context/ProductContext';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  // 2. ✅ Obtenemos la función para recargar el stock global
  const { refreshProducts } = useProducts();
  
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '', lastname: '', email: '', telephone: '',
    address: '', city: '', payment_type: 'card'
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSaveDataModal, setShowSaveDataModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    if (!user) {
      toast.error("Debes iniciar sesión para finalizar la compra");
      navigate('/register');
      return;
    }

    setFormData(prev => ({
      ...prev,
      name: user.name || '',
      lastname: user.lastname || '',
      email: user.email || '',
      telephone: user.telephone || ''
    }));

    const fetchCart = async () => {
      try {
        const cartRes = await api.get(`/cart/${user.id_key}`);
        setCartItems(cartRes.data.items);
        setTotal(cartRes.data.total);

        if (cartRes.data.has_adjustments) {
          toast((t) => (
            <span>
              ⚠️ <b>Atención:</b> El stock cambió. Tu pedido fue ajustado.
              <button onClick={() => toast.dismiss(t.id)} className="ml-2 border p-1 text-xs bg-white rounded text-black">Entendido</button>
            </span>
          ), { duration: 6000, icon: '⚠️' });
        }
      } catch (error) {
        console.error(error);
        setCartItems([]);
      }
    };
    
    fetchCart();
  }, [user, navigate]);

  const refreshCart = async () => {
    if(!user) return;
    const res = await api.get(`/cart/${user.id_key}`);
    setCartItems(res.data.items);
    setTotal(res.data.total);
  };

  const handleUpdateQuantity = async (productId, newQuantity, stockMax) => {
    if (newQuantity < 1) return;
    if (newQuantity > stockMax) {
        toast.error(`Stock máximo disponible: ${stockMax}`);
        return;
    }
    try {
      await api.put(`/cart/${user.id_key}/items`, { product_id: productId, quantity: newQuantity });
      refreshCart();
    } catch (error) { 
        toast.error(error.response?.data?.detail || "Error actualizando cantidad"); 
    }
  };

  const handleRemoveClick = (productId) => {
    setItemToDelete(productId);
    setShowDeleteModal(true);
  };

  const confirmRemove = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/cart/${user.id_key}/items/${itemToDelete}`);
      toast.success("Eliminado");
      refreshCart();
    } catch (error) { toast.error("Error al eliminar"); }
    finally { setShowDeleteModal(false); setItemToDelete(null); }
  };

  const executePurchase = async () => {
    if (cartItems.length === 0) return toast.error("Carrito vacío");
    if (isNaN(total) || total < 0) return toast.error("Error en el monto total");

    const loadingToast = toast.loading('Procesando orden...');

    try {
      // 1. Factura
      const paymentTypeValue = formData.payment_type === 'cash' ? 1 : 2;
      const billRes = await api.post('/bills', {
        bill_number: `BILL-${Date.now()}`,
        discount: 0,
        date: new Date().toISOString().split('T')[0],
        total: total,
        payment_type: paymentTypeValue, 
        client_id: parseInt(user.id_key)
      });
      const billId = billRes.data.id_key;

      // 2. Orden
      const orderPayload = {
        total: parseFloat(total),
        delivery_method: 3, 
        client_id: parseInt(user.id_key),
        bill_id: parseInt(billId)
      };
      const orderRes = await api.post('/orders', orderPayload);
      const orderId = orderRes.data.id_key;

      // 3. Detalles
      await Promise.all(cartItems.map(item => 
        api.post('/order_details', {
          quantity: parseInt(item.quantity),
          price: parseFloat(item.product.price),
          order_id: parseInt(orderId),
          product_id: parseInt(item.product_id)
        })
      ));

      // 4. Vaciar Carrito
      await api.delete(`/cart/${user.id_key}`);

      // 5. ✅ ACTUALIZAR EL CONTEXTO GLOBAL DE PRODUCTOS
      // Esto asegura que al volver al inicio, el stock se vea descontado inmediatamente.
      await refreshProducts();

      toast.dismiss(loadingToast);
      toast.success('¡Compra Exitosa!');
      navigate('/'); 

    } catch (error) {
      console.error("Error checkout:", error);
      toast.dismiss(loadingToast);
      const msg = error.response?.data?.detail;
      toast.error(Array.isArray(msg) ? `Error: ${msg[0].msg}` : (msg || 'Error procesando la orden.'));
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    
    // VALIDACIÓN DE TELÉFONO
    const phoneDigits = formData.telephone.replace(/\D/g, '');
    if (formData.telephone && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      toast.error("El teléfono debe tener entre 10 y 13 números");
      return;
    }

    // DETECCIÓN DE CAMBIOS
    const hasChanges = 
        formData.name !== (user.name || '') ||
        formData.lastname !== (user.lastname || '') || 
        formData.telephone !== (user.telephone || '');

    if (hasChanges) {
        setShowSaveDataModal(true);
    } else {
        executePurchase();
    }
  };

  const handleSaveAndPurchase = async () => {
    try {
        const updatePromise = api.put(`/clients/id/${user.id_key}`, {
            name: formData.name,
            lastname: formData.lastname,
            email: formData.email,
            telephone: formData.telephone
        });

        toast.promise(updatePromise, {
            loading: 'Guardando tus datos...',
            success: 'Perfil actualizado!',
            error: 'No se pudo guardar el perfil, pero seguimos con la compra.'
        });

        const res = await updatePromise;
        
        login({
            ...user,
            name: res.data.name,
            lastname: res.data.lastname,
            email: res.data.email,
            telephone: res.data.telephone
        });

    } catch (error) {
        console.error("Error guardando datos en checkout", error);
    } finally {
        setShowSaveDataModal(false);
        executePurchase();
    }
  };

  if (!user) return null;

  return (
    <div className="grid md:grid-cols-2 gap-8 relative">
      {/* Columna Izquierda: Carrito */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">Tu Carrito</h2>
        {cartItems.length === 0 ? <p className="text-gray-500">Carrito vacío.</p> : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id_key} className={`flex flex-col border-b pb-4 last:border-0 ${item.adjustment_message ? 'bg-orange-50 p-3 rounded-lg border border-orange-100' : ''}`}>
                {item.adjustment_message && (
                  <div className="text-xs text-orange-700 font-bold mb-2 flex items-center gap-1">⚠️ {item.adjustment_message}</div>
                )}
                <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{item.product.name}</h3>
                        <p className="text-gray-500 text-sm">${item.product.price} x unidad</p>
                        <p className="text-xs text-gray-400 mt-1">Stock disponible: {item.product.stock}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg bg-gray-50 overflow-hidden">
                            <button type="button" onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1, item.product.stock)} className="px-3 py-1 hover:bg-gray-200 font-bold text-gray-600 transition-colors">-</button>
                            <span className="px-2 font-medium w-8 text-center text-gray-800">{item.quantity}</span>
                            <button type="button" onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1, item.product.stock)} disabled={item.quantity >= item.product.stock} className={`px-3 py-1 font-bold transition-colors ${item.quantity >= item.product.stock ? 'text-gray-300 cursor-not-allowed bg-gray-100' : 'text-gray-600 hover:bg-gray-200'}`}>+</button>
                        </div>
                        <span className="font-bold w-24 text-right text-lg text-gray-800">${(item.product.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => handleRemoveClick(item.product_id)} className="text-gray-400 hover:text-red-500 ml-2 p-1 transition-colors">✕</button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {cartItems.length > 0 && (
          <div className="mt-6 pt-4 border-t flex justify-between items-end">
            <span className="text-gray-500 text-sm">Total a pagar:</span>
            <span className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Columna Derecha: Formulario */}
      <form onSubmit={handleSubmitForm} className="bg-white p-6 rounded-xl shadow space-y-4 h-fit sticky top-24">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Datos de Facturación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-bold ml-1">Nombre</label>
            <input 
                required 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
             <label className="text-xs text-gray-500 font-bold ml-1">Apellido</label>
             <input required placeholder="Apellido" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} />
          </div>
        </div>
        <div>
            <label className="text-xs text-gray-500 font-bold ml-1">Email</label>
            <input required type="email" className="w-full border p-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed" value={formData.email} readOnly />
        </div>
        <div>
            <label className="text-xs text-gray-500 font-bold ml-1">Teléfono</label>
            <input required placeholder="Ej: 11 1234 5678" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
            <p className="text-xs text-gray-400 mt-1 ml-1">Mínimo 10 dígitos (cod. área + número)</p>
        </div>
        <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-2 text-gray-700">Método de Pago</label>
            <select className="w-full border p-2 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              onChange={e => setFormData({...formData, payment_type: e.target.value})}>
              <option value="card">💳 Tarjeta de Crédito / Débito</option>
              <option value="cash">💵 Efectivo (Contra entrega)</option>
            </select>
        </div>
        <button type="submit" disabled={cartItems.length === 0} className={`w-full py-4 rounded-lg font-bold text-white transition-all shadow-lg active:scale-95 ${cartItems.length === 0 ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 hover:shadow-green-200'}`}>
          {cartItems.length === 0 ? 'Carrito Vacío' : `Pagar $${total.toFixed(2)}`}
        </button>
      </form>

      {/* Modal Confirmación Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Quitar del carrito?</h3>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={confirmRemove} className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-bold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Guardar Datos */}
      {showSaveDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Quieres guardar los cambios?</h3>
            <p className="text-gray-500 mb-6">
                Notamos que modificaste tus datos personales (Nombre, Apellido o Teléfono). 
                <br/>¿Te gustaría actualizarlos en tu perfil para la próxima?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => { setShowSaveDataModal(false); executePurchase(); }} 
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                No, solo comprar
              </button>
              <button 
                onClick={handleSaveAndPurchase} 
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors shadow-lg shadow-blue-200"
              >
                Sí, guardar y comprar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}