'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchOrders,
  updateOrderStatus,
  verifyAdminPassword,
} from '@/lib/api';
import { Order } from '@/domain/models/Order';
import {
  aggregateOrdersForManufacturer,
  ManufacturerExportBatch,
} from '@/domain/utils/orderExport';
import {
  Printer,
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Lock,
  Package,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export default function ManufacturerExportPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [includeAlreadySent, setIncludeAlreadySent] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('Kit Coordinator');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [batchRef, setBatchRef] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEmailValid = adminEmail.trim().length > 0;
  const isAddressValid = shippingAddress.trim().length > 0;
  const isExportValid = isEmailValid && isAddressValid;

  // Check authentication on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadOrders();
    } else {
      setLoading(false);
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
        loadOrders();
      } else {
        setAuthError('Incorrect admin password.');
      }
    } catch {
      setAuthError('Failed to verify admin password.');
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const allOrders = await fetchOrders();
      setOrders(allOrders);
    } catch (err) {
      console.error('Failed to load orders for export:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load orders. Please refresh.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter orders according to user toggle:
  // Default: orders with status 'payment_successful'
  // When toggle active: orders with status 'payment_successful' OR 'order_sent'
  const filteredOrders = orders.filter((order) => {
    if (includeAlreadySent) {
      return order.status === 'payment_successful' || order.status === 'order_sent';
    }
    return order.status === 'payment_successful';
  });

  const exportBatch: ManufacturerExportBatch = aggregateOrdersForManufacturer(filteredOrders);

  // Identify orders that are currently 'payment_successful' and can be marked as 'order_sent'
  const pendingSentOrderIds = filteredOrders
    .filter((o) => o.status === 'payment_successful')
    .map((o) => o.id);

  const handleMarkAsSent = async () => {
    if (!isExportValid) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter both Club Admin Email and Shipping Address before exporting.',
      });
      return;
    }

    if (pendingSentOrderIds.length === 0) return;

    const trimmedBatchRef = batchRef.trim();
    const confirmed = window.confirm(
      trimmedBatchRef
        ? `Mark ${pendingSentOrderIds.length} order(s) as "Order Sent" with batch "${trimmedBatchRef}"?\nThis updates customer orders in the system.`
        : `Mark ${pendingSentOrderIds.length} order(s) as "Order Sent"?\nThis updates customer orders in the system.`
    );
    if (!confirmed) return;

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await Promise.all(
        pendingSentOrderIds.map((id) =>
          trimmedBatchRef
            ? updateOrderStatus(id, 'order_sent', trimmedBatchRef)
            : updateOrderStatus(id, 'order_sent')
        )
      );

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          pendingSentOrderIds.includes(order.id)
            ? {
                ...order,
                status: 'order_sent' as const,
                ...(trimmedBatchRef ? { batchRef: trimmedBatchRef } : {}),
              }
            : order
        )
      );

      setStatusMessage({
        type: 'success',
        text: trimmedBatchRef
          ? `Successfully marked ${pendingSentOrderIds.length} order(s) as "Order Sent" (Batch: ${trimmedBatchRef})!`
          : `Successfully marked ${pendingSentOrderIds.length} order(s) as "Order Sent"!`,
      });
    } catch (err: unknown) {
      console.error('Failed to update orders to order_sent:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to update some orders: ${(err as Error).message || 'Server error'}`,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    if (!isExportValid) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter both Club Admin Email and Shipping Address before exporting.',
      });
      return;
    }
    window.print();
  };

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-xl border border-slate-200">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-900 text-center mb-1">Admin Access Required</h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            Enter the admin password to view and export manufacturer order sheets.
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {authError && <p className="text-xs text-red-500 mt-2 font-medium">{authError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs font-bold py-3 rounded-xl transition shadow"
            >
              Unlock Manufacturer Export
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/admin/orders" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
              &larr; Back to Admin CMS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 flex flex-col">
      {/* Top Controls Bar (hidden during printing) */}
      <header className="bg-slate-900 text-white shadow-md print:hidden sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold py-1.5 px-2.5 rounded-lg hover:bg-slate-800"
            >
              <ArrowLeft size={16} />
              <span>Back to Admin</span>
            </Link>
            <div className="block border-l border-slate-700 pl-3">
              <span className="font-extrabold text-xs sm:text-sm block leading-tight">Manufacturer Order Export</span>
              <span className="text-[10px] uppercase font-bold text-[rgb(155,165,130)] block">
                Peasants Revolt Running Club
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              title="Refresh Orders"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {pendingSentOrderIds.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAsSent}
                disabled={isUpdatingStatus || !isExportValid}
                title={!isExportValid ? 'Please enter admin email and shipping address to export' : undefined}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1.5"
              >
                {isUpdatingStatus ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                <span>Mark {pendingSentOrderIds.length} as Sent</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              disabled={exportBatch.totalQuantity === 0 || !isExportValid}
              title={!isExportValid ? 'Please enter admin email and shipping address to export' : 'Print / Save as PDF'}
              className="bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] disabled:opacity-50 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow flex items-center gap-2 transition"
            >
              <Printer size={16} />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen Options Subheader (hidden during printing) */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={includeAlreadySent}
                onChange={(e) => setIncludeAlreadySent(e.target.checked)}
                className="rounded border-slate-300 text-[rgb(82,94,62)] focus:ring-[rgb(155,165,130)]"
              />
              <span>Include previously &ldquo;Order Sent&rdquo; orders in this sheet</span>
            </label>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <label htmlFor="batch-ref-input" className="font-semibold text-slate-700 text-xs whitespace-nowrap">
                Batch Ref:
              </label>
              <input
                id="batch-ref-input"
                type="text"
                value={batchRef}
                onChange={(e) => setBatchRef(e.target.value)}
                placeholder="e.g. BATCH-2026-OCT (optional)"
                aria-label="Batch Reference"
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[rgb(155,165,130)] font-mono w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span>
              Orders included:{' '}
              <strong className="text-slate-900">{exportBatch.orderCount}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Total garments:{' '}
              <strong className="text-slate-900">{exportBatch.totalQuantity}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Total batch value:{' '}
              <strong className="text-[rgb(82,94,62)]">£{exportBatch.totalAmount.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-6 w-full flex-1 print:p-0 print:max-w-none">
        {/* Status Message Notification */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold print:hidden ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 print:hidden">
            <Loader2 size={36} className="animate-spin text-[rgb(82,94,62)] mb-3" />
            <p className="text-sm font-semibold">Aggregating paid orders for export...</p>
          </div>
        ) : exportBatch.productGroups.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm print:hidden">
            <Package size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-900 mb-1">No Orders Ready for Export</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
              Only orders with <span className="font-bold text-slate-700">&ldquo;Payment Received&rdquo;</span>{' '}
              status are exported to the manufacturer. Check the Customer Orders tab to verify pending payments.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/admin/orders"
                className="bg-[rgb(82,94,62)] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[rgb(68,78,50)] transition"
              >
                Go to Customer Orders
              </Link>
              {!includeAlreadySent && (
                <button
                  type="button"
                  onClick={() => setIncludeAlreadySent(true)}
                  className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition"
                >
                  Show Already Sent Orders
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Printable Document Sheet */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:rounded-none">
            {/* Header with Club Logo & PO Meta */}
            <div className="border-b-2 border-slate-900 pb-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Logo and Club Title */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-[rgb(155,165,130)] p-1 bg-white shadow-sm flex-shrink-0">
                    <img
                      src="/logo.png"
                      alt="Peasants Revolt Running Club Logo"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest font-extrabold text-[rgb(82,94,62)] block">
                      Peasants Revolt Running Club
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                      Manufacturer Production Order
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Official Club Kit Production Batch Sheet
                    </p>
                  </div>
                </div>

                {/* Metadata box */}
                <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                  <div>
                    <span className="text-slate-500">Date: </span>
                    <strong className="text-slate-900 font-bold">{todayFormatted}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Batch Ref: </span>
                    <span className="font-mono font-bold text-slate-800">
                      {batchRef.trim() || `PRRC-BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Paid Orders Included: </span>
                    <span className="font-bold text-slate-900">{exportBatch.orderCount}</span>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Payment Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Club Contact & Shipping Address */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Club Contact & Email */}
              <div
                className={`border rounded-2xl p-4 print:bg-white print:border-slate-300 flex flex-col justify-between ${
                  !isEmailValid
                    ? 'border-red-300 bg-red-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                    Club Contact &amp; Email
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block print:hidden">Contact Person / Role</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full text-xs font-bold text-slate-900 bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-[rgb(155,165,130)] focus:outline-none py-0.5 print:hidden"
                        placeholder="e.g. Kit Coordinator"
                      />
                      <p className="text-xs font-bold text-slate-900 hidden print:block">
                        {contactName}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block print:hidden">
                        Club Admin Email <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className={`w-full text-xs font-medium text-slate-700 bg-transparent border-b ${
                          !isEmailValid
                            ? 'border-red-400 focus:border-red-500'
                            : 'border-slate-200 hover:border-slate-300 focus:border-[rgb(155,165,130)]'
                        } focus:outline-none py-0.5 print:hidden`}
                        placeholder="e.g. admin@peasantsrc.co.uk"
                      />
                      {!isEmailValid && (
                        <p data-testid="admin-email-error" className="text-[10px] text-red-500 font-semibold mt-1 print:hidden">
                          Club admin email is required
                        </p>
                      )}
                      <p className="text-xs text-slate-700 hidden print:block">
                        {adminEmail}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  Peasants Revolt Running Club
                </p>
              </div>

              {/* Box 2: Shipping & Delivery Address */}
              <div
                className={`border rounded-2xl p-4 print:bg-white print:border-slate-300 flex flex-col justify-between ${
                  !isAddressValid
                    ? 'border-red-300 bg-red-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                    Shipping &amp; Delivery Address
                  </span>
                  <label className="text-[10px] text-slate-400 font-semibold block print:hidden">
                    Delivery / Dispatch Address <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    rows={3}
                    className={`w-full text-xs text-slate-900 font-medium bg-transparent border-b ${
                      !isAddressValid
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[rgb(155,165,130)]'
                    } focus:outline-none resize-none py-0.5 print:hidden`}
                    placeholder="Enter shipping address..."
                  />
                  {!isAddressValid && (
                    <p data-testid="shipping-address-error" className="text-[10px] text-red-500 font-semibold mt-1 print:hidden">
                      Shipping address is required
                    </p>
                  )}
                  <p className="text-xs text-slate-900 font-medium hidden print:block whitespace-pre-wrap leading-relaxed">
                    {shippingAddress || 'No shipping address provided.'}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  Direct Manufacturer Dispatch
                </p>
              </div>
            </div>

            {/* Product Breakdown Tables */}
            <div className="space-y-8">
              {exportBatch.productGroups.map((group, groupIdx) => (
                <div
                  key={group.productId}
                  className="print-break-inside-avoid border border-slate-200 rounded-2xl overflow-hidden print:border-slate-300"
                >
                  {/* Product Header */}
                  <div className="bg-slate-100 print:bg-slate-200 px-5 py-3 border-b border-slate-200 print:border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[rgb(82,94,62)] text-white text-[11px] font-black flex items-center justify-center">
                        {groupIdx + 1}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {group.productName}
                      </h3>
                    </div>
                    <span className="text-xs font-extrabold text-slate-700">
                      {group.totalQuantity} {group.totalQuantity === 1 ? 'unit' : 'units'}
                    </span>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                        <th className="py-2.5 px-5">Gender / Fit</th>
                        <th className="py-2.5 px-4">Size</th>
                        <th className="py-2.5 px-4 text-center">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.rows.map((row, rIdx) => (
                        <tr
                          key={`${row.gender}-${row.rawSize}-${rIdx}`}
                          className="hover:bg-slate-50/50"
                        >
                          <td className="py-2.5 px-5 font-bold text-slate-800">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.gender === 'men'
                                  ? 'bg-blue-50 text-blue-800'
                                  : row.gender === 'women'
                                  ? 'bg-rose-50 text-rose-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {row.genderLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-extrabold text-slate-900">
                            {row.rawSize}
                          </td>
                          <td className="py-2.5 px-4 text-center font-black text-slate-900 text-sm">
                            {row.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-600">
                            £{row.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-5 text-right font-bold text-slate-900">
                            £{row.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-xs text-slate-900">
                        <td colSpan={2} className="py-2.5 px-5 text-slate-700 uppercase tracking-wider text-[11px]">
                          Subtotal for {group.productName}
                        </td>
                        <td className="py-2.5 px-4 text-center text-sm text-[rgb(82,94,62)]">
                          {group.totalQuantity}
                        </td>
                        <td className="py-2.5 px-4"></td>
                        <td className="py-2.5 px-5 text-right text-sm text-[rgb(82,94,62)]">
                          £{group.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
            </div>

            {/* Grand Total Summary Box */}
            <div className="mt-8 pt-6 border-t-2 border-slate-900 print-break-inside-avoid">
              <div className="bg-slate-900 text-white rounded-2xl p-6 print:bg-slate-900 print:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[rgb(185,195,160)] block mb-1">
                      Production Order Summary
                    </span>
                    <h3 className="text-xl font-black">Grand Total Batch</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Aggregated across {exportBatch.productGroups.length}{' '}
                      {exportBatch.productGroups.length === 1 ? 'kit item' : 'kit items'} &bull;{' '}
                      {exportBatch.orderCount} paid customer {exportBatch.orderCount === 1 ? 'order' : 'orders'}
                    </p>
                  </div>

                  <div className="flex items-center gap-8 border-t sm:border-t-0 sm:border-l border-slate-700 pt-3 sm:pt-0 sm:pl-8">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                        Total Quantity
                      </span>
                      <span className="text-2xl font-black text-[rgb(185,195,160)]">
                        {exportBatch.totalQuantity}{' '}
                        <span className="text-xs font-semibold text-slate-300">items</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                        Total Value
                      </span>
                      <span className="text-2xl font-black text-white">
                        £{exportBatch.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:block">
                Peasants Revolt Running Club &bull; Official Manufacturer Production Sheet &bull; Generated on {todayFormatted}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
