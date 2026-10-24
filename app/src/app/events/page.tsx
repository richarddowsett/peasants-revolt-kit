'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Instagram,
  Sparkles,
  User as UserIcon,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import StoreLoginScreen from '@/components/StoreLoginScreen';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ClubEventWithStats, EventTicket } from '@/domain/models/ClubEvent';
import { fetchEvents, fetchEventById, purchaseEventTicket } from '@/lib/api';

interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeCountdown(targetIso: string, nowMs: number): CountdownParts {
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { totalMs: diff, days, hours, minutes, seconds };
}

function formatEventDateTime(isoStr: string): string {
  if (!isoStr) return 'Date & Time TBA';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClubEventsPage() {
  const [user, setUser] = useState<User | null>(null);

  const [events, setEvents] = useState<ClubEventWithStats[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventStatus, setSelectedEventStatus] = useState<ClubEventWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Customer ticket checkout form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [completedTicket, setCompletedTicket] = useState<EventTicket | null>(null);

  // Optional inline sign-in modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.displayName && !customerName) {
          setCustomerName(currentUser.displayName);
        }
        if (currentUser.email && !customerEmail) {
          setCustomerEmail(currentUser.email);
        }
      }
    });
    return () => unsubscribe();
  }, [customerName, customerEmail]);

  const loadEventsData = useCallback(async (eventIdOverride?: string | null) => {
    try {
      const targetId =
        eventIdOverride !== undefined
          ? eventIdOverride
          : typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('id')
          : null;

      if (targetId) {
        setSelectedEventId(targetId);
        const detail = await fetchEventById(targetId);
        setSelectedEventStatus(detail);
      } else {
        setSelectedEventId(null);
        setSelectedEventStatus(null);
        const list = await fetchEvents(false);
        setEvents(Array.isArray(list) ? list : []);
      }
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Unable to load club events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEventsData();

    const handlePopState = () => {
      const id = new URLSearchParams(window.location.search).get('id');
      loadEventsData(id);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadEventsData]);

  // Tick every second when viewing an event detail page so countdowns transition to open automatically
  useEffect(() => {
    if (!selectedEventStatus?.event?.saleStartAt) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedEventStatus?.event?.saleStartAt]);

  const handleSelectEvent = async (eventWithStats: ClubEventWithStats) => {
    setCompletedTicket(null);
    setFormError(null);
    setSelectedEventId(eventWithStats.event.id);
    setSelectedEventStatus(eventWithStats);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/events?id=${encodeURIComponent(eventWithStats.event.id)}`);
    }
  };

  const handleBackToDirectory = () => {
    setCompletedTicket(null);
    setFormError(null);
    setSelectedEventId(null);
    setSelectedEventStatus(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/events');
    }
    setLoading(true);
    loadEventsData(null);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventStatus) return;
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await purchaseEventTicket(selectedEventStatus.event.id, {
        userName: customerName.trim(),
        userEmail: customerEmail.trim().toLowerCase(),
        userId: user?.uid,
      });
      setCompletedTicket(ticket);
      const updatedDetail = await fetchEventById(selectedEventStatus.event.id);
      setSelectedEventStatus(updatedDetail);
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to purchase ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeEvent = selectedEventStatus?.event;
  const countdown = activeEvent?.saleStartAt
    ? computeCountdown(activeEvent.saleStartAt, nowMs)
    : { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const isCountdownActive = Boolean(
    selectedEventStatus &&
      activeEvent?.saleStartAt &&
      countdown.totalMs > 0 &&
      !selectedEventStatus.isSaleOpen
  );
  const isSaleOpenNow = Boolean(
    selectedEventStatus &&
      (selectedEventStatus.isSaleOpen ||
        (activeEvent?.saleStartAt && countdown.totalMs === 0))
  );
  const isSoldOut = Boolean(
    selectedEventStatus && selectedEventStatus.ticketsRemaining <= 0
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <StoreHeader />

      <main className="max-w-5xl mx-auto px-4 py-10 flex-grow w-full">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#9ba582] mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading club events...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-700 font-bold mb-2">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                loadEventsData(null);
              }}
              className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm"
            >
              Back to Events
            </button>
          </div>
        ) : !selectedEventId || !selectedEventStatus || !activeEvent ? (
          /* =========================================================
             VIEW 1: CLUB EVENTS DIRECTORY (/events)
             ========================================================= */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#f2f5ec] text-[#525e3e] text-xs font-extrabold uppercase tracking-widest mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Peasants Revolt Running Club</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Club Events &amp; Tickets
                </h1>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  Upcoming socials, club parties, and special events for PRRC members.
                </p>
              </div>
              <Link
                href="/store/orders"
                className="inline-flex items-center space-x-2 text-sm font-bold text-[#525e3e] hover:text-[#414b31] bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm transition-colors self-start sm:self-auto"
              >
                <Ticket className="w-4 h-4" />
                <span>View My Orders &amp; Tickets</span>
              </Link>
            </div>

            {events.length === 0 ? (
              /* NO UPCOMING EVENTS HOLDING STATE */
              <div
                data-testid="no-events-holding"
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-[#f2f5ec] border border-[#d5dec2] flex items-center justify-center mx-auto mb-6">
                  <img
                    src="/logo.png"
                    alt="PRRC Club Logo"
                    className="w-14 h-14 object-contain rounded-full"
                  />
                </div>
                <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-4">
                  <Ticket className="w-3.5 h-3.5 text-[#525e3e]" />
                  <span>Club Events</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
                  No upcoming events, please check Instagram for more details
                </h2>
                <p className="text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
                  There are currently no upcoming club events scheduled for ticket sales. Follow
                  Peasants Revolt Running Club on Instagram for announcements on socials, races,
                  and club nights!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="https://www.instagram.com/prrcbrentwood/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-[#525e3e] hover:bg-[#414b31] text-white font-bold shadow-md transition-all"
                  >
                    <Instagram className="w-5 h-5" />
                    <span>Follow @prrcbrentwood on Instagram</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Link
                    href="/store"
                    className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all"
                  >
                    <span>Back to Kit Store</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* UPCOMING EVENTS LIST */
              <div
                data-testid="events-list"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {events.map((item) => {
                  const evt = item.event;
                  const logoSrc = evt.logoUrl?.trim() ? evt.logoUrl : '/logo.png';
                  const soldOut = item.ticketsRemaining <= 0;
                  const saleNotStarted = !item.isSaleOpen;

                  return (
                    <div
                      key={evt.id}
                      data-testid="event-card"
                      onClick={() => handleSelectEvent(item)}
                      className="group cursor-pointer bg-white rounded-3xl border border-slate-200 hover:border-[#9ba582] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="bg-[#525e3e] px-6 py-5 text-white flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <img
                              src={logoSrc}
                              alt={evt.title}
                              className="w-14 h-14 rounded-full bg-white p-1 object-contain shadow-sm flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#d9e2c6] block">
                                Club Event
                              </span>
                              <h2 className="text-xl font-black text-white truncate">
                                {evt.title}
                              </h2>
                            </div>
                          </div>
                          <div className="bg-white/15 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-right flex-shrink-0">
                            <span className="text-[10px] uppercase font-bold text-[#d9e2c6] block">
                              Ticket
                            </span>
                            <span className="text-lg font-black text-white">
                              £{Number(evt.ticketPrice).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="p-6 space-y-4">
                          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                            {evt.description}
                          </p>

                          <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-[#525e3e] flex-shrink-0" />
                              <span className="font-bold">
                                {formatEventDateTime(evt.startDate)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-[#525e3e] flex-shrink-0" />
                              <span className="font-medium truncate">{evt.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-slate-100">
                        <div>
                          {soldOut ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800">
                              Sold Out
                            </span>
                          ) : saleNotStarted ? (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Countdown Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                              <Ticket className="w-3.5 h-3.5" />
                              <span>
                                {item.ticketsRemaining} of {evt.maxTickets} tickets left
                              </span>
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center space-x-1 text-sm font-extrabold text-[#525e3e] group-hover:translate-x-0.5 transition-transform">
                          <span>View Event</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================
             VIEW 2: SINGLE EVENT DETAIL & TICKET PURCHASE (/events?id=...)
             ========================================================= */
          <div data-testid="event-detail-view" className="space-y-6">
            <button
              type="button"
              onClick={handleBackToDirectory}
              className="inline-flex items-center space-x-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Events</span>
            </button>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Hero Banner */}
              <div className="bg-[#525e3e] text-white px-6 py-8 sm:px-10 sm:py-10 text-center">
                <img
                  src={activeEvent.logoUrl?.trim() ? activeEvent.logoUrl : '/logo.png'}
                  alt={activeEvent.title}
                  className="w-20 h-20 rounded-full bg-white p-1.5 mx-auto mb-4 object-contain shadow-md"
                />
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 text-[#e6ecd8] text-xs font-extrabold uppercase tracking-widest mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Peasants Revolt Running Club</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                  {activeEvent.title}
                </h1>
              </div>

              {/* Event Metadata Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-[#f8faf5] border-b border-slate-200">
                <div className="p-4 sm:p-5 flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-[#525e3e] flex-shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-400">
                      Date &amp; Time
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatEventDateTime(activeEvent.startDate)}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-5 flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-[#525e3e] flex-shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-400">
                      Venue Address
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {activeEvent.address || 'Venue TBA'}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-5 flex items-center space-x-3">
                  <Ticket className="w-5 h-5 text-[#525e3e] flex-shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-400">
                      Ticket Price
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      £{Number(activeEvent.ticketPrice).toFixed(2)} &bull;{' '}
                      <span className="text-[#525e3e]">
                        {selectedEventStatus.ticketsRemaining} of {activeEvent.maxTickets} left
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              <div className="px-6 pt-6 sm:px-10 sm:pt-8">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    About This Event
                  </h2>
                  <p className="text-slate-700 text-sm sm:text-base whitespace-pre-line leading-relaxed">
                    {activeEvent.description}
                  </p>
                </div>
              </div>

              {/* Body: Countdown OR Sold Out OR Purchase Form OR Completed Ticket */}
              <div className="p-6 sm:p-10">
                {completedTicket ? (
                  /* COMPLETED TICKET RESERVATION — MONZO CHECKOUT */
                  <div data-testid="ticket-order-confirmation" className="space-y-6">
                    <div className="flex items-center space-x-3 text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                      <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
                      <div>
                        <h2 className="text-lg font-extrabold">Ticket Reserved!</h2>
                        <p className="text-xs text-emerald-800">
                          Complete your Monzo payment below. Once the organiser marks your
                          payment as received, your branded QR entry ticket will be emailed to{' '}
                          <strong>{completedTicket.userEmail}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Ticket Reference:</span>
                        <span
                          data-testid="ticket-order-reference"
                          className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200"
                        >
                          {completedTicket.id}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Event:</span>
                        <span className="font-bold text-slate-800">
                          {completedTicket.eventTitle}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Attendee:</span>
                        <span className="font-bold text-slate-800">
                          {completedTicket.userName} ({completedTicket.userEmail})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-base font-extrabold pt-3 border-t border-slate-200">
                        <span>Total Due (1 Ticket):</span>
                        <span className="text-[#525e3e]">
                          £{Number(completedTicket.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start space-x-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 space-y-1 leading-relaxed">
                        <p className="font-extrabold text-sm text-amber-950">
                          IMPORTANT: Do NOT change the Monzo payment reference!
                        </p>
                        <p>
                          Your reference{' '}
                          <span className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                            {completedTicket.monzoReference}
                          </span>{' '}
                          is pre-filled automatically. Keeping it exact ensures we can verify
                          your payment and email your QR code ticket promptly.
                        </p>
                      </div>
                    </div>

                    <a
                      href={completedTicket.paymentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 px-6 bg-[#ff4f40] hover:bg-[#e03e30] text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all text-base"
                    >
                      <span>Pay £{Number(completedTicket.unitPrice).toFixed(2)} via Monzo</span>
                      <ExternalLink className="w-5 h-5" />
                    </a>

                    <div className="text-center pt-2">
                      <Link
                        href="/store/orders"
                        className="text-sm font-bold text-[#525e3e] hover:underline"
                      >
                        View in My Orders &rarr;
                      </Link>
                    </div>
                  </div>
                ) : isCountdownActive ? (
                  /* COUNTDOWN HOLDING STATE */
                  <div data-testid="event-countdown" className="text-center py-6">
                    <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-4">
                      <Clock className="w-4 h-4" />
                      <span>Ticket Sales Open Soon</span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                      Countdown to Ticket Release
                    </h2>
                    <p className="text-sm text-slate-600 mb-8">
                      Tickets go on sale on{' '}
                      <strong>{formatEventDateTime(activeEvent.saleStartAt)}</strong>. Only{' '}
                      <strong>{activeEvent.maxTickets} tickets</strong> are available!
                    </p>

                    <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-lg mx-auto mb-8">
                      {[
                        { label: 'Days', value: countdown.days },
                        { label: 'Hours', value: countdown.hours },
                        { label: 'Minutes', value: countdown.minutes },
                        { label: 'Seconds', value: countdown.seconds },
                      ].map((unit) => (
                        <div
                          key={unit.label}
                          className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md"
                        >
                          <div className="text-2xl sm:text-4xl font-black font-mono">
                            {String(unit.value).padStart(2, '0')}
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">
                            {unit.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500">
                      This page will automatically unlock the ticket checkout as soon as the
                      countdown reaches zero.
                    </p>
                  </div>
                ) : isSoldOut ? (
                  /* SOLD OUT STATE */
                  <div data-testid="event-sold-out" className="text-center py-8">
                    <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-extrabold uppercase tracking-wider mb-3">
                      <span>Sold Out</span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                      All {activeEvent.maxTickets} Tickets Have Been Claimed!
                    </h2>
                    <p className="text-slate-600 max-w-md mx-auto mb-6">
                      Tickets for {activeEvent.title} are now sold out. Check Instagram for any
                      updates from the organisers.
                    </p>
                    <a
                      href="https://www.instagram.com/prrcbrentwood/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
                    >
                      <Instagram className="w-4 h-4" />
                      <span>@prrcbrentwood on Instagram</span>
                    </a>
                  </div>
                ) : isSaleOpenNow ? (
                  /* TICKET PURCHASE FORM (1 TICKET PER ORDER) */
                  <div data-testid="event-purchase-form">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-6 border-b border-slate-200">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">
                          Buy Your Event Ticket
                        </h2>
                        <p className="text-sm text-slate-600">
                          Limited to <strong>1 ticket per order</strong>. Each ticket includes a
                          unique QR code for entry at the door.
                        </p>
                      </div>
                      {!user && (
                        <button
                          type="button"
                          onClick={() => setIsAuthModalOpen(true)}
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#525e3e] bg-[#f2f5ec] hover:bg-[#e5ebd8] px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Sign in to pre-fill details</span>
                        </button>
                      )}
                    </div>

                    {formError && (
                      <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                        {formError}
                      </div>
                    )}

                    <form onSubmit={handlePurchaseSubmit} className="space-y-5">
                      <div>
                        <label
                          htmlFor="ticket-customer-name"
                          className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                        >
                          Full Name *
                        </label>
                        <input
                          id="ticket-customer-name"
                          type="text"
                          required
                          placeholder="e.g. Jane Runner"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9ba582] text-sm"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="ticket-customer-email"
                          className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                        >
                          Email Address (for your QR Ticket) *
                        </label>
                        <input
                          id="ticket-customer-email"
                          type="email"
                          required
                          placeholder="runner@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9ba582] text-sm"
                        />
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            1 &times; {activeEvent.title} Ticket
                          </div>
                          <div className="text-xs text-slate-500">
                            Includes QR code entry emailed once payment is confirmed
                          </div>
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          £{Number(activeEvent.ticketPrice).toFixed(2)}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 px-6 rounded-xl bg-[#525e3e] hover:bg-[#414b31] disabled:opacity-50 text-white font-extrabold text-base shadow-md transition-all flex items-center justify-center space-x-2"
                      >
                        <Ticket className="w-5 h-5" />
                        <span>
                          {submitting
                            ? 'Reserving Your Ticket...'
                            : `Buy Ticket — £${Number(activeEvent.ticketPrice).toFixed(2)}`}
                        </span>
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <StoreLoginScreen
              onClose={() => setIsAuthModalOpen(false)}
              onSuccess={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      <StoreFooter />
    </div>
  );
}
