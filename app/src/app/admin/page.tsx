'use client';

import React, { useState, useEffect } from 'react';
import {
  verifyAdminPassword,
  fetchProducts,
  saveProduct,
  deleteProduct,
  uploadImages,
  fetchOrders,
  updateOrderStatus,
} from '@/lib/api';
import { Product, SizeGuideRow } from '@/domain/models/Product';
import { Order, OrderStatus } from '@/domain/models/Order';
import { Lock, Plus, Trash2, Edit3, CheckCircle, Package, ArrowLeft, RefreshCw, Upload, Loader2, Star, Image as ImageIcon, Eye, EyeOff, Ruler } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_VEST_ROWS: SizeGuideRow[] = [
  { size: 'XS', chest: '84 – 89 cm (33 – 35 in)', waist: '70 – 75 cm (27 – 29 in)', length: '65 cm (25.5 in)' },
  { size: 'S',  chest: '90 – 95 cm (35 – 37 in)', waist: '76 – 81 cm (30 – 32 in)', length: '67 cm (26.4 in)' },
  { size: 'M',  chest: '96 – 101 cm (38 – 40 in)', waist: '82 – 87 cm (32 – 34 in)', length: '69 cm (27.2 in)' },
  { size: 'L',  chest: '102 – 107 cm (40 – 42 in)', waist: '88 – 93 cm (34 – 36 in)', length: '71 cm (28.0 in)' },
  { size: 'XL', chest: '108 – 113 cm (43 – 45 in)', waist: '94 – 99 cm (37 – 39 in)', length: '73 cm (28.7 in)' },
  { size: 'XXL', chest: '114 – 119 cm (45 – 47 in)', waist: '100 – 105 cm (39 – 41 in)', length: '75 cm (29.5 in)' },
];

const DEFAULT_TSHIRT_ROWS: SizeGuideRow[] = [
  { size: 'XS', chest: '86 – 91 cm (34 – 36 in)', waist: '72 – 77 cm (28 – 30 in)', length: '66 cm (26.0 in)' },
  { size: 'S',  chest: '92 – 97 cm (36 – 38 in)', waist: '78 – 83 cm (30 – 32 in)', length: '68 cm (26.8 in)' },
  { size: 'M',  chest: '98 – 103 cm (38 – 40 in)', waist: '84 – 89 cm (33 – 35 in)', length: '70 cm (27.6 in)' },
  { size: 'L',  chest: '104 – 109 cm (41 – 43 in)', waist: '90 – 95 cm (35 – 37 in)', length: '72 cm (28.3 in)' },
  { size: 'XL', chest: '110 – 115 cm (43 – 45 in)', waist: '96 – 101 cm (38 – 40 in)', length: '74 cm (29.1 in)' },
  { size: 'XXL', chest: '116 – 121 cm (46 – 48 in)', waist: '102 – 107 cm (40 – 42 in)', length: '76 cm (29.9 in)' },
];

const DEFAULT_SHORTS_ROWS: SizeGuideRow[] = [
  { size: 'XS', chest: 'N/A', waist: '70 – 75 cm (27 – 29 in)', length: '12 cm / 4.7 in (Inseam)' },
  { size: 'S',  chest: 'N/A', waist: '76 – 81 cm (30 – 32 in)', length: '13 cm / 5.1 in (Inseam)' },
  { size: 'M',  chest: 'N/A', waist: '82 – 87 cm (32 – 34 in)', length: '13 cm / 5.1 in (Inseam)' },
  { size: 'L',  chest: 'N/A', waist: '88 – 93 cm (34 – 36 in)', length: '14 cm / 5.5 in (Inseam)' },
  { size: 'XL', chest: 'N/A', waist: '94 – 99 cm (37 – 39 in)', length: '14 cm / 5.5 in (Inseam)' },
  { size: 'XXL', chest: 'N/A', waist: '100 – 105 cm (39 – 41 in)', length: '15 cm / 5.9 in (Inseam)' },
];

const DEFAULT_HOODIE_ROWS: SizeGuideRow[] = [
  { size: 'XS', chest: '88 – 93 cm (35 – 37 in)', waist: '74 – 79 cm (29 – 31 in)', length: '68 cm (26.8 in)' },
  { size: 'S',  chest: '94 – 99 cm (37 – 39 in)', waist: '80 – 85 cm (31 – 33 in)', length: '70 cm (27.6 in)' },
  { size: 'M',  chest: '100 – 105 cm (39 – 41 in)', waist: '86 – 91 cm (34 – 36 in)', length: '72 cm (28.3 in)' },
  { size: 'L',  chest: '106 – 111 cm (42 – 44 in)', waist: '92 – 97 cm (36 – 38 in)', length: '74 cm (29.1 in)' },
  { size: 'XL', chest: '112 – 117 cm (44 – 46 in)', waist: '98 – 103 cm (38 – 40 in)', length: '76 cm (29.9 in)' },
  { size: 'XXL', chest: '118 – 123 cm (46 – 48 in)', waist: '104 – 109 cm (41 – 43 in)', length: '78 cm (30.7 in)' },
];

export default function AdminCMSPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [productDesc, setProductDesc] = useState<string>('');
  const [productPrice, setProductPrice] = useState<string>('25.00');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sizeGuideRows, setSizeGuideRows] = useState<SizeGuideRow[]>(DEFAULT_VEST_ROWS);


  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAdminData();
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isValid = await verifyAdminPassword(passwordInput);
      if (isValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        setAuthError('');
        loadAdminData();
      } else {
        setAuthError('Incorrect admin password.');
      }
    } catch (err) {
      setAuthError('Failed to verify admin password.');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [allProds, allOrds] = await Promise.all([
        fetchProducts(true), // fetch all products including drafts from backend API
        fetchOrders(),       // fetch all orders from backend API
      ]);
      setProducts(allProds);
      setOrders(allOrds);
    } catch (err) {
      console.error('Failed to load admin data from API:', err);
    } finally {
      setLoading(false);
    }
  };

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return alert('Please upload image files (PNG, JPG, WebP).');

    setUploadingImage(true);
    try {
      const uploadedUrls = await uploadImages(imageFiles);
      setProductImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      alert('Failed to upload images to backend.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setProductImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToSet: number) => {
    setProductImages((prev) => {
      const copy = [...prev];
      const selected = copy.splice(indexToSet, 1);
      return [...selected, ...copy];
    });
  };

  const handleAddSizeRow = () => {
    setSizeGuideRows((prev) => [...prev, { size: '', chest: '', waist: '', length: '' }]);
  };

  const handleUpdateSizeRow = (index: number, field: keyof SizeGuideRow, value: string) => {
    setSizeGuideRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveSizeRow = (index: number) => {
    setSizeGuideRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(productPrice);
    if (isNaN(priceNum) || priceNum <= 0) return alert('Enter a valid price');

    const validRows = sizeGuideRows.filter((r) => r.size.trim().length > 0);
    if (validRows.length === 0) {
      return alert('Please add at least one size for the product.');
    }

    const derivedSizes = validRows.map((r) => r.size.trim().toUpperCase());
    const mainImageUrl = productImages.length > 0 ? productImages[0] : '/logo.png';

    try {
      await saveProduct({
        id: editingProductId || undefined,
        name: productName,
        description: productDesc,
        price: priceNum,
        imageUrl: mainImageUrl,
        imageUrls: productImages.length > 0 ? productImages : [mainImageUrl],
        sizes: derivedSizes,
        sizeGuideRows: validRows,
        isPublished: true,
      });

      setIsProductModalOpen(false);
      resetProductForm();
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete product');
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment';
      case 'payment_successful':
        return 'Payment Received';
      case 'completed':
        return 'Order Fulfilled';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductDesc('');
    setProductPrice('25.00');
    setProductImages([]);
    setSizeGuideRows(DEFAULT_VEST_ROWS);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDesc(product.description);
    setProductPrice(product.price.toString());
    const existingImages = product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl ? [product.imageUrl] : [];
    setProductImages(existingImages);
    if (product.sizeGuideRows && product.sizeGuideRows.length > 0) {
      setSizeGuideRows(product.sizeGuideRows);
    } else if (product.sizes && product.sizes.length > 0) {
      setSizeGuideRows(product.sizes.map((s) => ({ size: s, chest: '', waist: '', length: '' })));
    } else {
      setSizeGuideRows(DEFAULT_VEST_ROWS);
    }
    setIsProductModalOpen(true);
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl">
          <div className="w-14 h-14 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 text-center mb-1">Organiser CMS</h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            Enter the admin password to access store management.
          </p>

          {authError && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 font-medium text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition"
            >
              Access CMS
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
              &larr; Back to Holding Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/store" className="text-slate-400 hover:text-white transition p-1">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <span className="font-extrabold text-base block leading-tight">Organiser CMS</span>
              <span className="text-[10px] uppercase font-bold text-[rgb(202,88,46)] block">
                Peasants Revolt Running Club
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              title="Refresh Data"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                sessionStorage.removeItem('admin_authenticated');
              }}
              className="text-xs text-slate-400 hover:text-red-400 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 text-xs font-extrabold border-b-2 transition ${
              activeTab === 'products'
                ? 'border-[rgb(202,88,46)] text-[rgb(202,88,46)]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Products Catalog ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 text-xs font-extrabold border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-[rgb(202,88,46)] text-[rgb(202,88,46)]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Customer Orders ({orders.length})
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[rgb(202,88,46)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'products' ? (
          /* Products Tab */
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Manage Kit Items</h2>
                <p className="text-xs text-slate-500">Upload images, set prices, and update kit items.</p>
              </div>
              <button
                onClick={() => {
                  resetProductForm();
                  setIsProductModalOpen(true);
                }}
                className="bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition"
              >
                <Plus size={16} /> Add New Kit Item
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Package size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-4">No products created yet.</p>
                <button
                  onClick={() => {
                    resetProductForm();
                    setIsProductModalOpen(true);
                  }}
                  className="bg-[rgb(202,88,46)] text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Add First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-40 bg-slate-100 rounded-xl mb-4 p-2 flex items-center justify-center">
                        <img
                          src={product.imageUrl || '/logo.png'}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 text-sm">{product.name}</h3>
                        <span className="font-extrabold text-sm text-[rgb(202,88,46)]">
                          £{product.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{product.description}</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {product.sizes?.map((s) => (
                          <span key={s} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Published
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditProductModal(product)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Orders Tab */
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">Manage Customer Orders</h2>
              <p className="text-xs text-slate-500">
                Check Monzo transfers and mark payments as received or fulfilled.
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Package size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No customer orders yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-slate-900 mr-2">
                          {order.id}
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          {order.userName} ({order.userEmail})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            order.status === 'pending_payment'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'payment_successful'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {formatStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-700">
                          <span>
                            {it.quantity}x {it.productName} ({it.size})
                          </span>
                          <span className="font-bold">£{it.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
                      <span className="font-black text-sm text-slate-900">
                        Total: £{order.totalAmount.toFixed(2)}
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {order.status === 'pending_payment' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'payment_successful')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Mark Payment Received
                          </button>
                        )}
                        {order.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Mark Order Fulfilled
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-4">
              {editingProductId ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Official Club Running Vest"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)] font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  placeholder="Breathable high-performance running top in club terracotta."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)] h-20"
                />
              </div>

              {/* Drag & Drop Multi-Image Upload Zone */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Product Images (Drag & Drop or Click to Select Multiple)
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-200 cursor-pointer ${
                    isDragging
                      ? 'border-[rgb(202,88,46)] bg-[rgba(202,88,46,0.08)] scale-[1.01]'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="multi-file-input"
                  />
                  <label htmlFor="multi-file-input" className="cursor-pointer block">
                    {uploadingImage ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <Loader2 size={32} className="text-[rgb(202,88,46)] animate-spin" />
                        <span className="text-xs font-bold text-slate-700">Uploading Images...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm text-[rgb(202,88,46)] mx-auto mb-1">
                          <Upload size={18} />
                        </div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {isDragging ? 'Drop Image Files Here!' : 'Drag & Drop Images Here'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          or click to browse multiple files (PNG, JPG, WebP)
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Uploaded Images Gallery Grid */}
                {productImages.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">
                      Uploaded Images ({productImages.length})
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {productImages.map((imgUrl, index) => (
                        <div
                          key={`${imgUrl}-${index}`}
                          className="relative group h-16 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1"
                        >
                          <img
                            src={imgUrl}
                            alt={`Product image ${index + 1}`}
                            className="max-h-full max-w-full object-contain rounded-lg"
                          />
                          {index === 0 && (
                            <span className="absolute top-1 left-1 bg-[rgb(202,88,46)] text-white text-[8px] font-bold px-1 py-0.5 rounded shadow flex items-center gap-0.5">
                              <Star size={8} /> Main
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                            {index !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(index)}
                                title="Set as Main Image"
                                className="bg-white text-slate-800 p-1 rounded-lg hover:bg-amber-100 hover:text-amber-800 text-[10px] font-bold"
                              >
                                <Star size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              title="Remove Image"
                              className="bg-white text-slate-800 p-1 rounded-lg hover:bg-red-100 hover:text-red-600 text-[10px] font-bold"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Sizes & Measurements Table Builder */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                      <Ruler size={14} className="text-[rgb(202,88,46)]" /> Product Sizes & Sizing Guide
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Define the custom sizes offered for this product and optional sizing measurements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSizeRow}
                    className="bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition"
                  >
                    <Plus size={14} /> Add Size Row
                  </button>
                </div>

                {/* Pre-fill Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Pre-fill Presets:</span>
                  <button
                    type="button"
                    onClick={() => setSizeGuideRows(DEFAULT_VEST_ROWS)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition"
                  >
                    🎽 Vest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeGuideRows(DEFAULT_TSHIRT_ROWS)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition"
                  >
                    👕 T-Shirt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeGuideRows(DEFAULT_SHORTS_ROWS)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition"
                  >
                    🩳 Shorts
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeGuideRows(DEFAULT_HOODIE_ROWS)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition"
                  >
                    🧥 Hoodie
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeGuideRows([])}
                    className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    Clear All
                  </button>
                </div>

                {/* Interactive Table of Size Rows */}
                {sizeGuideRows.length === 0 ? (
                  <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 font-medium">
                    No sizes defined. Click &quot;Add Size Row&quot; or choose a pre-fill preset above.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-28">Size Label *</th>
                          <th className="py-2.5 px-3">Chest / Bust</th>
                          <th className="py-2.5 px-3">Waist</th>
                          <th className="py-2.5 px-3">Length / Inseam</th>
                          <th className="py-2.5 px-2 text-center w-10">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sizeGuideRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                required
                                placeholder="e.g. S, M, L"
                                value={row.size}
                                onChange={(e) => handleUpdateSizeRow(idx, 'size', e.target.value)}
                                className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 uppercase focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. 90 – 95 cm"
                                value={row.chest || ''}
                                onChange={(e) => handleUpdateSizeRow(idx, 'chest', e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)] text-slate-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. 76 – 81 cm"
                                value={row.waist || ''}
                                onChange={(e) => handleUpdateSizeRow(idx, 'waist', e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)] text-slate-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. 67 cm"
                                value={row.length || ''}
                                onChange={(e) => handleUpdateSizeRow(idx, 'length', e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)] text-slate-700"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSizeRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                                title="Remove Size"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploadingImage}
                className="w-full bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition"
              >
                {uploadingImage ? 'Uploading Image...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
