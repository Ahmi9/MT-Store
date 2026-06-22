'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  images: string[] | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await publicClient
        .from('products')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const handleDelete = async (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    const { error } = await publicClient.from('products').delete().eq('id', deleteId);

    if (!error) {
      setProducts(products.filter((p) => p.id !== deleteId));
    }
    setDeleteId(null);
  };

  const cancelDelete = () => {
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="text-gray-400">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Products
        </motion.h1>
        <Link href="/admin/dashboard/products/new">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Product
          </motion.button>
        </Link>
      </div>

      {products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-400 py-12"
        >
          No products yet
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-lg overflow-hidden"
        >
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Image</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Original Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Featured</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {products.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="hover:bg-gray-750"
                >
                  <td className="px-4 py-3">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">{product.name}</td>
                  <td className="px-4 py-3 text-white">Rs. {product.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {product.original_price ? `Rs. ${product.original_price.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-white">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        product.is_active
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        product.is_featured
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {product.is_featured ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/dashboard/products/${product.id}/edit`}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </Link>
                      <motion.button
                        onClick={() => handleDelete(product.id)}
                        whileTap={{ scale: 0.95 }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <AnimatePresence>
        {deleteId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Product?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  onClick={cancelDelete}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={confirmDelete}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}