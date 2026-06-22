'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { publicClient } from '@/lib/supabase';

interface Spec {
  key: string;
  value: string;
}

interface Attribute {
  id: string;
  name: string;
  values: string[];
}

interface VariantCombination {
  combination: Record<string, string>;
  price: string | null;
  stock: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number | null;
  category_id: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  specs: Record<string, string>;
  images: string[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    original_price: '',
    category_id: null,
    stock: '0',
    is_active: true,
    is_featured: false,
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([{ key: '', value: '' }]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<FileList | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await publicClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await publicClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !data) {
        router.push('/admin/dashboard/products');
        return;
      }

      const product = data as Product;

      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        original_price: product.original_price?.toString() || '',
        category_id: product.category_id ?? null,
        stock: product.stock?.toString() || '0',
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
      });

      setExistingImages(product.images || []);

      if (product.specs && Object.keys(product.specs).length > 0) {
        setSpecs(
          Object.entries(product.specs).map(([key, value]) => ({ key, value }))
        );
      }

      const { data: existingAttributes } = await publicClient
        .from('product_attributes')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (existingAttributes && existingAttributes.length > 0) {
        const loadedAttributes: Attribute[] = [];

        for (const attr of existingAttributes) {
          const { data: attrValues } = await publicClient
            .from('product_attribute_values')
            .select('*')
            .eq('attribute_id', attr.id)
            .order('display_order', { ascending: true });

          loadedAttributes.push({
            id: attr.id.toString(),
            name: attr.attribute_name,
            values: attrValues?.map((v: any) => v.value) || [],
          });
        }

        setAttributes(loadedAttributes);

        const { data: existingVariants } = await publicClient
          .from('product_variants')
          .select('*')
          .eq('product_id', productId);

        if (existingVariants && existingVariants.length > 0) {
          setVariantCombinations(
            existingVariants.map((v: any) => ({
              combination: v.variant_combination,
              price: v.price?.toString() ?? null,
              stock: v.stock?.toString() || '0',
            }))
          );
        }
      }

      setLoading(false);
    };

    fetchProduct();
  }, [productId, router]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const addSpecRow = () => {
    setSpecs([...specs, { key: '', value: '' }]);
  };

  const removeSpecRow = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = value;
    setSpecs(newSpecs);
  };

  const addAttribute = () => {
    setAttributes([
      ...attributes,
      { id: Date.now().toString(), name: '', values: [] },
    ]);
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter((attr) => attr.id !== id));
    setVariantCombinations([]);
  };

  const updateAttributeName = (id: string, name: string) => {
    setAttributes(
      attributes.map((attr) => (attr.id === id ? { ...attr, name } : attr))
    );
  };

  const updateAttributeValue = (attrId: string, value: string) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.id === attrId
          ? { ...attr, values: [...attr.values, value] }
          : attr
      )
    );
  };

  const removeAttributeValue = (attrId: string, index: number) => {
    setAttributes(
      attributes.map((attr) =>
        attr.id === attrId
          ? { ...attr, values: attr.values.filter((_, i) => i !== index) }
          : attr
      )
    );
  };

  const generateCombinations = () => {
    const validAttributes = attributes.filter(
      (attr) => attr.name.trim() && attr.values.filter((v) => v.trim()).length > 0
    );

    if (validAttributes.length === 0) {
      return;
    }

    const cartesianProduct = <T,>(arrays: T[][]): T[][] => {
      return arrays.reduce(
        (acc, curr) =>
          acc.flatMap((x) => curr.map((y) => [...x, y])),
        [[]] as T[][]
      );
    };

    const attributeValueLists = validAttributes.map((attr) =>
      attr.values.filter((v) => v.trim())
    );

    const combinations = cartesianProduct(attributeValueLists);

    const existingCombMap = new Map(
      variantCombinations.map((vc) => {
        const key = Object.entries(vc.combination)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join('|');
        return [key, vc];
      })
    );

    const newCombinations: VariantCombination[] = combinations.map((combo) => {
      const combination: Record<string, string> = {};
      validAttributes.forEach((attr, i) => {
        combination[attr.name.trim()] = combo[i] as string;
      });

      const key = Object.entries(combination)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');

      const existing = existingCombMap.get(key);

      return {
        combination,
        price: existing?.price ?? null,
        stock: existing?.stock ?? '0',
      };
    });

    setVariantCombinations(newCombinations);
  };

  const updateVariantPrice = (index: number, price: string) => {
    const updated = [...variantCombinations];
    updated[index].price = price || null;
    setVariantCombinations(updated);
  };

  const updateVariantStock = (index: number, stock: string) => {
    const updated = [...variantCombinations];
    updated[index].stock = stock;
    setVariantCombinations(updated);
  };

  const deleteExistingImage = (imageUrl: string) => {
    setExistingImages(existingImages.filter((img) => img !== imageUrl));
  };

  const uploadImages = async (files: FileList): Promise<string[]> => {
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await publicClient.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) {
        throw new Error('Failed to upload images');
      }

      const { data: { publicUrl } } = publicClient.storage
        .from('product-images')
        .getPublicUrl(data.path);

      uploadedUrls.push(publicUrl);
    }

    setUploadingImages(false);
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let allImages = [...existingImages];

      if (newImageFiles) {
        const newUrls = await uploadImages(newImageFiles);
        allImages = [...allImages, ...newUrls];
      }

      const specsObject: Record<string, string> = {};
      specs.forEach((spec) => {
        if (spec.key.trim()) {
          specsObject[spec.key.trim()] = spec.value;
        }
      });

      const productData = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        category_id: formData.category_id,
        stock: parseInt(formData.stock) || 0,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        specs: specsObject,
        images: allImages,
      };

      const { error } = await publicClient
        .from('products')
        .update(productData)
        .eq('id', productId);

      if (error) {
        throw new Error(error.message);
      }

      const validAttributes = attributes.filter(
        (attr) => attr.name.trim() && attr.values.filter((v) => v.trim()).length > 0
      );

      if (validAttributes.length > 0 && variantCombinations.length > 0) {
        try {
          await publicClient
            .from('product_variants')
            .delete()
            .eq('product_id', productId);

          await publicClient
            .from('product_attributes')
            .delete()
            .eq('product_id', productId);

          for (let attrIndex = 0; attrIndex < validAttributes.length; attrIndex++) {
            const attr = validAttributes[attrIndex];
            const { data: attrData, error: attrError } = await publicClient
              .from('product_attributes')
              .insert({
                product_id: productId,
                attribute_name: attr.name.trim(),
                display_order: attrIndex,
              })
              .select()
              .single();

            if (attrError) {
              throw new Error(`Failed to save attribute ${attr.name}: ${attrError.message}`);
            }

            const attributeId = attrData.id;

            const validValues = attr.values.filter((v) => v.trim());
            for (let valIndex = 0; valIndex < validValues.length; valIndex++) {
              const { error: valError } = await publicClient
                .from('product_attribute_values')
                .insert({
                  attribute_id: attributeId,
                  value: validValues[valIndex],
                  display_order: valIndex,
                });

              if (valError) {
                throw new Error(`Failed to save value ${validValues[valIndex]}: ${valError.message}`);
              }
            }
          }

          for (let i = 0; i < variantCombinations.length; i++) {
            const variant = variantCombinations[i];
            const { error: variantError } = await publicClient
              .from('product_variants')
              .insert({
                product_id: productId,
                variant_combination: variant.combination,
                price: variant.price ? parseFloat(variant.price) : null,
                stock: parseInt(variant.stock) || 0,
                is_active: true,
              });

            if (variantError) {
              throw new Error(`Failed to save variant: ${variantError.message}`);
            }
          }
        } catch (variantErr: any) {
          console.error('Variant save error:', variantErr);
          setError(`Product updated, but variants failed: ${variantErr.message}`);
          router.push('/admin/dashboard/products');
          return;
        }
      } else {
        await publicClient
          .from('product_variants')
          .delete()
          .eq('product_id', productId);

        await publicClient
          .from('product_attributes')
          .delete()
          .eq('product_id', productId);
      }

      router.push('/admin/dashboard/products');
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-gray-400">Loading...</div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-8">Edit Product</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slug
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (Rs.)
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Original Price (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category_id ?? ''}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.filter(c => c.parent_id === null).map(parent => {
                  const subcategories = categories.filter(c => c.parent_id === parent.id);
                  if (subcategories.length > 0) {
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name} (General)</option>
                        {subcategories.map(sub => (
                          <option key={sub.id} value={sub.id}>— {sub.name}</option>
                        ))}
                      </optgroup>
                    );
                  }
                  return (
                    <option key={parent.id} value={parent.id}>{parent.name}</option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Stock
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-300">Active</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-300">Featured</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Existing Images
            </label>
            {existingImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {existingImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Product image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => deleteExistingImage(imageUrl)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No images</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add New Images
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setNewImageFiles(e.target.files)}
              className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {uploadingImages && (
              <p className="text-gray-400 text-sm mt-2">Uploading images...</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Specifications</h2>
            <button
              type="button"
              onClick={addSpecRow}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Spec
            </button>
          </div>

          <div className="space-y-3">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-4 items-center">
                <input
                  type="text"
                  placeholder="Key (e.g. Battery)"
                  value={spec.key}
                  onChange={(e) => updateSpec(index, 'key', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 5000mAh)"
                  value={spec.value}
                  onChange={(e) => updateSpec(index, 'value', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {specs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSpecRow(index)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Variants</h2>
            <button
              type="button"
              onClick={addAttribute}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Attribute
            </button>
          </div>

          <div className="space-y-4">
            {attributes.map((attr) => (
              <div key={attr.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex gap-4 items-start mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Attribute Name (e.g. Color)"
                      value={attr.name}
                      onChange={(e) => updateAttributeName(attr.id, e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttribute(attr.id)}
                    className="text-red-400 hover:text-red-300 px-2 py-2"
                  >
                    Remove Attribute
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {attr.values.map((value, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-gray-600 rounded-full px-3 py-1"
                    >
                      <span className="text-white text-sm">{value}</span>
                      <button
                        type="button"
                        onClick={() => removeAttributeValue(attr.id, index)}
                        className="text-gray-400 hover:text-red-300 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a value (e.g. Black)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        updateAttributeValue(attr.id, e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        updateAttributeValue(attr.id, e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        updateAttributeValue(attr.id, input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="text-blue-400 hover:text-blue-300 px-3 py-2"
                  >
                    + Add Value
                  </button>
                </div>
              </div>
            ))}

            {attributes.length === 0 && (
              <p className="text-gray-400 text-sm">
                No attributes defined. Add an attribute (e.g. Color, Size) to create variants.
              </p>
            )}

            {attributes.length > 0 && (
              <button
                type="button"
                onClick={generateCombinations}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Generate Variant Combinations
              </button>
            )}

            {variantCombinations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-medium text-white mb-3">
                  Generated Combinations ({variantCombinations.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-600">
                        <th className="pb-2 pr-4">Combination</th>
                        <th className="pb-2 pr-4">Price Override</th>
                        <th className="pb-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantCombinations.map((variant, index) => (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="py-2 pr-4 text-white">
                            {Object.entries(variant.combination)
                              .map(([key, val]) => `${key}: ${val}`)
                              .join(' / ')}
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Use base price"
                              value={variant.price ?? ''}
                              onChange={(e) => updateVariantPrice(index, e.target.value)}
                              className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) => updateVariantStock(index, e.target.value)}
                              className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting || uploadingImages}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Update Product'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard/products')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
