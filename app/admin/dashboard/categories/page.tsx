'use client';

import { useEffect, useState, Fragment } from 'react';
import { publicClient } from '@/lib/supabase';

interface Category {
  id: string | number;
  parent_id: string | number | null;
  name: string;
  [key: string]: any;
}

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string | number | null;
  display_order: number;
  is_active: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    parent_id: null,
    display_order: 0,
    is_active: true,
  });

  const fetchCategories = async () => {
    const { data } = await publicClient
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : generateSlug(name),
    }));
  };

  const handleOpenAdd = () => {
    setFormData({ name: '', slug: '', parent_id: null, display_order: 0, is_active: true });
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setEditingId(category.id as number);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', slug: '', parent_id: null, display_order: 0, is_active: true });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      alert('Please fill in Name and Slug');
      return;
    }

    if (editingId) {
      const { error } = await publicClient
        .from('categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          parent_id: formData.parent_id,
          display_order: formData.display_order,
          is_active: formData.is_active,
        })
        .eq('id', editingId);

      if (error) {
        alert('Error updating category: ' + error.message);
        return;
      }
    } else {
      const { error } = await publicClient.from('categories').insert({
        name: formData.name,
        slug: formData.slug,
        parent_id: formData.parent_id,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      if (error) {
        alert('Error adding category: ' + error.message);
        return;
      }
    }

    handleCancel();
    fetchCategories();
  };

  const handleDelete = async (id: string | number) => {
    const category = categories.find((c) => c.id === id);
    const hasSubcategories = categories.some((c) => c.parent_id === id);

    let confirmMessage = 'Are you sure you want to delete this category?';
    if (hasSubcategories) {
      confirmMessage = 'This will also delete its subcategories. Are you sure you want to delete this category?';
    }

    if (!confirm(confirmMessage)) return;

    const idsToDelete: (string | number)[] = [id];
    if (hasSubcategories) {
      const subIds = categories.filter((c) => c.parent_id === id).map((c) => c.id as string | number);
      idsToDelete.push(...subIds);
    }

    for (const catId of idsToDelete) {
      await publicClient.from('categories').delete().eq('id', catId);
    }

    fetchCategories();
  };

  const handleToggleActive = async (id: string | number, currentActive: boolean) => {
    await publicClient
      .from('categories')
      .update({ is_active: !currentActive })
      .eq('id', id);

    fetchCategories();
  };

  const topLevelCategories = categories.filter((c) => c.parent_id === null);

  const getSubcategories = (parentId: string | number) => {
    return categories.filter((c) => c.parent_id === parentId);
  };

  const topLevelOptions = categories.filter((c) => c.parent_id === null);

  const handleOpenAddSubcategory = (parentId: string | number) => {
    setFormData({ name: '', slug: '', parent_id: parentId, display_order: 0, is_active: true });
    setEditingId(null);
    setShowForm(true);
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Categories</h1>
        {!showForm && (
          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-6">
            {editingId ? 'Edit Category' : 'Add Category'}
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Electronics"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="electronics"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Parent Category
              </label>
              <select
                value={formData.parent_id ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None (top-level)</option>
                {topLevelOptions
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, display_order: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-300">Is Active</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No categories yet</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topLevelCategories.map((category) => {
                const subcategories = getSubcategories(category.id);
                return (
                  <Fragment key={category.id}>
                    <tr className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-white font-medium">{category.name}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-sm">{category.slug}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(category.id, category.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            category.is_active ? 'bg-green-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              category.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenAddSubcategory(category.id)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            + Add Subcategory
                          </button>
                          <button
                            onClick={() => handleOpenEdit(category)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {subcategories.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-750 bg-gray-850">
                        <td className="px-4 py-3 text-gray-300 pl-12">— {sub.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-sm">{sub.slug}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(sub.id, sub.is_active)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              sub.is_active ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                sub.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenEdit(sub)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}