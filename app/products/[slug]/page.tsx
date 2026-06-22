'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { publicClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';

declare global {
  interface Window {
    fbq?: (event: string, eventName: string, data?: Record<string, any>) => void;
  }
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[] | null;
  category: string | null;
  description: string | null;
  specs: Record<string, string> | null;
  stock: number;
  is_active: boolean;
}

interface Review {
  id: number;
  product_id: number;
  customer_name: string;
  customer_city: string | null;
  review_text: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

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

function StarIcon({ filled, half }: { filled: boolean; half?: boolean }) {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill={filled ? '#111111' : 'none'}
      stroke={filled ? '#111111' : '#d1d5db'}
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-1 transition-transform hover:scale-110"
        >
          <StarIcon filled={star <= value} />
        </button>
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const viewContentFired = useRef(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 0,
    customer_name: '',
    customer_city: '',
    review_text: '',
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [productAttributes, setProductAttributes] = useState<Attribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<number, AttributeValue[]>>({});
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await publicClient
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (res.error || !res.data) {
        setNotFound(true);
      } else {
        setProduct(res.data as Product);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!product) return;
      const { data } = await publicClient
        .from('product_reviews')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (data) setReviews(data as Review[]);
    };
    fetchReviews();
  }, [product]);

  useEffect(() => {
    const fetchVariants = async () => {
      if (!product) return;

      const { data: attributes, error: attrError } = await publicClient
        .from('product_attributes')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      if (attributes && attributes.length > 0) {
        setProductAttributes(attributes as Attribute[]);

        const valuesMap: Record<number, AttributeValue[]> = {};
        for (const attr of attributes) {
          const { data: values, error: valError } = await publicClient
            .from('product_attribute_values')
            .select('*')
            .eq('attribute_id', attr.id)
            .order('display_order', { ascending: true });
          if (values) {
            valuesMap[attr.id] = values as AttributeValue[];
          }
        }
        setAttributeValues(valuesMap);
      }

      const { data: variants, error: varError } = await publicClient
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (variants) {
        setProductVariants(variants as ProductVariant[]);
      }
    };
    fetchVariants();
  }, [product]);

  useEffect(() => {
    if (viewContentFired.current) return;
    if (typeof window !== 'undefined' && window.fbq && product) {
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: 'PKR',
      });
      viewContentFired.current = true;
    }
  }, [product]);

  const hasVariants = productAttributes.length > 0;

  const allAttributesSelected = () => {
    if (!hasVariants) return true;
    return productAttributes.every((attr) => selectedVariant[attr.attribute_name]);
  };

  const getSelectedVariantInfo = () => {
    if (!allAttributesSelected()) return null;
    return productVariants.find((v) => {
      const combo = v.variant_combination;
      return Object.keys(combo).every(
        (key) => selectedVariant[key] === combo[key]
      );
    }) || null;
  };

  const currentVariant = getSelectedVariantInfo();
  const displayPrice = currentVariant?.price ?? product?.price ?? 0;
  const displayStock = currentVariant?.stock ?? product?.stock ?? 0;
  const isVariantInStock = displayStock > 0;

  const addToCart = () => {
    if (!product) return;
    if (hasVariants && !allAttributesSelected()) return;

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartKey = hasVariants
      ? `${product.id}-${JSON.stringify(selectedVariant)}`
      : `${product.id}`;

    const existingIndex = cart.findIndex((item: any) => {
      if (hasVariants) {
        return item.id === product.id && JSON.stringify(item.selectedVariant) === JSON.stringify(selectedVariant);
      }
      return item.id === product.id;
    });

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: displayPrice,
        image: product.images?.[0],
        quantity,
        slug: product.slug,
        selectedVariant: hasVariants ? { ...selectedVariant } : null,
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: displayPrice,
        currency: 'PKR',
      });
    }

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1200);
  };

  const handleSubmitReview = async () => {
    if (!product) return;
    if (reviewFormData.rating === 0 || !reviewFormData.customer_name.trim() || !reviewFormData.review_text.trim()) {
      return;
    }

    setReviewSubmitting(true);

    const { error } = await publicClient.from('product_reviews').insert({
      product_id: product.id,
      customer_name: reviewFormData.customer_name.trim(),
      customer_city: reviewFormData.customer_city.trim() || null,
      review_text: reviewFormData.review_text.trim(),
      rating: reviewFormData.rating,
      is_approved: true,
    });

    if (!error) {
      setReviewSuccess(true);
      setReviewFormData({ rating: 0, customer_name: '', customer_city: '', review_text: '' });
      setShowReviewForm(false);

      const { data } = await publicClient
        .from('product_reviews')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (data) setReviews(data as Review[]);

      setTimeout(() => setReviewSuccess(false), 3000);
    }

    setReviewSubmitting(false);
  };

  const cancelReviewForm = () => {
    setShowReviewForm(false);
    setReviewFormData({ rating: 0, customer_name: '', customer_city: '', review_text: '' });
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-white">
        <AnnouncementBar />
        <Navbar />

        <main className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#111111] mb-4">Product Not Found</h1>
          <p className="text-[#666666] mb-8">The product you are looking for does not exist or has been removed.</p>
          <Link href="/products" className="bg-[#111111] text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-[#333] transition-colors">
            Browse All Products
          </Link>
        </main>

        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#666666]">Loading...</p>
      </div>
    );
  }

  const savings = product.original_price ? product.original_price - product.price : 0;

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <div className="bg-[#f8f8f6] rounded-[14px] overflow-hidden mb-4">
              <AnimatePresence mode="wait">
                {product.images?.[selectedImage] ? (
                  <motion.img
                    key={selectedImage}
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-[400px] object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                ) : (
                  <div className="w-full h-[400px] flex items-center justify-center text-gray-300">
                    No Image
                  </div>
                )}
              </AnimatePresence>
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {product.images.map((image, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-[10px] overflow-hidden border-2 flex-shrink-0 ${
                      selectedImage === index ? 'border-[#111111]' : 'border-transparent'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {product.category && (
              <p className="text-[#666666] text-sm uppercase tracking-wider mb-2">
                {product.category}
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-[#111111] mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-6">
              {product.original_price && (
                <span className="text-[#666666] text-lg line-through">
                  Rs. {product.original_price.toLocaleString()}
                </span>
              )}
              <span className="text-2xl font-bold text-[#111111]">
                Rs. {displayPrice.toLocaleString()}
              </span>
            </div>

            {savings > 0 && (
              <div className="bg-[#f5c518] text-[#111111] text-sm font-bold px-4 py-2 rounded-full w-fit mb-6">
                You save Rs. {savings.toLocaleString()}
              </div>
            )}

            <div className="mb-6">
              {isVariantInStock ? (
                <span className="text-green-600 font-medium text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  In Stock ({displayStock} available)
                </span>
              ) : (
                <span className="text-red-600 font-medium text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                  Out of Stock
                </span>
              )}
            </div>

            
            {hasVariants && (
              <div className="mb-6 space-y-4">
                {productAttributes.map((attr) => (
                  <div key={attr.id}>
                    <span className="text-sm font-medium text-[#111111] block mb-2">
                      {attr.attribute_name}:
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
                {hasVariants && !allAttributesSelected() && (
                  <p className="text-sm text-[#666666]">
                    Please select {productAttributes.find((a) => !selectedVariant[a.attribute_name])?.attribute_name}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-[#111111]">Quantity:</span>
              <div className="flex items-center border border-gray-200 rounded-[10px]">
                <motion.button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#111111] hover:bg-gray-50 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  -
                </motion.button>
                <span className="w-12 text-center font-medium text-[#111111]">
                  {quantity}
                </span>
                <motion.button
                  onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#111111] hover:bg-gray-50 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  +
                </motion.button>
              </div>
            </div>

            <motion.button
              onClick={addToCart}
              disabled={!isVariantInStock || addedToCart || (hasVariants && !allAttributesSelected())}
              className={`w-full py-4 rounded-[10px] font-semibold text-sm mb-8 transition-colors flex items-center justify-center gap-2 ${
                isVariantInStock && (!hasVariants || allAttributesSelected())
                  ? 'bg-[#111111] text-white hover:bg-[#333]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              whileTap={isVariantInStock && !addedToCart && (!hasVariants || allAttributesSelected()) ? { scale: 0.95 } : {}}
            >
              <AnimatePresence mode="wait">
                {addedToCart ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Added!
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {product.description && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-[#111111] mb-3">Description</h2>
                <p className="text-[#666666] text-sm leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {product.specs && Object.keys(product.specs).length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-[#111111] mb-3">Specifications</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(product.specs).map(([key, value], index) => (
                      <tr key={key} className={index % 2 === 0 ? 'bg-[#f8f8f6]' : ''}>
                        <td className="py-3 px-4 text-[#666666] font-medium">{key}</td>
                        <td className="py-3 px-4 text-[#111111]">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-16"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between items-center mb-8">
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <h2 className="text-xl font-bold text-[#111111] mb-2 md:mb-0">Customer Reviews</h2>
            </div>
            {reviews.length > 0 && (
              <div className="hidden md:flex items-center gap-3 mb-4 md:mb-0">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} filled={star <= Math.round(averageRating)} />
                  ))}
                </div>
                <span className="text-sm text-[#666666]">
                  {averageRating.toFixed(1)} out of 5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
            {!showReviewForm && (
              <motion.button
                onClick={() => setShowReviewForm(true)}
                whileTap={{ scale: 0.97 }}
                className="bg-[#111111] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                Write a Review
              </motion.button>
            )}
          </div>
          {reviews.length > 0 && (
            <div className="flex flex-col items-center mb-6 md:hidden">
              <div className="flex mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} filled={star <= Math.round(averageRating)} />
                ))}
              </div>
              <span className="text-sm text-[#666666]">
                {averageRating.toFixed(1)} out of 5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          <AnimatePresence>
            {reviewSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6"
              >
                Thank you! Your review has been submitted successfully.
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showReviewForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-[#eee] rounded-[14px] p-6 mb-8">
                  <h3 className="font-bold text-[#111111] mb-4">Write Your Review</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-2">Your Rating *</label>
                      <StarRatingInput
                        value={reviewFormData.rating}
                        onChange={(v) => setReviewFormData((prev) => ({ ...prev, rating: v }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={reviewFormData.customer_name}
                          onChange={(e) => setReviewFormData((prev) => ({ ...prev, customer_name: e.target.value }))}
                          placeholder="Ahmed Khan"
                          className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-2">
                          City <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={reviewFormData.customer_city}
                          onChange={(e) => setReviewFormData((prev) => ({ ...prev, customer_city: e.target.value }))}
                          placeholder="Karachi"
                          className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] transition-colors duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-2">
                        Your Review *
                      </label>
                      <textarea
                        value={reviewFormData.review_text}
                        onChange={(e) => setReviewFormData((prev) => ({ ...prev, review_text: e.target.value }))}
                        placeholder="Share your experience with this product..."
                        rows={4}
                        className="w-full px-4 py-3 bg-white border border-[#ddd] rounded-lg text-[#111] placeholder-[#999] focus:outline-none focus:border-[#111] resize-none transition-colors duration-200"
                      />
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleSubmitReview}
                        disabled={reviewSubmitting || reviewFormData.rating === 0 || !reviewFormData.customer_name.trim() || !reviewFormData.review_text.trim()}
                        whileTap={{ scale: 0.97 }}
                        className="bg-[#111111] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </motion.button>
                      <motion.button
                        onClick={cancelReviewForm}
                        whileTap={{ scale: 0.97 }}
                        className="bg-gray-200 text-[#111111] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {reviews.length === 0 && !showReviewForm ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-[#f8f8f6] rounded-[14px]"
            >
              <p className="text-[#666666]">No reviews yet. Be the first to review this product!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="bg-white border border-[#eee] rounded-[14px] p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#111111]">{review.customer_name}</span>
                        {review.customer_city && (
                          <span className="text-sm text-[#999]">from {review.customer_city}</span>
                        )}
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon key={star} filled={star <= review.rating} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-[#999]">{formatTimeAgo(review.created_at)}</span>
                  </div>
                  <p className="text-[#666666] text-sm leading-relaxed">{review.review_text}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}