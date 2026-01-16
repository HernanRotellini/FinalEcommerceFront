import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

const ProductContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts debe usarse dentro de ProductProvider");
  return context;
};

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar datos (pública para poder llamarla tras editar/crear)
  const refreshProducts = async () => {
    setLoading(true);
    try {
      // Pedimos TOOOODOS los productos (incluso inactivos) para tener la data completa
      // y pedimos las categorías en paralelo
      const [resProd, resCat] = await Promise.all([
        api.get('/products?include_inactive=true&limit=100'),
        api.get('/categories')
      ]);

      setProducts(resProd.data);
      setCategories(resCat.data);
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast.error("Error de conexión con el catálogo");
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar la app
  useEffect(() => {
    refreshProducts();
  }, []);

  // Derivamos los productos activos para el catálogo público
  const activeProducts = products.filter(p => p.active);

  return (
    <ProductContext.Provider value={{ 
      products,       // Para Admin (Todos)
      activeProducts, // Para Catálogo (Solo activos)
      categories, 
      loading,
      refreshProducts // Para llamar después de crear/editar/borrar
    }}>
      {children}
    </ProductContext.Provider>
  );
};