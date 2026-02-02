import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
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
              ⚠️ Stock ajustado automáticamente.
              <button onClick={() => toast.dismiss(t.id)} className="ml-2 border p-1 text-xs bg-white rounded text-black">OK</button>
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
        toast.error(`Stock máximo: ${stockMax}`);
        return;
    }
    try {
      await api.put(`/cart/${user.id_key}/items`, { product_id: productId, quantity: newQuantity });
      refreshCart();
    } catch (error) { 
        toast.error("Error actualizando cantidad"); 
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
    const loadingToast = toast.loading('Procesando orden...');

    try {
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

      const orderPayload = {
        total: parseFloat(total),
        delivery_method: 3, 
        client_id: parseInt(user.id_key),
        bill_id: parseInt(billId)
      };
      const orderRes = await api.post('/orders', orderPayload);
      const orderId = orderRes.data.id_key;

      await Promise.all(cartItems.map(item => 
        api.post('/order_details', {
          quantity: parseInt(item.quantity),
          price: parseFloat(item.product.price),
          order_id: parseInt(orderId),
          product_id: parseInt(item.product_id)
        })
      ));

      await api.delete(`/cart/${user.id_key}`);
      await refreshProducts();

      toast.dismiss(loadingToast);
      toast.success('¡Compra Exitosa!');
      navigate('/'); 

    } catch (error) {
      console.error("Error checkout:", error);
      toast.dismiss(loadingToast);
      toast.error('Error procesando la orden.');
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const phoneDigits = formData.telephone.replace(/\D/g, '');
    if (formData.telephone && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      toast.error("El teléfono debe tener entre 10 y 13 números");
      return;
    }
    
    const hasChanges = 
        formData.name !== (user.name || '') ||
        formData.lastname !== (user.lastname || '') || 
        formData.telephone !== (user.telephone || '');

    if (hasChanges) setShowSaveDataModal(true);
    else executePurchase();
  };

  const handleSaveAndPurchase = async () => {
    try {
        const updatePromise = api.put(`/clients/id/${user.id_key}`, {
            name: formData.name, lastname: formData.lastname, email: formData.email, telephone: formData.telephone
        });
        toast.promise(updatePromise, { loading: 'Guardando datos...', success: 'Perfil actualizado!', error: 'Error guardando datos' });
        const res = await updatePromise;
        login({ ...user, name: res.data.name, lastname: res.data.lastname, telephone: res.data.telephone });
    } catch (error) { console.error(error); } 
    finally { setShowSaveDataModal(false); executePurchase(); }
  };

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow order-2 md:order-1">
        <h2 className="text-xl font-bold mb-4">Tu Carrito</h2>
        {cartItems.length === 0 ? <p className="text-gray-500">Carrito vacío.</p> : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id_key} className={`flex flex-col border-b pb-4 last:border-0 ${item.adjustment_message ? 'bg-orange-50 p-2 rounded' : ''}`}>
                {item.adjustment_message && <div className="text-xs text-orange-700 font-bold mb-2">⚠️ {item.adjustment_message}</div>}
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
                    <div className="flex-1 w-full">
                        <h3 className="font-bold text-gray-800 text-sm md:text-base">{item.product.name}</h3>
                        <p className="text-gray-500 text-sm">${item.product.price} x unidad</p>
                    </div>
                    
                    <div className="flex justify-between items-center w-full sm:w-auto gap-3">
                        <div className="flex items-center border rounded-lg bg-gray-50">
                            <button type="button" onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1, item.product.stock)} className="px-3 py-1 hover:bg-gray-200 font-bold text-gray-600">-</button>
                            <span className="px-2 font-medium w-8 text-center text-gray-800">{item.quantity}</span>
                            <button type="button" onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1, item.product.stock)} disabled={item.quantity >= item.product.stock} className="px-3 py-1 font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50">+</button>
                        </div>
                        <span className="font-bold w-20 text-right text-gray-800">${(item.product.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => handleRemoveClick(item.product_id)} className="text-red-400 hover:text-red-600 font-bold px-2">✕</button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {cartItems.length > 0 && (
          <div className="mt-6 pt-4 border-t flex justify-between items-end">
            <span className="text-gray-500 text-sm">Total:</span>
            <span className="text-2xl md:text-3xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmitForm} className="bg-white p-4 md:p-6 rounded-xl shadow space-y-4 h-fit md:sticky md:top-24 order-1 md:order-2">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Finalizar Compra</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Nombre</label><input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-500">Apellido</label><input required className="w-full border p-2 rounded" value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500">Teléfono</label><input required className="w-full border p-2 rounded" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} /></div>
        <div><label className="text-xs font-bold text-gray-500">Pago</label>
            <select className="w-full border p-2 rounded bg-white" onChange={e => setFormData({...formData, payment_type: e.target.value})}>
              <option value="card">💳 Tarjeta</option>
              <option value="cash">💵 Efectivo</option>
            </select>
        </div>
        <button type="submit" disabled={cartItems.length === 0} className="w-full py-4 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
          {cartItems.length === 0 ? 'Carrito Vacío' : `Pagar $${total.toFixed(2)}`}
        </button>
      </form>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h3 className="font-bold mb-4">¿Eliminar producto?</h3>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
              <button onClick={confirmRemove} className="px-4 py-2 bg-red-600 text-white rounded">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showSaveDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm text-center">
                <h3 className="font-bold mb-2">¿Guardar datos nuevos?</h3>
                <p className="text-sm text-gray-500 mb-4">Has cambiado tu información personal.</p>
                <div className="flex gap-2 justify-center">
                    <button onClick={() => { setShowSaveDataModal(false); executePurchase(); }} className="px-4 py-2 bg-gray-100 rounded">No guardar</button>
                    <button onClick={handleSaveAndPurchase} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar y Comprar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}