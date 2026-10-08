'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { findVariant, OptionPicker, useProductOptions } from '@/components/store/ProductOptions';
import { formatPrice } from '@/lib/cart';
import { BagIcon, XIcon } from '@/components/store/icons';

interface Product {
  id: string;
  name: string;
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
  const { attributes, values, variants, loading } = useProductOptions(product?.id, isOpen);
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) setSelected({});
  }, [isOpen]);

  const hasVariants = attributes.length > 0;
  const allSelected = attributes.every((a) => selected[a.attribute_name]);
  const variant = findVariant(attributes, variants, selected);
  const price = variant?.price ?? product?.price ?? 0;
  const inStock = (variant?.stock ?? 0) > 0;
  const canAdd = !hasVariants || (allSelected && inStock);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="w-full max-w-md overflow-hidden rounded-t-[32px] bg-white sm:rounded-[32px]"
            role="dialog"
            aria-label={`Choose options for ${product.name}`}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-blush-200 sm:hidden" />
            <div className="flex gap-4 p-5">
              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-blush-100">
                {product.images?.[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-bold text-ink">{product.name}</p>
                <motion.p key={price} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="mt-1 origin-left font-display text-2xl font-semibold text-berry-600">
                  {formatPrice(price)}
                </motion.p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blush-100 text-ink"
                aria-label="Close"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-6">
              {loading ? (
                <div className="space-y-3 py-2">
                  <div className="skeleton h-4 w-20 rounded" />
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="skeleton h-10 w-20 rounded-full" />
                    ))}
                  </div>
                </div>
              ) : (
                <OptionPicker
                  attributes={attributes}
                  values={values}
                  selected={selected}
                  onSelect={(k, v) => setSelected((s) => ({ ...s, [k]: v }))}
                />
              )}

              {hasVariants && allSelected && (
                <p className={`mt-4 text-sm font-bold ${inStock ? 'text-emerald-600' : 'text-berry-600'}`}>
                  {inStock ? `In stock · ${variant?.stock} left` : 'This combination is sold out'}
                </p>
              )}

              <button
                type="button"
                disabled={loading || !canAdd}
                onClick={() => onAdd(hasVariants ? selected : null, price)}
                className="btn-primary mt-5 w-full py-3.5"
              >
                <BagIcon className="h-5 w-5" />
                {hasVariants && !allSelected ? 'Pick your options' : !canAdd ? 'Sold out' : 'Add to bag'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
