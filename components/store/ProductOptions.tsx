'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';

export interface Attribute {
  id: string;
  attribute_name: string;
  display_order: number;
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  variant_combination: Record<string, string>;
  price: number | null;
  stock: number;
}

// Loads a product's attributes, their values and the active variant rows.
export function useProductOptions(productId: string | null | undefined, enabled = true) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [values, setValues] = useState<Record<string, AttributeValue[]>>({});
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId || !enabled) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const [{ data: attrs }, { data: vars }] = await Promise.all([
        publicClient.from('product_attributes').select('*').eq('product_id', productId).order('display_order', { ascending: true }),
        publicClient.from('product_variants').select('*').eq('product_id', productId).eq('is_active', true),
      ]);

      const attrList = (attrs as Attribute[]) ?? [];
      const valueMap: Record<string, AttributeValue[]> = {};
      if (attrList.length > 0) {
        const { data: vals } = await publicClient
          .from('product_attribute_values')
          .select('*')
          .in('attribute_id', attrList.map((a) => a.id))
          .order('display_order', { ascending: true });
        for (const v of (vals as AttributeValue[]) ?? []) {
          (valueMap[v.attribute_id] ??= []).push(v);
        }
      }

      if (cancelled) return;
      setAttributes(attrList);
      setValues(valueMap);
      setVariants(((vars as ProductVariant[]) ?? []).map((v) => ({ ...v, price: v.price == null ? null : Number(v.price) })));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, enabled]);

  return { attributes, values, variants, loading };
}

export function findVariant(attributes: Attribute[], variants: ProductVariant[], selected: Record<string, string>) {
  if (attributes.length === 0) return null;
  if (!attributes.every((a) => selected[a.attribute_name])) return null;
  return (
    variants.find((v) => Object.keys(v.variant_combination).every((k) => selected[k] === v.variant_combination[k])) ?? null
  );
}

const isColorAttr = (name: string) => /colou?r|shade/i.test(name);

function swatch(value: string) {
  if (typeof CSS === 'undefined') return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, '');
  return CSS.supports('color', v) ? v : null;
}

export function OptionPicker({
  attributes,
  values,
  selected,
  onSelect,
}: {
  attributes: Attribute[];
  values: Record<string, AttributeValue[]>;
  selected: Record<string, string>;
  onSelect: (attribute: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {attributes.map((attr) => (
        <div key={attr.id}>
          <p className="mb-2 text-sm font-extrabold text-ink">
            {attr.attribute_name}
            {selected[attr.attribute_name] && <span className="ml-2 font-semibold text-muted">{selected[attr.attribute_name]}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {(values[attr.id] ?? []).map((val) => {
              const active = selected[attr.attribute_name] === val.value;
              const color = isColorAttr(attr.attribute_name) ? swatch(val.value) : null;
              return (
                <motion.button
                  key={val.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelect(attr.attribute_name, val.value)}
                  className={`relative flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
                    active ? 'border-berry-500 bg-blush-100 text-berry-700' : 'border-line bg-white text-ink-soft hover:border-blush-300'
                  }`}
                  aria-pressed={active}
                >
                  {color && <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: color }} />}
                  {val.value}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
