'use client';

import React, { useState, useEffect } from 'react';
import { FirestoreProductRepositoryAdapter } from '@/adapters/db/FirestoreProductRepositoryAdapter';
import { FirestoreOrderRepositoryAdapter } from '@/adapters/db/FirestoreOrderRepositoryAdapter';
import { PasswordAdminAuthAdapter } from '@/adapters/auth/PasswordAdminAuthAdapter';
import { FirebaseStorageAdapter } from '@/adapters/storage/FirebaseStorageAdapter';
import { ManageProductUseCase } from '@/domain/usecases/ManageProductUseCase';
import { GetProductsUseCase } from '@/domain/usecases/GetProductsUseCase';
import { UpdateOrderStatusUseCase } from '@/domain/usecases/UpdateOrderStatusUseCase';
import { GetUserOrdersUseCase } from '@/domain/usecases/GetUserOrdersUseCase';
import { Product } from '@/domain/models/Product';
import { Order, OrderStatus } from '@/domain/models/Order';
import { Lock, Plus, Trash2, Edit3, CheckCircle, Package, ArrowLeft, RefreshCw, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminCMSPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
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
  const [productImage, setProductImage] = useState<string>('/logo.png');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [productSizesStr, setProductSizesStr] = useState<string>('XS, S, M, L, XL, XXL');
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Hexagonal Adapters & Use Cases
  const productRepo = new FirestoreProductRepositoryAdapter();
  const orderRepo = new FirestoreOrderRepositoryAdapter();
  const authAdapter = new PasswordAdminAuthAdapter();
  const storageAdapter = new FirebaseStorageAdapter();

  const getProductsUseCase = new GetProductsUseCase(productRepo);
  const manageProductUseCase = new ManageProductUseCase(productRepo);
  const getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepo);
  const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepo);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAdminData();
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await authAdapter.verifyAdminPassword(passwordInput);
    if (isValid) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setAuthError('');
      loadAdminData();
    } else {
      setAuthError('Incorrect admin password.');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    const [allProds, allOrds] = await Promise.all([
      getProductsUseCase.execute(false),
      getUserOrdersUseCase.getAllOrders(),
    ]);
    setProducts(allProds);
    setOrders(allOrds);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const downloadUrl = await storageAdapter.uploadImage(file, 'product-images');
      setProductImage(downloadUrl);
    } catch (err) {
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(productPrice);
    if (isNaN(priceNum) || priceNum <= 0) return alert('Enter a valid price');

    const sizes = productSizesStr
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    await manageProductUseCase.saveProduct({
      id: editingProductId || undefined,
      name: productName,
      description: productDesc,
      price: priceNum,
      imageUrl: productImage || '/logo.png',
      sizes: sizes.length > 0 ? sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      isPublished,
    });

    setIsProductModalOpen(false);
    resetProductForm();
    loadAdminData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await manageProductUseCase.deleteProduct(id);
      loadAdminData();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatusUseCase.execute(orderId, status);
    loadAdminData();
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductDesc('');
    setProductPrice('25.00');
    setProductImage('/logo.png');
    setProductSizesStr('XS, S, M, L, XL, XXL');
    setIsPublished(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDesc(product.description);
    setProductPrice(product.price.toString());
    setProductImage(product.imageUrl);
    setProductSizesStr(product.sizes ? product.sizes.join(', ') : 'XS, S, M, L, XL, XXL');
    setIsPublished(product.isPublished);
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
              <input
                type="password"
                required
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
              />
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
                      <span
                        className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                          product.isPublished
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {product.isPublished ? 'Published' : 'Draft'}
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
                          {order.status}
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-4">
              {editingProductId ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Club Running Vest"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                />
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

              {/* Image Upload Box */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Image</label>
                
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    {uploadingImage ? (
                      <Loader2 size={24} className="text-[rgb(202,88,46)] animate-spin" />
                    ) : (
                      <img
                        src={productImage || '/logo.png'}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl shadow-sm inline-flex items-center gap-2 transition">
                      <Upload size={14} /> Upload Image File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">Upload PNG, JPG, or WebP kit image.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sizes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={productSizesStr}
                    onChange={(e) => setProductSizesStr(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pub"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-[rgb(202,88,46)] focus:ring-[rgb(202,88,46)]"
                />
                <label htmlFor="pub" className="text-xs font-bold text-slate-700">
                  Publish item immediately in store
                </label>
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
