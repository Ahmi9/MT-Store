'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
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

  const addAttributeValue = (id: string) => {
    setAttributes(
      attributes.map((attr) =>
        attr.id === id ? { ...attr, values: [...attr.values, ''] } : attr
      )
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
    console.log('generateCombinations called');
    console.log('attributes:', JSON.stringify(attributes, null, 2));

    const validAttributes = attributes.filter(
      (attr) => attr.name.trim() && attr.values.filter((v) => v.trim()).length > 0
    );

    console.log('validAttributes:', JSON.stringify(validAttributes, null, 2));

    if (validAttributes.length === 0) {
      console.log('No valid attributes, returning early');
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

    console.log('attributeValueLists:', attributeValueLists);

    const combinations = cartesianProduct(attributeValueLists);

    console.log('combinations:', combinations);

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

    console.log('newCombinations:', newCombinations);
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
    setLoading(true);

    try {
      const imageUrls = imageFiles ? await uploadImages(imageFiles) : [];

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
        images: imageUrls,
      };

      const { data: productResult, error: productError } = await publicClient
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (productError) {
        throw new Error(productError.message);
      }

      const newProductId = productResult.id;

      const validAttributes = attributes.filter(
        (attr) => attr.name.trim() && attr.values.filter((v) => v.trim()).length > 0
      );

      if (validAttributes.length > 0 && variantCombinations.length > 0) {
        try {
          for (let attrIndex = 0; attrIndex < validAttributes.length; attrIndex++) {
            const attr = validAttributes[attrIndex];
            const { data: attrData, error: attrError } = await publicClient
              .from('product_attributes')
              .insert({
                product_id: newProductId,
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
                product_id: newProductId,
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
          setError(`Product saved, but variants failed: ${variantErr.message}`);
          router.push('/admin/dashboard/products');
          return;
        }
      }

      router.push('/admin/dashboard/products');
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-8">Add Product</h1>

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
              Images
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setImageFiles(e.target.files)}
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
            disabled={loading || uploadingImages}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Product'}
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
