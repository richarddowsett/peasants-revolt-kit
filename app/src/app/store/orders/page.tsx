'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreLoginScreen from '@/components/StoreLoginScreen';
import { fetchOrders, lookupOrder } from '@/lib/api';
import StoreFooter from '@/components/StoreFooter';
import { Order, OrderStatus } from '@/domain/models/Order';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Package,
  Clock,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Send,
  Search,
  UserCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

const ORDER_STATUS_FILTERS: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending_payment', label: 'Pending Payment' },
  { id: 'payment_successful', label: 'Payment Received' },
  { id: 'order_sent', label: 'Order Sent' },
  { id: 'completed', label: 'Order Fulfilled' },
  { id: 'cancelled', label: 'Cancelled' },
];

function UserOrdersContent() {
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Guest lookup state
  const [searchRef, setSearchRef] = useState<string>('');
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [guestOrder, setGuestOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setUserEmail(user.email);
        loadOrders(user.email);
      } else {
        setUserEmail(null);
        setOrders([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const runLookup = async (ref: string, email: string) => {
    setSearching(true);
    setSearchError('');
    try {
      const order = await lookupOrder(ref, email);
      setGuestOrder(order);
    } catch (err: any) {
      setGuestOrder(null);
      setSearchError(err.message || 'No order found matching that reference and email.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const refParam = searchParams?.get('ref');
    const emailParam = searchParams?.get('email');
    if (refParam && emailParam) {
      setSearchRef(refParam);
      setSearchEmail(emailParam);
      runLookup(refParam, emailParam);
    }
  }, [searchParams]);

  const loadOrders = async (email: string) => {
    setLoading(true);
    try {
      const results = await fetchOrders(email);
      setOrders(results);
    } catch (err) {
      console.error('Failed to fetch orders from API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim() || !searchEmail.trim()) {
      setSearchError('Please provide both an order reference and your email address.');
      return;
    }
    await runLookup(searchRef.trim(), searchEmail.trim());
  };

  const orderCounts: Record<'all' | OrderStatus, number> = {
    all: orders.length,
    pending_payment: orders.filter((o) => o.status === 'pending_payment').length,
    payment_successful: orders.filter((o) => o.status === 'payment_successful').length,
    order_sent: orders.filter((o) => o.status === 'order_sent').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const filteredOrders = orders.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
            <Clock size={14} /> Awaiting Payment Confirmation
          </span>
        );
      case 'payment_successful':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
            <CheckCircle2 size={14} /> Payment Received
          </span>
        );
      case 'order_sent':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">
            <Send size={14} /> Order Sent to Manufacturer
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            <CheckCheck size={14} /> Order Fulfilled & Ready
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
            Cancelled
          </span>
        );
    }
  };

  const renderOrderCard = (order: Order) => (
    <div
      key={order.id}
      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Ref</span>
          <span className="font-mono font-bold text-base text-slate-900">{order.id}</span>
        </div>
        <div>{getStatusBadge(order.status)}</div>
      </div>

      {/* Customer Info */}
      {order.userName && (
        <div className="text-xs text-slate-500 mb-3">
          Customer: <strong className="text-slate-800">{order.userName}</strong> ({order.userEmail})
        </div>
      )}

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs text-slate-700">
            <span>
              <strong className="text-slate-900">{item.quantity}x</strong> {item.productName} ({item.size})
            </span>
            <span className="font-bold text-slate-900">£{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
        <span className="text-slate-500 font-medium">
          Placed: {new Date(order.createdAt).toLocaleDateString()}
        </span>
        <span className="text-base font-black text-slate-900">Total: £{order.totalAmount.toFixed(2)}</span>
      </div>

      {order.status === 'pending_payment' && (
        <div className="mt-4 pt-4 border-t border-amber-100 bg-amber-50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-amber-900 font-medium">
            Payment pending via Monzo. Please include reference <strong className="font-mono">{order.id}</strong> in your transfer.
          </p>
          <a
            href={order.paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#ff4d4d] hover:bg-[#e63939] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-1.5 transition shrink-0"
          >
            Pay via Monzo <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StoreHeader
        cartItemCount={0}
        onOpenCart={() => {}}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="max-w-4xl mx-auto px-4 py-10 w-full flex-1">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              {userEmail ? 'My Orders' : 'Order Status'}
            </h1>
            <p className="text-xs text-slate-500">
              {userEmail
                ? 'View your order history and track payment & fulfillment status.'
                : 'Track the status of your kit order, or sign in to your club member account.'}
            </p>
          </div>

          {userEmail && orders.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl">
              {ORDER_STATUS_FILTERS.map((filter) => {
                const count = orderCounts[filter.id];
                const isActive = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[rgb(82,94,62)] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-300 text-slate-700'
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

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[rgb(155,165,130)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !userEmail ? (
          /* Unauthenticated view: Guest Order Lookup or Sign In */
          <div className="space-y-6">
            {guestOrder ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[rgb(82,94,62)]" /> Order Found
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestOrder(null);
                      setSearchRef('');
                      setSearchEmail('');
                      setSearchError('');
                    }}
                    className="text-xs text-[rgb(82,94,62)] font-bold hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> Look up another order
                  </button>
                </div>

                {renderOrderCard(guestOrder)}

                <div className="text-center pt-2">
                  <Link
                    href="/store"
                    className="inline-block px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
                  >
                    Return to Store
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Track Order Form */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-[rgb(82,94,62)]">
                    <Search size={22} />
                    <h2 className="text-lg font-bold text-slate-900">Track Order Status</h2>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Enter the order reference (e.g. <strong>PRRC-0001</strong>) and the email address used at checkout.
                  </p>

                  {searchError && (
                    <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  <form onSubmit={handleGuestLookup} className="space-y-4">
                    <div>
                      <label htmlFor="orderRef" className="block text-xs font-bold text-slate-700 mb-1">
                        Order Number / Reference
                      </label>
                      <input
                        id="orderRef"
                        type="text"
                        required
                        placeholder="e.g. PRRC-0001"
                        value={searchRef}
                        onChange={(e) => setSearchRef(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] font-mono"
                      />
                    </div>

                    <div>
                      <label htmlFor="guestEmail" className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        id="guestEmail"
                        type="email"
                        required
                        placeholder="alex@example.com"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={searching}
                      className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                    >
                      {searching ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Checking Status...
                        </>
                      ) : (
                        <>
                          <Search size={16} /> Check Order Status
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Member Login Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-700">
                      <UserCheck size={22} className="text-[rgb(82,94,62)]" />
                      <h2 className="text-lg font-bold text-slate-900">Club Member Sign In</h2>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">
                      Have a Peasant Runners club account? Sign in to view all your previous kit orders, payment status, and order fulfillment in one place.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <p className="text-xs text-slate-600 mb-3">
                      View your complete order history without entering individual order references.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition"
                    >
                      Sign In as Club Member
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-sm mx-auto">
            <Package size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Orders Found</h3>
            <p className="text-xs text-slate-500 mb-4">You haven&apos;t placed any kit orders yet.</p>
            <Link
              href="/store"
              className="inline-block px-4 py-2 text-xs font-bold bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white rounded-xl transition"
            >
              Browse Products
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-sm mx-auto">
            <Package size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Orders Found</h3>
            <p className="text-xs text-slate-500 mb-4">No orders match the selected filter.</p>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              Show All Orders
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => renderOrderCard(order))}
          </div>
        )}
      </main>

      <StoreFooter />

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
    </div>
  );
}

export default function UserOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-[rgb(155,165,130)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <UserOrdersContent />
    </Suspense>
  );
}
