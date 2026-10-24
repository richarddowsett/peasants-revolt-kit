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
  fetchFeatureFlag,
  updateFeatureFlag,
} from '@/lib/api';
import { Product, SizeGuideRow, GenderFit } from '@/domain/models/Product';
import { Order, OrderStatus } from '@/domain/models/Order';
import { formatFullSizeLabel, parseGenderFromSize } from '@/domain/models/SizeGuide';
import { Lock, Plus, Trash2, Edit3, CheckCircle, Package, ArrowLeft, RefreshCw, Upload, Loader2, Star, Eye, EyeOff, Ruler, Send, Store, AlertTriangle, Printer, XCircle } from 'lucide-react';
import Link from 'next/link';
import EventsAdminPanel from '@/components/EventsAdminPanel';

const ORDER_STATUS_FILTERS: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending_payment', label: 'Pending Payment' },
  { id: 'payment_successful', label: 'Payment Received' },
  { id: 'order_sent', label: 'Order Sent' },
  { id: 'completed', label: 'Order Fulfilled' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function AdminCMSPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'events'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [isStoreClosed, setIsStoreClosed] = useState<boolean>(false);
  const [togglingStore, setTogglingStore] = useState<boolean>(false);

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [productDesc, setProductDesc] = useState<string>('');
  const [productPrice, setProductPrice] = useState<string>('25.00');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sizeGuideRows, setSizeGuideRows] = useState<SizeGuideRow[]>([]);
  const [adminSizeFilter, setAdminSizeFilter] = useState<'all' | 'men' | 'women' | 'unisex'>('all');


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
    } catch {
      setAuthError('Failed to verify admin password.');
    }
  };

  const loadAdminData = async (showSpinner: boolean = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [allProds, allOrds, storeFlag] = await Promise.all([
        fetchProducts(true), // fetch all products including drafts from backend API
        fetchOrders(),       // fetch all orders from backend API
        fetchFeatureFlag('store_closed').catch(() => null),
      ]);
      setProducts(allProds);
      setOrders(allOrds);
      if (storeFlag) {
        setIsStoreClosed(storeFlag.enabled === true);
      }
    } catch (err) {
      console.error('Failed to load admin data from API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStoreStatus = async () => {
    const nextClosedState = !isStoreClosed;
    const confirmMessage = nextClosedState
      ? 'Are you sure you want to CLOSE the store?\n\nVisitors to the store will see the holding page with the Instagram link, and new customer orders will be blocked.'
      : 'Are you sure you want to REOPEN the store?\n\nVisitors will be able to browse kit items and place orders normally.';

    if (!confirm(confirmMessage)) return;

    setTogglingStore(true);
    try {
      await updateFeatureFlag('store_closed', nextClosedState);
      setIsStoreClosed(nextClosedState);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update store status');
    } finally {
      setTogglingStore(false);
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
    } catch (err: unknown) {
      alert(`Failed to upload images: ${(err as Error).message || 'Storage upload error'}`);
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

  const handleAddSizeRow = (gender: GenderFit = 'men') => {
    setSizeGuideRows((prev) => [
      ...prev,
      { gender, size: '', chest: '', waist: '', length: '' },
    ]);
  };

  const handleUpdateSizeRow = <K extends keyof SizeGuideRow>(
    index: number,
    field: K,
    value: SizeGuideRow[K]
  ) => {
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

    const derivedSizes = Array.from(
      new Set(validRows.map((r) => formatFullSizeLabel(r.size, r.gender)))
    );

    if (productImages.some((img) => img.startsWith('data:'))) {
      return alert('Images cannot be base64 data URLs. Please re-upload your images.');
    }

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
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: string, name?: string) => {
    const label = name ? `"${name}"` : 'this product';
    if (confirm(`Are you sure you want to remove ${label}? This will delete it from the store.`)) {
      try {
        await deleteProduct(id);
        setIsProductModalOpen(false);
        resetProductForm();
        loadAdminData();
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to delete product');
      }
    }
  };


  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      loadAdminData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update order status');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm(`Are you sure you want to cancel order ${orderId}?`)) {
      await handleUpdateOrderStatus(orderId, 'cancelled');
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment';
      case 'payment_successful':
        return 'Payment Received';
      case 'order_sent':
        return 'Order Sent';
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
    setSizeGuideRows([]);
    setAdminSizeFilter('all');
  };

  const openEditProductModal = (product: Product) => {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDesc(product.description);
    setProductPrice(product.price.toString());
    setAdminSizeFilter('all');
    const existingImages = product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl ? [product.imageUrl] : [];
    setProductImages(existingImages);
    if (product.sizeGuideRows && product.sizeGuideRows.length > 0) {
      setSizeGuideRows(
        product.sizeGuideRows.map((r) => ({
          ...r,
          gender: r.gender || parseGenderFromSize(r.size).gender,
          size: r.gender ? r.size : parseGenderFromSize(r.size).rawSize,
        }))
      );
    } else if (product.sizes && product.sizes.length > 0) {
      setSizeGuideRows(
        product.sizes.map((s) => {
          const parsed = parseGenderFromSize(s);
          return {
            gender: parsed.gender,
            size: parsed.rawSize,
            chest: '',
            waist: '',
            length: '',
          };
        })
      );
    } else {
      setSizeGuideRows([]);
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
                  className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
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
              className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition"
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

  const orderCounts: Record<'all' | OrderStatus, number> = {
    all: orders.length,
    pending_payment: orders.filter((o) => o.status === 'pending_payment').length,
    payment_successful: orders.filter((o) => o.status === 'payment_successful').length,
    order_sent: orders.filter((o) => o.status === 'order_sent').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const filteredOrders = orders.filter((order) =>
    orderStatusFilter === 'all' ? true : order.status === orderStatusFilter
  );

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
              <span className="text-[10px] uppercase font-bold text-[rgb(155,165,130)] block">
                Peasants Revolt Running Club
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Store Status Toggle Control */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-inner">
              <div className="flex items-center gap-1.5 text-xs font-semibold pr-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isStoreClosed ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                  }`}
                />
                <span className={`hidden sm:inline ${isStoreClosed ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {isStoreClosed ? 'Store Closed' : 'Store Open'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleStoreStatus}
                disabled={togglingStore}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  isStoreClosed
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                }`}
                aria-label={isStoreClosed ? 'Reopen store' : 'Close store'}
              >
                {togglingStore ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Store size={13} />
                )}
                <span>{isStoreClosed ? 'Reopen Store' : 'Close Store'}</span>
              </button>
            </div>

            <button
              onClick={() => loadAdminData(false)}
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

      {/* Alert Banner when Store is Closed */}
      {isStoreClosed && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 text-xs">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Store is currently closed:</strong> Public storefront displays the holding page with the Instagram link. Customers cannot place new orders until reopened.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleStoreStatus}
              disabled={togglingStore}
              className="self-start sm:self-auto bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition shrink-0"
            >
              Reopen Store
            </button>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 text-xs font-extrabold border-b-2 transition ${
              activeTab === 'products'
                ? 'border-[rgb(155,165,130)] text-[rgb(82,94,62)]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Products Catalog ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 text-xs font-extrabold border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-[rgb(155,165,130)] text-[rgb(82,94,62)]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Customer Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 text-xs font-extrabold border-b-2 transition ${
              activeTab === 'events'
                ? 'border-[rgb(155,165,130)] text-[rgb(82,94,62)]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Events &amp; Tickets
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[rgb(155,165,130)] border-t-transparent rounded-full animate-spin" />
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
                className="bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition"
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
                  className="bg-[rgb(82,94,62)] text-white text-xs font-bold px-4 py-2 rounded-xl"
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
                        <span className="font-extrabold text-sm text-[rgb(82,94,62)]">
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
                          type="button"
                          onClick={() => openEditProductModal(product)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition flex items-center gap-1 border border-red-100"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'orders' ? (
          /* Orders Tab */
          <div>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Manage Customer Orders</h2>
                <p className="text-xs text-slate-500">
                  Check Monzo transfers and mark payments as received or fulfilled.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/export"
                  className="bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow flex items-center gap-2 transition"
                >
                  <Printer size={15} />
                  <span>Export for Manufacturer</span>
                  <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {orderCounts['payment_successful']}
                  </span>
                </Link>

                {orders.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  {ORDER_STATUS_FILTERS.map((filter) => {
                    const count = orderCounts[filter.id];
                    const isActive = orderStatusFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setOrderStatusFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Package size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No customer orders yet.</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Package size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-800 mb-1">No orders found</p>
                <p className="text-xs text-slate-500 mb-4">
                  There are no orders with status &ldquo;{formatStatusLabel(orderStatusFilter)}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('all')}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                >
                  Show All Orders
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isCancelled = order.status === 'cancelled';
                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border p-5 shadow-sm transition ${
                        isCancelled
                          ? 'bg-slate-100/80 border-slate-300 opacity-60'
                          : 'bg-white border-slate-200'
                      }`}
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
                          {order.batchRef && (
                            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Batch: {order.batchRef}
                            </span>
                          )}
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              order.status === 'pending_payment'
                                ? 'bg-amber-100 text-amber-800'
                                : order.status === 'payment_successful'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'order_sent'
                                ? 'bg-purple-100 text-purple-800'
                                : order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
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

                        <div className="flex flex-wrap gap-2 items-center">
                          {order.status === 'pending_payment' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'payment_successful')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
                            >
                              <CheckCircle size={14} /> Mark Payment Received
                            </button>
                          )}
                          {order.status !== 'order_sent' && order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'order_sent')}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
                            >
                              <Send size={14} /> Mark Order Sent
                            </button>
                          )}
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
                            >
                              <CheckCircle size={14} /> Mark Order Fulfilled
                            </button>
                          )}
                          {order.status !== 'cancelled' ? (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1"
                            >
                              <XCircle size={14} /> Cancel Order
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 italic flex items-center gap-1">
                              <XCircle size={13} className="text-slate-400" /> Order cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <EventsAdminPanel />
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
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] font-semibold"
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
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  placeholder="Breathable high-performance running top in club sage green."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] h-20"
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
                      ? 'border-[rgb(155,165,130)] bg-[rgba(155,165,130,0.08)] scale-[1.01]'
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
                        <Loader2 size={32} className="text-[rgb(155,165,130)] animate-spin" />
                        <span className="text-xs font-bold text-slate-700">Uploading Images...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm text-[rgb(82,94,62)] mx-auto mb-1">
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
                            <span className="absolute top-1 left-1 bg-[rgb(82,94,62)] text-white text-[8px] font-bold px-1 py-0.5 rounded shadow flex items-center gap-0.5">
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                      <Ruler size={14} className="text-[rgb(82,94,62)]" /> Product Sizes & Sizing Guide
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add Men&apos;s, Women&apos;s, and Unisex sizes and measurements in inches (in). All sizes are configured directly per item.
                    </p>
                  </div>
                </div>

                {/* Quick Add Buttons & Filter Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                    {(['all', 'men', 'women', 'unisex'] as const).map((filter) => {
                      const count =
                        filter === 'all'
                          ? sizeGuideRows.length
                          : sizeGuideRows.filter((r) => (r.gender || 'men') === filter).length;
                      const label =
                        filter === 'all'
                          ? `All (${count})`
                          : filter === 'men'
                          ? `Men's (${count})`
                          : filter === 'women'
                          ? `Women's (${count})`
                          : `Unisex (${count})`;
                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setAdminSizeFilter(filter)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            adminSizeFilter === filter
                              ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Size Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddSizeRow('men')}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus size={13} /> Add Men&apos;s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSizeRow('women')}
                      className="bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus size={13} /> Add Women&apos;s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSizeRow('unisex')}
                      className="bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus size={13} /> Add Unisex
                    </button>
                  </div>
                </div>

                {/* Interactive Table of Size Rows */}
                {sizeGuideRows.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 font-medium">
                    No sizes defined. Click &quot;Add Men&apos;s&quot;, &quot;Add Women&apos;s&quot;, or &quot;Add Unisex&quot; above to add sizes.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-32">Fit / Gender</th>
                          <th className="py-2.5 px-3 w-28">Size Label *</th>
                          <th className="py-2.5 px-3">Chest / Bust (in)</th>
                          <th className="py-2.5 px-3">Waist (in)</th>
                          <th className="py-2.5 px-3">Length / Inseam (in)</th>
                          <th className="py-2.5 px-2 text-center w-10">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sizeGuideRows.map((row, idx) => {
                          if (adminSizeFilter !== 'all' && (row.gender || 'men') !== adminSizeFilter) {
                            return null;
                          }
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <select
                                  value={row.gender || 'men'}
                                  onChange={(e) =>
                                    handleUpdateSizeRow(idx, 'gender', e.target.value as GenderFit)
                                  }
                                  className={`text-xs font-black p-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] ${
                                    (row.gender || 'men') === 'men'
                                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                                      : (row.gender || 'men') === 'women'
                                      ? 'bg-[rgb(242,245,236)] text-[rgb(82,94,62)] border-[rgb(155,165,130)]'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  <option value="men">Men&apos;s</option>
                                  <option value="women">Women&apos;s</option>
                                  <option value="unisex">Unisex</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. S, M, L"
                                  value={row.size}
                                  onChange={(e) => handleUpdateSizeRow(idx, 'size', e.target.value)}
                                  className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 uppercase focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="e.g. 38 – 40 in"
                                  value={row.chest || ''}
                                  onChange={(e) => handleUpdateSizeRow(idx, 'chest', e.target.value)}
                                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] text-slate-700"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="e.g. 32 – 34 in"
                                  value={row.waist || ''}
                                  onChange={(e) => handleUpdateSizeRow(idx, 'waist', e.target.value)}
                                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] text-slate-700"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="e.g. 27 in"
                                  value={row.length || ''}
                                  onChange={(e) => handleUpdateSizeRow(idx, 'length', e.target.value)}
                                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] text-slate-700"
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                {editingProductId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingProductId, productName)}
                    className="w-1/3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 border border-red-200"
                  >
                    <Trash2 size={14} /> Remove Item
                  </button>
                )}
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className={`${editingProductId ? 'w-2/3' : 'w-full'} bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition`}
                >
                  {uploadingImage ? 'Uploading Image...' : editingProductId ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
