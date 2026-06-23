"use client";
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.client';

export interface Product {
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
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('products').select('*');
      if (error) setError(error.message);
      setProducts(data || []);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  return { products, loading, error };
} 