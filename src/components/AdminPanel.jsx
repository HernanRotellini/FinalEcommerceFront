import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { products, categories, refreshProducts, loading: contextLoading } = useProducts();

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newCategory, setNewCategory] = useState({ name: '' });
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', stock: '', image_url: '', category_id: '', active: true 
  });

  const STATUS = { PENDING: 1, IN_PROGRESS: 2, DELIVERED: 3, CANCELED: 4 };

  useEffect(() => {
    if (!user?.is_admin) {
      toast.error("Acceso denegado");
      navigate('/');
      return;
    }
    if (activeTab === 'products' || activeTab === 'categories') {
        refreshProducts();
    }
    if (activeTab === 'orders') fetchOrders();
  }, [user, navigate, activeTab]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get('/orders');
      setOrders(res.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) { toast.error("Error cargando órdenes"); }
    finally { setLoadingOrders(false); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    const toastId = toast.loading("Actualizando...");
    try {
      await api.patch(`/orders/id/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id_key === orderId ? { ...o, status: newStatus } : o));
      toast.success("Estado actualizado", { id: toastId });
    } catch (error) { 
      console.error(error);
      toast.error("Error al actualizar", { id: toastId }); 
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case STATUS.PENDING: return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">Pendiente</span>;
      case STATUS.IN_PROGRESS: return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">En Camino</span>;
      case STATUS.DELIVERED: return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Entregado</span>;
      case STATUS.CANCELED: return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">Cancelado</span>;
      default: return <span>{status}</span>;
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', newCategory);
      toast.success("Categoría creada");
      setNewCategory({ name: '' });
      refreshProducts();
    } catch (error) { toast.error("Error creando categoría"); }
  };

  const handleDeleteCategory = async (id) => {
    if(!window.confirm("¿Borrar categoría?")) return;
    try {
      await api.delete(`/categories/id/${id}`);
      toast.success("Categoría eliminada");
      refreshProducts();
    } catch (error) { toast.error("Error: Puede tener productos asociados"); }
  };

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return null;
    const data = new FormData();
    data.append("file", imageFile);
    data.append("upload_preset", "techzone"); 
    data.append("cloud_name", "dhbd0nto3"); 

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dhbd0nto3/image/upload", { method: "POST", body: data });
      const file = await res.json();
      if (file.error) throw new Error(file.error.message);
      return file.secure_url; 
    } catch (error) {
      console.error("Error subiendo imagen", error);
      throw error;
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.category_id) return toast.error("Selecciona una categoría");
    
    setUploadingImage(true); 

    try {
      let finalImageUrl = newProduct.image_url;
      if (imageFile) finalImageUrl = await uploadImageToCloudinary();

      const payload = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        category_id: parseInt(newProduct.category_id),
        image_url: finalImageUrl,
        active: newProduct.active
      };

      if (isEditing) {
         await api.put(`/products/id/${editingId}`, payload);
         toast.success("Producto actualizado");
         cancelEditMode();
      } else {
         await api.post('/products', payload);
         toast.success("Producto creado");
         setNewProduct({ name: '', price: '', stock: '', image_url: '', category_id: '', active: true });
         setImageFile(null);
      }
      
      await refreshProducts();

    } catch (error) { 
      console.error(error);
      const msg = error.response?.data?.detail 
        ? JSON.stringify(error.response.data.detail) 
        : (isEditing ? "Error al actualizar" : "Error al crear");
      toast.error(msg); 
    } finally {
        setUploadingImage(false);
    }
  };

  const handleEditClick = (product) => {
    setIsEditing(true);
    setEditingId(product.id_key);
    const catId = product.category?.id_key || product.category_id || '';

    setNewProduct({
        name: product.name,
        price: product.price,
        stock: product.stock,
        image_url: product.image_url || '',
        category_id: catId,
        active: product.active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditMode = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewProduct({ name: '', price: '', stock: '', image_url: '', category_id: '', active: true });
    setImageFile(null);
  };

  const handleToggleActive = async (product) => {
    const action = product.active ? "desactivar" : "activar";
    if(!window.confirm(`¿Seguro que deseas ${action} este producto?`)) return;
    
    try {
      if (product.active) {
          await api.delete(`/products/id/${product.id_key}`);
          toast.success("Producto desactivado");
      } else {
          const catId = product.category?.id_key || product.category_id;
          if (!catId) { toast.error("Error: Sin categoría"); return; }

          const payload = {
            name: product.name,
            price: parseFloat(product.price),
            stock: parseInt(product.stock),
            image_url: product.image_url,
            category_id: parseInt(catId),
            active: true
          };
          await api.put(`/products/id/${product.id_key}`, payload);
          toast.success("Producto reactivado");
      }
      await refreshProducts();
    } catch (error) { 
        toast.error("Error cambiando estado"); 
        console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 text-center md:text-left">Panel de Administración</h1>
        
        <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
          <button onClick={() => setActiveTab('orders')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>📦 Órdenes</button>
          <button onClick={() => setActiveTab('products')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'products' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>🛒 Productos</button>
          <button onClick={() => setActiveTab('categories')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>🏷️ Categorías</button>
        </div>
      </div>

      {(loadingOrders || (activeTab !== 'orders' && contextLoading)) && <div className="text-center py-10">Cargando datos...</div>}

      {!loadingOrders && activeTab === 'orders' && (
        <div className="overflow-x-auto shadow-inner rounded-lg border border-gray-100">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-sm font-bold text-gray-600">ID</th>
                <th className="p-3 text-sm font-bold text-gray-600">Fecha</th>
                <th className="p-3 text-sm font-bold text-gray-600">Cliente</th>
                <th className="p-3 text-sm font-bold text-gray-600">Total</th>
                <th className="p-3 text-sm font-bold text-gray-600">Estado</th>
                <th className="p-3 text-sm font-bold text-gray-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id_key} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">#{order.id_key}</td>
                  <td className="p-3 text-sm">{new Date(order.date).toLocaleDateString()}</td>
                  <td className="p-3 text-sm">{order.client ? `${order.client.name} ${order.client.lastname}` : 'Eliminado'}</td>
                  <td className="p-3 font-bold text-green-700">${order.total}</td>
                  <td className="p-3">{renderStatusBadge(order.status)}</td>
                  <td className="p-3 text-center">
                    <div className="relative inline-block w-full max-w-[150px]">
                      <select 
                        value={order.status} 
                        onChange={(e) => handleStatusChange(order.id_key, parseInt(e.target.value))}
                        className={`w-full p-2 text-xs font-bold border rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 appearance-none
                          ${order.status === STATUS.PENDING ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : ''}
                          ${order.status === STATUS.IN_PROGRESS ? 'bg-blue-50 text-blue-800 border-blue-200' : ''}
                          ${order.status === STATUS.DELIVERED ? 'bg-green-50 text-green-800 border-green-200' : ''}
                          ${order.status === STATUS.CANCELED ? 'bg-red-50 text-red-800 border-red-200' : ''}
                        `}
                      >
                        <option value={STATUS.PENDING}>⏳ Pendiente</option>
                        <option value={STATUS.IN_PROGRESS}>🚚 En Camino</option>
                        <option value={STATUS.DELIVERED}>✅ Entregado</option>
                        <option value={STATUS.CANCELED}>✖ Cancelado</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!contextLoading && activeTab === 'products' && (
        <div className="flex flex-col gap-8">
          
          <div className={`bg-gray-50 p-4 md:p-6 rounded-xl border transition-colors w-full ${isEditing ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                {isEditing ? '✏️ Editando Producto' : '➕ Nuevo Producto'}
            </h3>
            <form onSubmit={handleSubmitProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required placeholder="Nombre del producto" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  
                  <select required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                    value={newProduct.category_id} onChange={e => setNewProduct({...newProduct, category_id: e.target.value})}>
                    <option value="">Seleccionar Categoría</option>
                    {categories.map(c => <option key={c.id_key} value={c.id_key}>{c.name}</option>)}
                  </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input required type="number" placeholder="Precio ($)" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <input required type="number" placeholder="Stock Inicial" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                
                <div className="relative">
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])}
                        className="w-full border p-2 rounded-lg bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {isEditing && newProduct.image_url && !imageFile && (
                        <span className="text-xs text-gray-500 absolute -bottom-5 left-0">Imagen actual conservada</span>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                  <input type="checkbox" id="activeCheck" checked={newProduct.active} 
                    onChange={e => setNewProduct({...newProduct, active: e.target.checked})} 
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded" />
                  <label htmlFor="activeCheck" className="text-gray-700 font-bold select-none cursor-pointer">Producto Activo (Visible en catálogo)</label>
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                  <button type="submit" disabled={uploadingImage}
                    className={`w-full py-3 rounded-lg font-bold text-white transition-all ${uploadingImage ? 'bg-gray-400 cursor-wait' : isEditing ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {uploadingImage ? 'Procesando imagen...' : isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                  {isEditing && (
                      <button type="button" onClick={cancelEditMode} className="w-full md:w-auto px-6 py-3 rounded-lg font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors">Cancelar</button>
                  )}
              </div>
            </form>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Inventario Actual ({products.length})</h3>
            {products.length === 0 ? <p className="text-gray-500 text-center py-8">No hay productos cargados.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(p => (
                    <div key={p.id_key} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition group relative flex flex-col h-full ${!p.active ? 'opacity-70 bg-gray-100 border-gray-300' : 'hover:shadow-md'}`}>
                        {!p.active && <div className="absolute top-2 right-2 bg-gray-600 text-white text-[10px] font-extrabold px-2 py-1 rounded z-20">🚫 INACTIVO</div>}
                        <div className="h-48 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                            {p.image_url ? <img src={p.image_url} alt={p.name} className={`w-full h-full object-contain p-2 transition-transform duration-300 ${p.active ? 'group-hover:scale-105' : 'grayscale'}`} /> : <span className="text-gray-400 text-4xl">📷</span>}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-800 line-clamp-2" title={p.name}>{p.name}</h4>
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">${p.price}</span>
                            </div>
                            <div className="mt-auto flex justify-between items-center text-sm pt-3 border-t">
                                <span className={`${p.stock < 5 ? 'text-red-500 font-bold' : 'text-green-600 font-medium'}`}>Stock: {p.stock}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClick(p)} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors" title="Editar">✏️</button>
                                    <button onClick={() => handleToggleActive(p)} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${p.active ? 'text-red-600 bg-red-100 hover:bg-red-200' : 'text-green-600 bg-green-100 hover:bg-green-200'}`} title={p.active ? "Desactivar" : "Reactivar"}>
                                        {p.active ? '⛔ Desactivar' : '✅ Activar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}

      {!contextLoading && activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-gray-50 p-6 rounded-lg h-fit">
              <h3 className="font-bold text-lg mb-4">Nueva Categoría</h3>
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input required placeholder="Nombre Categoría" className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-green-500" 
                  value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} />
                <button type="submit" className="bg-green-600 text-white px-4 rounded hover:bg-green-700 font-bold">+</button>
              </form>
           </div>
           <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-left min-w-[300px]">
                <thead className="bg-gray-100">
                  <tr><th className="p-3 text-sm text-gray-600">ID</th><th className="p-3 text-sm text-gray-600">Nombre</th><th className="p-3 text-right text-sm text-gray-600">Acción</th></tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map(c => (
                    <tr key={c.id_key} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500 text-xs">#{c.id_key}</td>
                      <td className="p-3 font-bold">{c.name}</td>
                      <td className="p-3 text-right"><button onClick={() => handleDeleteCategory(c.id_key)} className="text-red-500 hover:text-red-700 font-medium text-sm">Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
}