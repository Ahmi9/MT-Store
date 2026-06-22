'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

interface Attribute {
  id: number;
  attribute_name: string;
  display_order: number;
}

interface AttributeValue {
  id: number;
  attribute_id: number;
  value: string;
  display_order: number;
}

interface ProductVariant {
  id: number;
  product_id: number;
  variant_combination: Record<string, string>;
  price: number | null;
  stock: number;
  is_active: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
}

interface VariantPickerModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (selectedVariant: Record<string, string> | null, price: number) => void;
}

export default function VariantPickerModal({ product, isOpen, onClose, onAdd }: VariantPickerModalProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<number, AttributeValue[]>>({});
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) return;

    const fetchVariantData = async () => {
      setLoading(true);
      setSelectedVariant({});

      const { data: attrs } = await publicClient
        .from('product_attributes')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      if (attrs && attrs.length > 0) {
        setAttributes(attrs as Attribute[]);

        const valuesMap: Record<number, AttributeValue[]> = {};
        for (const attr of attrs) {
          const { data: values } = await publicClient
            .from('product_attribute_values')
            .select('*')
            .eq('attribute_id', attr.id)
            .order('display_order', { ascending: true });
          if (values) {
            valuesMap[attr.id] = values as AttributeValue[];
          }
        }
        setAttributeValues(valuesMap);
      } else {
        setAttributes([]);
      }

      const { data: vars } = await publicClient
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (vars) {
        setVariants(vars as ProductVariant[]);
      }

      setLoading(false);
    };

    fetchVariantData();
  }, [isOpen, product]);

  const hasVariants = attributes.length > 0;

  const allAttributesSelected = () => {
    if (!hasVariants) return true;
    return attributes.every((attr) => selectedVariant[attr.attribute_name]);
  };

  const getSelectedVariantInfo = () => {
    if (!allAttributesSelected()) return null;
    return variants.find((v) => {
      const combo = v.variant_combination;
      return Object.keys(combo).every(
        (key) => selectedVariant[key] === combo[key]
      );
    }) || null;
  };

  const currentVariant = getSelectedVariantInfo();
  const displayPrice = currentVariant?.price ?? product?.price ?? 0;
  const displayStock = currentVariant?.stock ?? 0;
  const isInStock = displayStock > 0;

  const handleAddToCart = () => {
    if (hasVariants && !allAttributesSelected()) return;
    onAdd(selectedVariant, displayPrice);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#eee]">
                <h3 className="font-bold text-[#111111] text-lg">Select Options</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <div className="flex gap-4 mb-6">
                  <div className="w-20 h-20 bg-[#f8f8f6] rounded-xl overflow-hidden flex-shrink-0">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#111111] text-sm line-clamp-2 mb-1">{product.name}</h4>
                    <p className="font-bold text-[#111111]">Rs. {displayPrice.toLocaleString()}</p>
                  </div>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-[#666]">Loading...</div>
                ) : hasVariants ? (
                  <div className="space-y-4 mb-6">
                    {attributes.map((attr) => (
                      <div key={attr.id}>
                        <span className="text-sm font-medium text-[#111111] mb-2 block">
                          {attr.attribute_name}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {attributeValues[attr.id]?.map((val) => (
                            <button
                              key={val.id}
                              type="button"
                              onClick={() =>
                                setSelectedVariant((prev) => ({
                                  ...prev,
                                  [attr.attribute_name]: val.value,
                                }))
                              }
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                selectedVariant[attr.attribute_name] === val.value
                                  ? 'bg-[#111111] text-white'
                                  : 'bg-white text-[#111111] border border-[#ddd] hover:border-[#111111]'
                              }`}
                            >
                              {val.value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#666] mb-6">No options available for this product</p>
                )}

                {hasVariants && allAttributesSelected() && (
                  <div className="mb-4">
                    {isInStock ? (
                      <p className="text-sm text-green-600">In Stock ({displayStock} available)</p>
                    ) : (
                      <p className="text-sm text-red-500">Out of Stock</p>
                    )}
                  </div>
                )}

                <motion.button
                  onClick={handleAddToCart}
                  disabled={hasVariants && (!allAttributesSelected() || !isInStock)}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                    hasVariants && (!allAttributesSelected() || !isInStock)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-[#111111] text-white hover:bg-[#333]'
                  }`}
                  whileTap={hasVariants && allAttributesSelected() && isInStock ? { scale: 0.98 } : {}}
                >
                  {hasVariants && !allAttributesSelected()
                    ? 'Select Options'
                    : !isInStock
                    ? 'Out of Stock'
                    : 'Add to Cart'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
