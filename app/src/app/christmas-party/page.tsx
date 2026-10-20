'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Instagram,
  ExternalLink,
  Clock,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  UserCheck,
  LogIn,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import StoreLoginScreen from '@/components/StoreLoginScreen';
import { fetchChristmasPartyStatus, purchaseChristmasPartyTicket } from '@/lib/api';
import { ChristmasPartyStatus } from '@/domain/models/ChristmasPartySettings';
import { Order } from '@/domain/models/Order';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeCountdown(targetIso: string, nowMs: number): CountdownParts {
  const targetMs = targetIso ? Date.parse(targetIso) : NaN;
  if (Number.isNaN(targetMs) || nowMs >= targetMs) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  return { days, hours, minutes, seconds, expired: false };
}

export default function ChristmasPartyPage() {
  const [partyStatus, setPartyStatus] = useState<ChristmasPartyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Auth & Checkout Form State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTicketOrder, setCreatedTicketOrder] = useState<Order | null>(null);

  const loadPartyStatus = useCallback(async () => {
    try {
      const data = await fetchChristmasPartyStatus();
      setPartyStatus(data);
    } catch (err) {
      console.error('Failed to load Christmas party status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartyStatus();
  }, [loadPartyStatus]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (user.displayName) setCustomerName(user.displayName);
        if (user.email) setCustomerEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const settings = partyStatus?.settings;
  const isPartyScheduled = Boolean(
    partyStatus?.isPartyScheduled && settings?.partyDateTime && settings.partyDateTime.trim()
  );

  const countdown = computeCountdown(settings?.saleStartAt || '', nowMs);
  const isSaleActive = isPartyScheduled && countdown.expired;

  const formattedPartyDate = settings?.partyDateTime
    ? new Date(settings.partyDateTime).toLocaleString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handlePurchaseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!customerEmail.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await purchaseChristmasPartyTicket({
        userName: customerName.trim(),
        userEmail: customerEmail.trim(),
        ...(currentUser?.uid ? { userId: currentUser.uid } : {}),
      });
      setCreatedTicketOrder(order);

      try {
        localStorage.setItem(
          'prrc_last_guest_order',
          JSON.stringify({ orderRef: order.id, email: order.userEmail })
        );
      } catch {
        // Ignore storage error
      }

      await loadPartyStatus();
    } catch (err: any) {
      setFormError(err.message || 'Failed to reserve Christmas party ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-[rgb(155,165,130)] selection:text-slate-900">
      <StoreHeader
        cartItemCount={0}
        onOpenCart={() => {}}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[rgb(155,165,130)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !isPartyScheduled ? (
          /* STATE 0: No Christmas Party Date Configured Holding Page */
          <div
            data-testid="no-christmas-party-holding"
            className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 sm:p-12 relative"
          >
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[rgb(78,88,60)] via-[rgb(155,165,130)] to-[rgb(82,94,62)]" />

            <div className="mx-auto w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 p-2 shadow-inner flex items-center justify-center">
              <img src="/logo.png" alt="PRRC Logo" className="max-h-full max-w-full object-contain" />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-4">
              <Clock size={13} className="text-amber-600" />
              <span>Christmas Party Updates</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-4">
              No Christmas party, please check Instagram for more details
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-md mx-auto">
              There is currently no Christmas party date scheduled. Follow the official Peasants Revolt Running Club Instagram page for event announcements and club updates!
            </p>

            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 justify-center items-center">
              <a
                href="https://www.instagram.com/prrcbrentwood/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs sm:text-sm font-bold px-6 py-3.5 rounded-2xl shadow transition transform hover:-translate-y-0.5"
              >
                <Instagram size={18} />
                <span>Follow @prrcbrentwood</span>
                <ExternalLink size={14} className="opacity-80" />
              </a>

              <Link
                href="/store/orders"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold px-5 py-3.5 rounded-2xl transition"
              >
                <PackageCheck size={16} />
                <span>Track Existing Orders</span>
              </Link>
            </div>
          </div>
        ) : !isSaleActive ? (
          /* STATE 1: Countdown Holding Page Before Sale Opens */
          <div
            data-testid="christmas-party-countdown"
            className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 sm:p-12 relative"
          >
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[rgb(78,88,60)] via-[rgb(155,165,130)] to-[rgb(82,94,62)]" />

            <div className="mx-auto w-24 h-24 mb-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 p-2 shadow-inner flex items-center justify-center">
              <img src="/logo.png" alt="PRRC Logo" className="max-h-full max-w-full object-contain" />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-[rgb(242,245,236)] border border-[rgb(155,165,130)] text-[rgb(82,94,62)] text-xs font-extrabold px-3.5 py-1 rounded-full mb-3">
              <Ticket size={14} />
              <span>Limited to {settings?.maxTickets} Tickets &bull; £{settings?.ticketPrice.toFixed(2)} each</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
              PRRC Christmas Party {settings?.eventYear}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              Tickets go on sale when the countdown below reaches zero.
            </p>

            {/* Countdown Clock */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto mb-8">
              {[
                { label: 'Days', value: countdown.days },
                { label: 'Hours', value: countdown.hours },
                { label: 'Minutes', value: countdown.minutes },
                { label: 'Seconds', value: countdown.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="bg-slate-900 text-white rounded-2xl py-4 px-2 shadow-md border border-slate-800"
                >
                  <span className="block text-2xl sm:text-3xl font-black font-mono tracking-tight text-[rgb(155,165,130)]">
                    {String(unit.value).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Event Details Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left max-w-md mx-auto space-y-3">
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-[rgb(82,94,62)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Party Date &amp; Time
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {formattedPartyDate}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[rgb(82,94,62)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Venue / Location
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {settings?.partyLocation}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : createdTicketOrder ? (
          /* STATE 2B: Order Created -> Monzo Payment Step */
          <div
            data-testid="christmas-ticket-monzo-step"
            className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>

            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Ticket Reserved! Complete Payment
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Please complete your payment via Monzo below. Once the organiser marks your payment as received, your official ticket with its door QR code will be emailed to{' '}
              <strong className="text-slate-900">{createdTicketOrder.userEmail}</strong>.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left mb-6 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Monzo Payment Reference:</span>
                <span className="font-mono font-black text-slate-900">{createdTicketOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Attendee:</span>
                <span className="font-bold text-slate-900">{createdTicketOrder.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Amount Due:</span>
                <span className="font-black text-slate-900">
                  £{createdTicketOrder.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <a
              href={createdTicketOrder.paymentLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#ff4d4d] hover:bg-[#e63939] text-white font-black text-sm py-3.5 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition mb-3"
            >
              <span>Pay £{createdTicketOrder.totalAmount.toFixed(2)} via Monzo</span>
              <ExternalLink size={16} />
            </a>

            <Link
              href="/store/orders"
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition"
            >
              <PackageCheck size={16} />
              <span>View My Orders &amp; Tickets</span>
            </Link>
          </div>
        ) : (
          /* STATE 2A: Countdown Finished -> Ticket Purchase Page */
          <div
            data-testid="christmas-party-purchase"
            className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 sm:p-10 relative"
          >
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[rgb(78,88,60)] via-[rgb(155,165,130)] to-[rgb(82,94,62)]" />

            <div className="flex items-center gap-4 mb-6">
              <img
                src="/logo.png"
                alt="PRRC Logo"
                className="w-16 h-16 rounded-2xl border border-slate-200 p-1.5 object-contain bg-slate-50 shrink-0"
              />
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[rgb(82,94,62)]">
                  <Ticket size={13} /> Official Club Event
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  PRRC Christmas Party {settings?.eventYear}
                </h1>
              </div>
            </div>

            {/* Event Summary & Availability */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-6 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar size={14} className="text-[rgb(82,94,62)]" /> Date &amp; Time
                </span>
                <span className="font-bold text-slate-900">{formattedPartyDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <MapPin size={14} className="text-[rgb(82,94,62)]" /> Location
                </span>
                <span className="font-bold text-slate-900">{settings?.partyLocation}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Ticket Price (1 Ticket per Order)</span>
                <span className="text-base font-black text-slate-900">
                  £{settings?.ticketPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Availability</span>
                <span
                  className={`font-extrabold px-2.5 py-0.5 rounded-full ${
                    (partyStatus?.ticketsRemaining || 0) > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {(partyStatus?.ticketsRemaining || 0) > 0
                    ? `${partyStatus?.ticketsRemaining} of ${settings?.maxTickets} tickets remaining`
                    : 'Sold Out'}
                </span>
              </div>
            </div>

            {(partyStatus?.ticketsRemaining || 0) <= 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <p className="text-sm font-black text-red-900 mb-1">
                  All Christmas Party Tickets Have Sold Out
                </p>
                <p className="text-xs text-red-700">
                  All {settings?.maxTickets} tickets for the {settings?.eventYear} Christmas Party have been claimed.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePurchaseTicket} className="space-y-4">
                {/* Member Login Bar */}
                {currentUser ? (
                  <div className="bg-[rgb(242,245,236)] border border-[rgb(155,165,130)] rounded-2xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[rgb(82,94,62)] font-bold">
                      <UserCheck size={16} />
                      <span>Signed in as {currentUser.displayName || currentUser.email}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">
                      Have a club account? Sign in to pre-fill your details, or continue as a guest below.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      className="inline-flex items-center gap-1 font-bold text-[rgb(82,94,62)] hover:underline shrink-0"
                    >
                      <LogIn size={14} /> Sign In
                    </button>
                  </div>
                )}

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="ticket-customer-name"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="ticket-customer-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Jane Runner"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ticket-customer-email"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Email Address (your QR ticket will be sent here)
                  </label>
                  <input
                    id="ticket-customer-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. jane@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgb(155,165,130)] text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] disabled:opacity-50 text-white font-black text-sm py-3.5 px-6 rounded-2xl shadow-md transition"
                >
                  {submitting
                    ? 'Reserving Ticket...'
                    : `Buy Christmas Party Ticket — £${settings?.ticketPrice.toFixed(2)}`}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      <StoreFooter />

      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <StoreLoginScreen
              onSuccess={() => setIsLoginModalOpen(false)}
              onClose={() => setIsLoginModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
