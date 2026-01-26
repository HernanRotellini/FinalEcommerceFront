import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function OrdersHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/register');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await api.get(`/orders/client/${user.id_key}`);
        setOrders(res.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("No se pudo cargar el historial");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate]);

  const getStatusBadge = (status) => {
    const statusMap = {
      1: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      2: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
      3: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
      4: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    };
    const s = statusMap[status] || { label: 'Desconocido', color: 'bg-gray-100' };
    
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>;
  };

  // ✅ CORRECCIÓN DE HORA ARGENTINA
  const formatDateAR = (dateString) => {
    if (!dateString) return { date: '', time: '' };
    
    // Truco: Si la fecha viene sin 'Z' (UTC naive), se la agregamos.
    // Esto fuerza a JS a tratarla como UTC y hacer la conversión a -3 correctamente.
    const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(utcString);

    return {
      date: date.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
      time: date.toLocaleTimeString('es-AR', { 
        timeZone: 'America/Argentina/Buenos_Aires', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  if (loading) return <div className="p-8 text-center">Cargando compras...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>🛍️</span> Mis Compras
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">Aún no has realizado ninguna compra.</p>
          <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">
            Ir al catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
             const { date, time } = formatDateAR(order.date);
             
             return (
              <div key={order.id_key} className="border rounded-lg overflow-hidden hover:shadow-md transition">
                {/* Cabecera de la Orden */}
                <div className="bg-gray-50 p-4 flex justify-between items-center border-b">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Fecha</p>
                    <p className="text-sm font-medium">
                      {date} {time} hs
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                    <p className="text-lg font-bold text-green-700">${order.total}</p>
                  </div>
                  <div>
                      {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Lista de Productos (Detalles) */}
                <div className="p-4 bg-white">
                  {order.details && order.details.length > 0 ? (
                    <ul className="divide-y">
                      {order.details.map((detail, idx) => (
                        <li key={idx} className="py-2 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-lg">
                                📦
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {detail.product ? detail.product.name : `Producto #${detail.product_id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Cant: {detail.quantity} x ${detail.price}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-sm">
                            ${(detail.quantity * detail.price).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin detalles disponibles.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}