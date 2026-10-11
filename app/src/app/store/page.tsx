'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import StoreLoginScreen from '@/components/StoreLoginScreen';
import { fetchProducts, createOrder } from '@/lib/api';
import { Product, GenderFit, SizeGuideRow } from '@/domain/models/Product';
import { CartItem } from '@/domain/models/Cart';
import { ShoppingBag, Plus, Trash2, Check, ExternalLink, ShieldCheck, Ruler, ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, RotateCcw, AlertCircle, LogIn, UserCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  SIZE_GUIDE_TEMPLATES,
  formatSizeMeasurement,
  categorizeProductSizes,
  parseGenderFromSize,
  formatFullSizeLabel,
} from '@/domain/models/SizeGuide';

export default function StoreCatalogPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartInitialized, setCartInitialized] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedFits, setSelectedFits] = useState<Record<string, GenderFit>>({});
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});

  // Size Guide Modal State
  const [sizeGuideProduct, setSizeGuideProduct] = useState<Product | null>(null);
  const [sizeGuideFit, setSizeGuideFit] = useState<GenderFit | 'all'>('men');
  const [sizeGuideUnit, setSizeGuideUnit] = useState<'cm' | 'in'>('cm');

  // Image Zoom Lightbox State
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null);
  const [zoomImageIndex, setZoomImageIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const openZoomModal = (product: Product, imgUrl?: string) => {
    const images = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl || '/logo.png'];
    const selectedUrl = imgUrl || selectedImages[product.id] || product.imageUrl || '/logo.png';
    const index = images.indexOf(selectedUrl);
    setZoomProduct(product);
    setZoomImageIndex(index >= 0 ? index : 0);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handleCloseZoom = useCallback(() => {
    setZoomProduct(null);
    handleResetZoom();
  }, []);

  // Listen for Escape key to exit image zoom mode, and arrow keys to navigate images
  useEffect(() => {
    if (!zoomProduct) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        setZoomProduct(null);
        handleResetZoom();
      } else if (e.key === 'ArrowLeft') {
        const images = zoomProduct.imageUrls && zoomProduct.imageUrls.length > 0
          ? zoomProduct.imageUrls
          : [zoomProduct.imageUrl || '/logo.png'];
        if (images.length > 1) {
          e.preventDefault();
          setZoomImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          handleResetZoom();
        }
      } else if (e.key === 'ArrowRight') {
        const images = zoomProduct.imageUrls && zoomProduct.imageUrls.length > 0
          ? zoomProduct.imageUrls
          : [zoomProduct.imageUrl || '/logo.png'];
        if (images.length > 1) {
          e.preventDefault();
          setZoomImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          handleResetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoomProduct]);

  // Listen for Escape key to exit Size Guide modal
  useEffect(() => {
    if (!sizeGuideProduct) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setSizeGuideProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sizeGuideProduct]);

  // Checkout Form State
  // Checkout Form State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'login'>('guest');
  const [checkoutLoginEmail, setCheckoutLoginEmail] = useState<string>('');
  const [checkoutLoginPassword, setCheckoutLoginPassword] = useState<string>('');
  const [checkoutLoginError, setCheckoutLoginError] = useState<string>('');
  const [checkoutLoginLoading, setCheckoutLoginLoading] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('prrc_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (err) {
      console.warn('Failed to load cart from localStorage:', err);
    } finally {
      setCartInitialized(true);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    if (!cartInitialized) return;
    try {
      if (cart.length === 0) {
        localStorage.removeItem('prrc_cart');
      } else {
        localStorage.setItem('prrc_cart', JSON.stringify(cart));
      }
    } catch (err) {
      console.warn('Failed to save cart to localStorage:', err);
    }
  }, [cart, cartInitialized]);

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
        setCheckoutMode('guest');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load products unconditionally on mount
  useEffect(() => {
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
  }, []);

  const handleAddToCart = (product: Product) => {
    const { men, women, unisex } = categorizeProductSizes(
      product.sizes,
      product.sizeGuideRows
    );
    const fit = selectedFits[product.id] || (men.length > 0 ? 'men' : women.length > 0 ? 'women' : 'unisex');
    const availableItems = fit === 'men' ? men : fit === 'women' ? women : unisex;
    const defaultFullSize = availableItems[0]?.fullSize || (product.sizes ? product.sizes[0] : 'M');
    const chosenSize = selectedSizes[product.id] || defaultFullSize;
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
    setCheckoutMode('guest');
    setCheckoutLoginError('');
    setCheckoutError('');
    setIsCheckoutOpen(true);
  };

  const handleCheckoutLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoginError('');
    setCheckoutError('');
    if (!checkoutLoginEmail || !checkoutLoginPassword) {
      setCheckoutLoginError('Please enter both email address and password.');
      return;
    }
    if (!auth) {
      setCheckoutLoginError('Authentication service not available.');
      return;
    }
    setCheckoutLoginLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, checkoutLoginEmail, checkoutLoginPassword);
      if (userCredential.user) {
        if (userCredential.user.displayName) setCustomerName(userCredential.user.displayName);
        if (userCredential.user.email) setCustomerEmail(userCredential.user.email);
      }
      setCheckoutMode('guest');
    } catch (err: any) {
      console.error('Checkout login error:', err);
      let msg = err.message || 'Login failed.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Invalid email or password.';
      }
      setCheckoutLoginError(msg);
    } finally {
      setCheckoutLoginLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim();

    if (!trimmedName) {
      setCheckoutError('Please enter your full name.');
      return;
    }
    if (!trimmedEmail) {
      setCheckoutError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setCheckoutError('Please enter a valid email address.');
      return;
    }
    if (cart.length === 0) {
      setCheckoutError('Your basket is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth?.currentUser;
      const order = await createOrder({
        userName: trimmedName,
        userEmail: trimmedEmail,
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
      try {
        localStorage.removeItem('prrc_cart');
        if (!user) {
          localStorage.setItem(
            'prrc_last_guest_order',
            JSON.stringify({
              orderRef: order.id,
              email: order.userEmail,
            })
          );
        }
      } catch (_) {}
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StoreHeader
        cartItemCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-[rgb(78,88,60)] via-[rgb(55,64,42)] to-slate-900 text-white py-12 px-4 shadow-md bg-[radial-gradient(circle_at_15%_15%,rgba(155,165,130,0.25)_0%,transparent_50%)] border-b border-[rgb(155,165,130)]/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-[rgb(155,165,130)] text-slate-900 text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full inline-block mb-3 shadow-sm">
              Official Gear & Kit
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
              Peasants Revolt Running Club Store
            </h1>
            <p className="text-slate-200 text-sm max-w-xl">
              Order your official club tops and kit. Select your items, review your basket, and complete your order via Monzo transfer!
            </p>
          </div>
        </div>
      </section>

      {/* Main Catalog Content */}
      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 w-full">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[rgb(155,165,130)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-12">
            <div className="w-16 h-16 bg-[rgba(155,165,130,0.15)] text-[rgb(82,94,62)] rounded-full flex items-center justify-center mx-auto mb-4">
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
                <div
                  className="relative bg-slate-100 p-4 flex flex-col items-center justify-center group cursor-pointer"
                  onClick={() => openZoomModal(product)}
                >
                  <div className="h-56 w-full flex items-center justify-center">
                    <img
                      src={selectedImages[product.id] || product.imageUrl || '/logo.png'}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Zoom Inspect Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openZoomModal(product);
                    }}
                    className="absolute top-3 left-3 bg-white/90 hover:bg-white text-slate-700 hover:text-[rgb(82,94,62)] px-2.5 py-1 rounded-full shadow-sm transition flex items-center gap-1 text-[11px] font-bold border border-slate-200"
                    title="Click to zoom & inspect photo"
                  >
                    <ZoomIn size={13} />
                    <span>Zoom</span>
                  </button>

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
                              ? 'border-[rgb(155,165,130)] ring-2 ring-[rgb(155,165,130)]/40'
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
                    {/* Size & Fit Selector */}
                    {product.sizes && product.sizes.length > 0 && (() => {
                      const { men, women, unisex, hasGenderSplit } = categorizeProductSizes(
                        product.sizes,
                        product.sizeGuideRows
                      );

                      // Available fits
                      const availableFits: GenderFit[] = [];
                      if (men.length > 0) availableFits.push('men');
                      if (women.length > 0) availableFits.push('women');
                      if (unisex.length > 0 || availableFits.length === 0) availableFits.push('unisex');

                      const currentFit = selectedFits[product.id] || availableFits[0];
                      const activeSizes =
                        currentFit === 'men' ? men : currentFit === 'women' ? women : unisex;
                      const chosenFullSize =
                        selectedSizes[product.id] || activeSizes[0]?.fullSize;

                      return (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block">
                              Select Size
                            </label>
                            {product.sizeGuideCategory !== 'none' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSizeGuideProduct(product);
                                  setSizeGuideFit(currentFit);
                                }}
                                className="text-[11px] font-bold text-[rgb(82,94,62)] hover:underline flex items-center gap-1"
                              >
                                <Ruler size={12} /> Sizing Guide
                              </button>
                            )}
                          </div>

                          {/* Fit Selector when product has Men's and Women's options */}
                          {hasGenderSplit && (
                            <div className="flex items-center gap-1.5 mb-2.5 bg-slate-100 p-1 rounded-xl">
                              {availableFits.map((fit) => {
                                const isFitActive = currentFit === fit;
                                const fitLabel =
                                  fit === 'men'
                                    ? "Men's"
                                    : fit === 'women'
                                    ? "Women's"
                                    : 'Unisex';
                                return (
                                  <button
                                    key={fit}
                                    type="button"
                                    onClick={() => {
                                      setSelectedFits((prev) => ({ ...prev, [product.id]: fit }));
                                      // Select the corresponding size for this fit
                                      const nextSizes =
                                        fit === 'men' ? men : fit === 'women' ? women : unisex;
                                      if (nextSizes.length > 0) {
                                        setSelectedSizes((prev) => ({
                                          ...prev,
                                          [product.id]: nextSizes[0].fullSize,
                                        }));
                                      }
                                    }}
                                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                                      isFitActive
                                        ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {fitLabel}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Size Pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {activeSizes.map((item) => {
                              const isSelected = chosenFullSize === item.fullSize;
                              return (
                                <button
                                  key={item.fullSize}
                                  type="button"
                                  onClick={() =>
                                    setSelectedSizes((prev) => ({
                                      ...prev,
                                      [product.id]: item.fullSize,
                                    }))
                                  }
                                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                                    isSelected
                                      ? 'bg-[rgb(82,94,62)] text-white border-[rgb(82,94,62)] shadow-sm'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                                  }`}
                                >
                                  {item.rawSize}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Add to Basket Button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
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

      <StoreFooter />

      {/* Cart Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[rgb(82,94,62)]" /> Your Basket
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
                  className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-sm py-3.5 rounded-2xl shadow transition"
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
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setCheckoutMode('guest');
                    setCheckoutLoginError('');
                    setCheckoutError('');
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>

                {currentUser ? (
                  // Logged-in Member Checkout
                  <>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">Confirm Order</h3>
                    <div className="bg-[rgb(242,245,236)] border border-[rgb(155,165,130)]/40 p-3 rounded-2xl mb-4 flex items-center justify-between text-xs text-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-[rgb(82,94,62)] shrink-0" />
                        <span className="truncate">
                          Signed in as <strong>{currentUser.displayName || currentUser.email}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (auth) await signOut(auth);
                        }}
                        className="text-[11px] text-slate-500 hover:text-red-600 underline font-medium shrink-0 ml-2"
                      >
                        Sign out
                      </button>
                    </div>

                    <form onSubmit={handleCreateOrder} className="space-y-4">
                      {checkoutError && (
                        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0 text-red-500" />
                          <span>{checkoutError}</span>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alex Smith"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
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
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
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
                        className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition flex justify-center items-center gap-2"
                      >
                        {isSubmitting ? 'Creating Order...' : 'Generate Monzo Payment Link'}
                      </button>
                    </form>
                  </>
                ) : checkoutMode === 'login' ? (
                  // Sign In Mode during Checkout
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">Sign In to Account</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Sign in with your member account, or switch back to guest checkout.
                    </p>

                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutMode('guest');
                          setCheckoutLoginError('');
                          setCheckoutError('');
                        }}
                        className="text-xs text-[rgb(82,94,62)] font-bold hover:underline flex items-center gap-1"
                      >
                        &larr; Continue as guest instead
                      </button>
                    </div>

                    {checkoutLoginError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0 text-red-500" />
                        <span>{checkoutLoginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCheckoutLogin} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="runner@peasants.store"
                          value={checkoutLoginEmail}
                          onChange={(e) => setCheckoutLoginEmail(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={checkoutLoginPassword}
                          onChange={(e) => setCheckoutLoginPassword(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={checkoutLoginLoading}
                        className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition flex justify-center items-center gap-2"
                      >
                        {checkoutLoginLoading ? 'Signing In...' : 'Sign In & Proceed'}
                      </button>
                    </form>
                  </div>
                ) : (
                  // Guest Checkout Form (Default)
                  <>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">Checkout as Guest</h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Enter your name and email to place your kit order. No account required.
                    </p>

                    <div className="bg-slate-100 p-3 rounded-2xl mb-4 flex items-center justify-between text-xs text-slate-700">
                      <span>Already a club member?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutMode('login');
                          setCheckoutLoginError('');
                          setCheckoutError('');
                        }}
                        className="text-[rgb(82,94,62)] font-bold hover:underline ml-2"
                        aria-label="Sign in to member account"
                      >
                        Sign in
                      </button>
                    </div>

                    {checkoutError && (
                      <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0 text-red-500" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateOrder} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alex Smith"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
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
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
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
                        className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3.5 rounded-xl shadow transition flex justify-center items-center gap-2"
                      >
                        {isSubmitting ? 'Creating Order...' : 'Generate Monzo Payment Link'}
                      </button>
                    </form>
                  </>
                )}
              </>
            ) : (
              /* Order Created & Monzo Link Modal */
              <div className="text-center py-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Order Placed!</h3>
                <p className="text-xs font-bold text-[rgb(82,94,62)] mb-4">
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

                {currentUser ? (
                  <button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setCreatedOrder(null);
                      router.push('/store/orders');
                    }}
                    className="text-xs text-slate-500 font-bold hover:underline block mx-auto"
                  >
                    View My Order Status &rarr;
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-500">
                      We&apos;ve recorded your order reference for <strong>{createdOrder.userEmail}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const targetRef = createdOrder.id;
                        const targetEmail = createdOrder.userEmail;
                        setIsCheckoutOpen(false);
                        setCreatedOrder(null);
                        router.push(`/store/orders?ref=${encodeURIComponent(targetRef)}&email=${encodeURIComponent(targetEmail)}`);
                      }}
                      className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm block"
                    >
                      Track Order Status &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setCreatedOrder(null);
                      }}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition"
                    >
                      Back to Store
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Login Modal (triggered from StoreHeader) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <StoreLoginScreen
              onClose={() => setIsLoginModalOpen(false)}
              onSuccess={() => setIsLoginModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Sizing Guide Modal */}
      {sizeGuideProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSizeGuideProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              &times;
            </button>

            <div className="flex items-center gap-2 text-[rgb(82,94,62)] mb-1">
              <Ruler size={20} />
              <span className="text-xs uppercase font-extrabold tracking-wider">
                Official Size Guide
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              {sizeGuideProduct.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {SIZE_GUIDE_TEMPLATES[sizeGuideProduct.sizeGuideCategory || 'unisex_vest']?.description ||
                'Garment measurements for PRRC kit.'}
            </p>

            {/* Unit Switcher */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl mb-4">
              <span className="text-xs font-bold text-slate-700 pl-2">Measurement Unit:</span>
              <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSizeGuideUnit('cm')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    sizeGuideUnit === 'cm'
                      ? 'bg-[rgb(82,94,62)] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Centimeters (cm)
                </button>
                <button
                  type="button"
                  onClick={() => setSizeGuideUnit('in')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    sizeGuideUnit === 'in'
                      ? 'bg-[rgb(82,94,62)] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inches (in)
                </button>
              </div>
            </div>

            {/* Size Table */}
            {(() => {
              const selectedSize = selectedSizes[sizeGuideProduct.id];
              const customRows = sizeGuideProduct.sizeGuideRows || [];
              const hasCustomRows = customRows.length > 0;

              if (hasCustomRows) {
                const menRows = customRows.filter(
                  (r) => (r.gender || parseGenderFromSize(r.size).gender) === 'men'
                );
                const womenRows = customRows.filter(
                  (r) => (r.gender || parseGenderFromSize(r.size).gender) === 'women'
                );
                const unisexRows = customRows.filter(
                  (r) => (r.gender || parseGenderFromSize(r.size).gender) === 'unisex'
                );
                const hasGenderSplit = menRows.length > 0 && womenRows.length > 0;

                const renderTable = (rows: SizeGuideRow[], title?: string, gender: GenderFit = 'unisex') => (
                  <div key={title || gender} className="mb-4">
                    {title && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                          {title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          All measurements in {sizeGuideUnit}
                        </span>
                      </div>
                    )}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Size</th>
                            <th className="py-3 px-4">Chest / Bust ({sizeGuideUnit})</th>
                            <th className="py-3 px-4">Waist ({sizeGuideUnit})</th>
                            <th className="py-3 px-4">Length / Inseam ({sizeGuideUnit})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((row, idx) => {
                            const fullSize = formatFullSizeLabel(row.size, row.gender || gender);
                            const isSelected = selectedSize === fullSize || selectedSize === row.size;
                            return (
                              <tr
                                key={`${row.size}-${idx}`}
                                onClick={() => {
                                  setSelectedSizes((prev) => ({
                                    ...prev,
                                    [sizeGuideProduct.id]: fullSize,
                                  }));
                                  setSelectedFits((prev) => ({
                                    ...prev,
                                    [sizeGuideProduct.id]: row.gender || gender,
                                  }));
                                }}
                                className={`transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-[rgb(242,245,236)] font-bold text-[rgb(82,94,62)]'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <td className="py-3 px-4 font-extrabold flex items-center gap-1.5">
                                  <span>{row.size}</span>
                                  {isSelected && (
                                    <span className="bg-[rgb(155,165,130)] text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full font-black shadow-xs">
                                      Selected
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4">{formatSizeMeasurement(row.chest, sizeGuideUnit)}</td>
                                <td className="py-3 px-4">{formatSizeMeasurement(row.waist, sizeGuideUnit)}</td>
                                <td className="py-3 px-4">{formatSizeMeasurement(row.length, sizeGuideUnit)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );

                return (
                  <div>
                    {/* Separate Gender Tabs when both Men and Women sizes exist */}
                    {hasGenderSplit && (
                      <div className="flex items-center gap-1.5 mb-4 bg-slate-100 p-1 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setSizeGuideFit('men')}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                            sizeGuideFit === 'men'
                              ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Men&apos;s Sizing ({menRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSizeGuideFit('women')}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                            sizeGuideFit === 'women'
                              ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Women&apos;s Sizing ({womenRows.length})
                        </button>
                        {unisexRows.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSizeGuideFit('unisex')}
                            className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                              sizeGuideFit === 'unisex'
                                ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Unisex
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSizeGuideFit('all')}
                          className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                            sizeGuideFit === 'all'
                              ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          View Both
                        </button>
                      </div>
                    )}

                    {/* Render table based on active tab */}
                    {hasGenderSplit ? (
                      <>
                        {(sizeGuideFit === 'men' || sizeGuideFit === 'all') &&
                          renderTable(menRows, hasGenderSplit && sizeGuideFit === 'all' ? "Men's Sizing" : undefined, 'men')}
                        {(sizeGuideFit === 'women' || sizeGuideFit === 'all') &&
                          renderTable(womenRows, hasGenderSplit && sizeGuideFit === 'all' ? "Women's Sizing" : undefined, 'women')}
                        {sizeGuideFit === 'unisex' &&
                          renderTable(unisexRows, undefined, 'unisex')}
                      </>
                    ) : (
                      renderTable(customRows, undefined, 'unisex')
                    )}
                  </div>
                );
              }

              const template =
                SIZE_GUIDE_TEMPLATES[sizeGuideProduct.sizeGuideCategory || 'unisex_vest'] ||
                SIZE_GUIDE_TEMPLATES['unisex_vest'];

              return (
                <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Chest ({sizeGuideUnit})</th>
                        <th className="py-3 px-4">Waist ({sizeGuideUnit})</th>
                        <th className="py-3 px-4">Length ({sizeGuideUnit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {template.measurements.map((m) => {
                        const isSelected = selectedSize === m.size;
                        return (
                          <tr
                            key={m.size}
                            onClick={() => {
                              setSelectedSizes((prev) => ({
                                ...prev,
                                [sizeGuideProduct.id]: m.size,
                              }));
                            }}
                            className={`transition cursor-pointer ${
                              isSelected
                                ? 'bg-[rgb(242,245,236)] font-bold text-[rgb(82,94,62)]'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <td className="py-3 px-4 font-extrabold flex items-center gap-1.5">
                              <span>{m.size}</span>
                              {isSelected && (
                                <span className="bg-[rgb(155,165,130)] text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                  Selected
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {sizeGuideUnit === 'cm' ? m.chestCm : m.chestIn}
                            </td>
                            <td className="py-3 px-4">
                              {sizeGuideUnit === 'cm' ? m.waistCm : m.waistIn}
                            </td>
                            <td className="py-3 px-4">
                              {sizeGuideUnit === 'cm'
                                ? m.lengthCm || 'N/A'
                                : m.lengthIn || 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600">
              💡 <strong>Fit Tip:</strong> Measure around the fullest part of your chest, keeping the tape horizontal. If you are between sizes, we recommend sizing up for a relaxed training fit or sizing down for a race fit.
            </div>
          </div>
        </div>
      )}

      {/* Interactive Image Zoom Lightbox Modal */}
      {zoomProduct && (() => {
        const images = zoomProduct.imageUrls && zoomProduct.imageUrls.length > 0 ? zoomProduct.imageUrls : [zoomProduct.imageUrl || '/logo.png'];
        const currentImage = images[zoomImageIndex] || images[0];

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseZoom();
              }
            }}
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto w-full pt-2 px-2 text-white">
              <div>
                <h4 className="font-black text-sm text-white truncate max-w-[200px] sm:max-w-xs">
                  {zoomProduct.name}
                </h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Photo {zoomImageIndex + 1} of {images.length} • Zoom: {Math.round(zoomScale * 100)}%
                </span>
              </div>

              {/* Zoom Action Controls */}
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-2xl shadow-lg">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 1}
                  title="Zoom Out (-)"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <ZoomOut size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom (100%)"
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <RotateCcw size={14} />
                  <span>{Math.round(zoomScale * 100)}%</span>
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 4}
                  title="Zoom In (+)"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <ZoomIn size={18} />
                </button>

                <div className="h-4 w-px bg-slate-800 mx-1" />

                <button
                  type="button"
                  onClick={handleCloseZoom}
                  title="Exit image (Esc)"
                  className="p-2 px-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <span className="text-base font-bold leading-none">&times;</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-300">
                    Esc
                  </span>
                </button>
              </div>
            </div>

            {/* Main Image Viewport & Pan Canvas */}
            <div
              className={`relative flex-1 my-4 flex items-center justify-center overflow-hidden rounded-3xl ${
                zoomScale > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              }`}
              onClick={(e) => {
                if (e.target === e.currentTarget && zoomScale <= 1) {
                  handleCloseZoom();
                }
              }}
              onMouseDown={(e) => {
                if (zoomScale > 1) {
                  setIsPanning(true);
                  setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                }
              }}
              onMouseMove={(e) => {
                if (isPanning && zoomScale > 1) {
                  setPanOffset({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                  });
                }
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              onWheel={(e) => {
                if (e.deltaY < 0) handleZoomIn();
                else handleZoomOut();
              }}
            >
              {/* Previous Photo Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                    handleResetZoom();
                  }}
                  title="Previous Photo (Left Arrow)"
                  className="absolute left-4 z-10 p-3 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white border border-slate-700/50 shadow-lg transition backdrop-blur-sm"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Zoomable Image */}
              <div
                className="w-full h-full flex items-center justify-center p-4 transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                }}
              >
                <img
                  src={currentImage}
                  alt={zoomProduct.name}
                  className="max-h-[75vh] max-w-full object-contain drop-shadow-2xl pointer-events-none rounded-2xl"
                />
              </div>

              {/* Next Photo Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                    handleResetZoom();
                  }}
                  title="Next Photo (Right Arrow)"
                  className="absolute right-4 z-10 p-3 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white border border-slate-700/50 shadow-lg transition backdrop-blur-sm"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Bottom Bar: Thumbnails & Instruction */}
            <div className="flex flex-col items-center gap-3 pb-2 max-w-5xl mx-auto w-full">
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto max-w-full px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800">
                  {images.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setZoomImageIndex(idx);
                        handleResetZoom();
                      }}
                      className={`w-12 h-12 rounded-xl overflow-hidden border p-0.5 transition ${
                        zoomImageIndex === idx
                          ? 'border-[rgb(155,165,130)] ring-2 ring-[rgb(155,165,130)]/50 opacity-100'
                          : 'border-slate-800 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-400 font-medium">
                {zoomScale > 1
                  ? '🖱️ Click and drag to pan around image details • Press Esc to exit'
                  : '💡 Press Esc to exit • Use mouse wheel or +/- to zoom • Arrow keys for next/prev'}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
