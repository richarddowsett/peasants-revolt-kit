'use client';

import React, { useState, useEffect } from 'react';
import StoreHeader from '@/components/StoreHeader';
import StoreLoginScreen from '@/components/StoreLoginScreen';
import { fetchProducts, createOrder } from '@/lib/api';
import { Product } from '@/domain/models/Product';
import { CartItem } from '@/domain/models/Cart';
import { ShoppingBag, Plus, Trash2, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function StoreCatalogPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | { uid: string; email?: string | null; displayName?: string | null } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});

  // Checkout Form State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!auth) {
      setAuthChecking(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
      if (user) {
        if (user.displayName) setCustomerName(user.displayName);
        if (user.email) setCustomerEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    async function loadData() {
      setLoading(true);
      try {
        const items = await fetchProducts(false); // Fetch published products from API
        setProducts(items);

        // Default selected sizes & images
        const defaultSizes: Record<string, string> = {};
        const defaultImages: Record<string, string> = {};
        items.forEach((p: Product) => {
          if (p.sizes && p.sizes.length > 0) {
            defaultSizes[p.id] = p.sizes[0];
          }
          const mainImg = p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : (p.imageUrl || '/logo.png');
          defaultImages[p.id] = mainImg;
        });
        setSelectedSizes(defaultSizes);
        setSelectedImages(defaultImages);
      } catch (err) {
        console.error('Failed to load products from API:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const handleAddToCart = (product: Product) => {
    const chosenSize = selectedSizes[product.id] || (product.sizes ? product.sizes[0] : 'M');
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.size === chosenSize
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          size: chosenSize,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (productId: string, size: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.size === size)));
  };

  const handleUpdateQuantity = (productId: string, size: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.size === size) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleProceedToCheckout = () => {
    const user = auth?.currentUser;
    if (user?.email) setCustomerEmail(user.email);
    if (user?.displayName) setCustomerName(user.displayName);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const user = auth?.currentUser;
      const order = await createOrder({
        userName: customerName,
        userEmail: customerEmail,
        userId: user?.uid,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          size: item.size,
          quantity: item.quantity,
        })),
      });

      setCreatedOrder(order);
      setCart([]); // Clear cart
    } catch (err: any) {
      alert(err.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[rgb(202,88,46)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <StoreHeader cartItemCount={0} onOpenCart={() => {}} />
        <StoreLoginScreen onLoginSuccess={() => setCurrentUser({ uid: 'guest-runner', email: 'guest@peasants.store', displayName: 'Guest Runner' })} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StoreHeader cartItemCount={totalCartCount} onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Banner */}
      <section className="bg-[rgb(202,88,46)] text-white py-12 px-4 shadow-md bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.12)_0%,transparent_45%)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3">
              Official Gear & Kit
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
              Peasants Revolt Running Club Store
            </h1>
            <p className="text-white/90 text-sm max-w-xl">
              Order your official club tops and kit. Select your items, review your basket, and complete your order via Monzo transfer!
            </p>
          </div>
        </div>
      </section>

      {/* Main Catalog Content */}
      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 w-full">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[rgb(202,88,46)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-12">
            <div className="w-16 h-16 bg-[rgba(202,88,46,0.1)] text-[rgb(202,88,46)] rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Products Available</h2>
            <p className="text-sm text-slate-500">
              There are currently no products available in the store catalog. Please check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                {/* Product Image & Thumbnail Bar */}
                <div className="relative bg-slate-100 p-4 flex flex-col items-center justify-center">
                  <div className="h-56 w-full flex items-center justify-center">
                    <img
                      src={selectedImages[product.id] || product.imageUrl || '/logo.png'}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition-all duration-200"
                    />
                  </div>
                  <span className="absolute top-3 right-3 bg-white/90 font-black text-slate-900 text-sm px-3 py-1 rounded-full shadow-sm">
                    £{product.price.toFixed(2)}
                  </span>

                  {/* Multi-image thumbnail selector */}
                  {product.imageUrls && product.imageUrls.length > 1 && (
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto max-w-full px-2 py-1 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200">
                      {product.imageUrls.map((imgUrl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setSelectedImages((prev) => ({ ...prev, [product.id]: imgUrl }))
                          }
                          className={`w-8 h-8 rounded-lg border overflow-hidden p-0.5 transition ${
                            (selectedImages[product.id] || product.imageUrl) === imgUrl
                              ? 'border-[rgb(202,88,46)] ring-2 ring-[rgb(202,88,46)]/20'
                              : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{product.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {product.description || 'Official club running gear.'}
                    </p>
                  </div>

                  <div>
                    {/* Size Selector */}
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="mb-4">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                          Select Size
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {product.sizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() =>
                                setSelectedSizes((prev) => ({ ...prev, [product.id]: size }))
                              }
                              className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                                selectedSizes[product.id] === size
                                  ? 'bg-[rgb(202,88,46)] text-white border-[rgb(202,88,46)]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add to Basket Button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Plus size={16} /> Add to Basket
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[rgb(202,88,46)]" /> Your Basket
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">Your basket is empty.</p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={`${item.productId}-${item.size}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.productName}</h4>
                        <p className="text-[11px] text-slate-500">
                          Size: <span className="font-bold text-slate-700">{item.size}</span> | £
                          {item.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Qty Controls */}
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs">
                          <button
                            onClick={() => handleUpdateQuantity(item.productId, item.size, -1)}
                            className="text-slate-500 hover:text-slate-900 font-bold"
                          >
                            -
                          </button>
                          <span className="font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.productId, item.size, 1)}
                            className="text-slate-500 hover:text-slate-900 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.productId, item.size)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-slate-500 font-medium">Subtotal</span>
                  <span className="text-xl font-extrabold text-slate-900">£{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white font-bold text-sm py-3.5 rounded-2xl shadow transition"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout & Monzo Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {!createdOrder ? (
              <>
                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>

                <h3 className="text-xl font-extrabold text-slate-900 mb-1">Confirm Order</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Enter your details to generate your order reference and Monzo transfer link.
                </p>

                <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Smith"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Your Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(202,88,46)]"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 mb-2">Order Summary</h4>
                    {cart.map((i) => (
                      <div key={`${i.productId}-${i.size}`} className="flex justify-between text-xs py-1 text-slate-600">
                        <span>{i.quantity}x {i.productName} ({i.size})</span>
                        <span className="font-bold">£{(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                      <span>Total</span>
                      <span>£{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[rgb(202,88,46)] hover:bg-[rgb(165,68,32)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? 'Creating Order...' : 'Generate Monzo Payment Link'}
                  </button>
                </form>
              </>
            ) : (
              /* Order Created & Monzo Link Modal */
              <div className="text-center py-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Order Placed!</h3>
                <p className="text-xs font-bold text-[rgb(202,88,46)] mb-4">
                  Order Reference: <span className="font-mono text-sm underline">{createdOrder.id}</span>
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left text-xs text-amber-900 mb-6 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldCheck size={16} /> Important Monzo Payment Step:
                  </p>
                  <p>
                    1. Click the button below to open the Monzo payment link for <strong>£{createdOrder.totalAmount.toFixed(2)}</strong>.
                  </p>
                  <p>
                    2. In the Monzo transfer note, please include your Order Reference: <strong className="font-mono">{createdOrder.id}</strong>.
                  </p>
                  <p>
                    3. Once received, the club organiser will mark your order as <strong>Payment Successful</strong> in the system!
                  </p>
                </div>

                <a
                  href={createdOrder.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#ff4d4d] hover:bg-[#e63939] text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow flex items-center justify-center gap-2 transition mb-3"
                >
                  Pay £{createdOrder.totalAmount.toFixed(2)} via Monzo <ExternalLink size={16} />
                </a>

                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setCreatedOrder(null);
                    router.push('/store/orders');
                  }}
                  className="text-xs text-slate-500 font-bold hover:underline"
                >
                  View My Order Status &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
