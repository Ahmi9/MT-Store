'use client';

import { useEffect, useState } from 'react';
import { publicClient } from '@/lib/supabase';

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponFormData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  expiry_date: string;
  is_active: boolean;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_order_amount: 0,
    max_uses: null,
    expiry_date: '',
    is_active: true,
  });

  const fetchCoupons = async () => {
    const { data } = await publicClient
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_amount: 0,
      max_uses: null,
      expiry_date: '',
      is_active: true,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_uses: coupon.max_uses,
      expiry_date: coupon.expiry_date ? coupon.expiry_date.split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setEditingId(coupon.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_amount: 0,
      max_uses: null,
      expiry_date: '',
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.code) {
      alert('Please enter a coupon code');
      return;
    }

    if (formData.discount_type === 'percentage' && (formData.discount_value < 1 || formData.discount_value > 100)) {
      alert('Percentage discount must be between 1 and 100');
      return;
    }

    if (formData.discount_value <= 0) {
      alert('Discount value must be greater than 0');
      return;
    }

    const payload = {
      code: formData.code.toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_order_amount: formData.min_order_amount || 0,
      max_uses: formData.max_uses || null,
      expiry_date: formData.expiry_date || null,
      is_active: formData.is_active,
    };

    if (editingId) {
      const { error } = await publicClient
        .from('coupons')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        alert('Error updating coupon: ' + error.message);
        return;
      }
    } else {
      const { error } = await publicClient.from('coupons').insert(payload);

      if (error) {
        alert('Error adding coupon: ' + error.message);
        return;
      }
    }

    handleCancel();
    fetchCoupons();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    await publicClient.from('coupons').delete().eq('id', id);
    fetchCoupons();
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    await publicClient
      .from('coupons')
      .update({ is_active: !currentActive })
      .eq('id', id);

    fetchCoupons();
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `Rs. ${coupon.discount_value.toLocaleString()}`;
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'No expiry';
    const date = new Date(expiresAt);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatUsed = (coupon: Coupon) => {
    if (coupon.max_uses === null) return `${coupon.used_count}/∞`;
    return `${coupon.used_count}/${coupon.max_uses}`;
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Coupons</h1>
        {!showForm && (
          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Add Coupon
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-6">
            {editingId ? 'Edit Coupon' : 'Add Coupon'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Discount Type
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (Rs.)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Discount Value {formData.discount_type === 'percentage' ? '(1-100)' : ''}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData((prev) => ({ ...prev, discount_value: Number(e.target.value) }))}
                min={formData.discount_type === 'percentage' ? 1 : 0}
                max={formData.discount_type === 'percentage' ? 100 : undefined}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Minimum Order Amount
              </label>
              <input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, min_order_amount: Number(e.target.value) }))}
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Uses (leave empty for unlimited)
              </label>
              <input
                type="number"
                value={formData.max_uses ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, max_uses: e.target.value ? Number(e.target.value) : null }))}
                min="0"
                placeholder="∞"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expiry Date (leave empty for no expiry)
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
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

      {coupons.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No coupons yet</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Discount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Min Order</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Used</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Expires</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-white font-mono font-medium">{coupon.code}</td>
                  <td className="px-4 py-3 text-white font-medium">{formatDiscount(coupon)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {coupon.min_order_amount > 0 ? `Rs. ${coupon.min_order_amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatUsed(coupon)}</td>
                  <td className="px-4 py-3 text-gray-400">{formatExpiry(coupon.expiry_date)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        coupon.is_active ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          coupon.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(coupon)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
