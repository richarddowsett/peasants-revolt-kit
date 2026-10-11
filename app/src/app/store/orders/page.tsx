'use client';

import React, { useState, useEffect } from 'react';
import StoreHeader from '@/components/StoreHeader';
import { fetchOrders } from '@/lib/api';
import { Order, OrderStatus } from '@/domain/models/Order';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Package, Clock, CheckCircle2, CheckCheck, ExternalLink, Send } from 'lucide-react';

const ORDER_STATUS_FILTERS: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending_payment', label: 'Pending Payment' },
  { id: 'payment_successful', label: 'Payment Received' },
  { id: 'order_sent', label: 'Order Sent' },
  { id: 'completed', label: 'Order Fulfilled' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StoreHeader cartItemCount={0} onOpenCart={() => {}} />

      <main className="max-w-4xl mx-auto px-4 py-10 w-full flex-1">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">My Orders</h1>
            <p className="text-xs text-slate-500">
              View your order history and track payment & fulfillment status.
            </p>
          </div>

          {orders.length > 0 && (
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
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-sm mx-auto">
            <Package size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Please Sign In</h3>
            <p className="text-xs text-slate-500">Sign in with your club member account to view your past orders.</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-sm mx-auto">
            <Package size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Orders Found</h3>
            <p className="text-xs text-slate-500">You haven&apos;t placed any kit orders yet.</p>
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
            {filteredOrders.map((order) => (
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
