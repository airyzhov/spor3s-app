import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback data
        setProducts([
          { id: 'ezh100', name: 'Ежовик 100г порошок', price: 1200 },
          { id: 'ezh120k', name: 'Ежовик 120 капсул', price: 1500 },
          { id: 'mhm30', name: 'Мухомор 30г', price: 800 },
          { id: 'mhm50', name: 'Мухомор 50г', price: 1200 },
          { id: 'mhm100', name: 'Мухомор 100г', price: 2000 },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}