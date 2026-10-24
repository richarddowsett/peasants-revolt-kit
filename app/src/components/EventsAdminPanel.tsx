'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Ticket,
  QrCode,
  CheckCircle2,
  Mail,
  Send,
  Trash2,
  CheckCheck,
  Plus,
  Edit3,
  Upload,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  ClubEventWithStats,
  DEFAULT_EVENTS_FROM_EMAIL,
  EventTicket,
  EventTicketStatus,
  EventTicketVerificationResult,
} from '@/domain/models/ClubEvent';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchEventTickets,
  updateEventTicketStatus,
  resendEventTicketEmail,
  verifyEventTicketQr,
  uploadImage,
} from '@/lib/api';

function toDatetimeLocalValue(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EventsAdminPanel() {
  const [events, setEvents] = useState<ClubEventWithStats[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Create / Edit Event Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [saleStartAtInput, setSaleStartAtInput] = useState('');
  const [maxTicketsInput, setMaxTicketsInput] = useState('50');
  const [ticketPriceInput, setTicketPriceInput] = useState('25');
  const [addressInput, setAddressInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [fromEmailInput, setFromEmailInput] = useState(DEFAULT_EVENTS_FROM_EMAIL);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Ticket Actions State
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [resendingTicketId, setResendingTicketId] = useState<string | null>(null);
  const [verifyingQr, setVerifyingQr] = useState(false);

  const selectedEventIdRef = useRef<string | null>(null);
  const verifyingQrRef = useRef<boolean>(false);

  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  const loadEvents = async (preferredEventId?: string | null, showSpinner = false) => {
    if (showSpinner) setLoadingEvents(true);
    try {
      const list: ClubEventWithStats[] = await fetchEvents(true);
      const safeList = Array.isArray(list) ? list : [];
      setEvents(safeList);

      const targetId =
        preferredEventId !== undefined
          ? preferredEventId
          : selectedEventId && safeList.some((e) => e.event.id === selectedEventId)
          ? selectedEventId
          : safeList[0]?.event.id || null;

      setSelectedEventId(targetId);
      if (targetId) {
        await loadTicketsForEvent(targetId);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      if (showSpinner) setLoadingEvents(false);
    }
  };

  const loadTicketsForEvent = async (eventId: string) => {
    setLoadingTickets(true);
    try {
      const data = await fetchEventTickets(eventId);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load event tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadEvents(undefined, true);
  }, []);

  const resetEventForm = () => {
    setEditingEventId(null);
    setTitleInput('');
    setDescriptionInput('');
    setStartDateInput('');
    setSaleStartAtInput('');
    setMaxTicketsInput('50');
    setTicketPriceInput('25');
    setAddressInput('');
    setLogoUrlInput('');
    setFromEmailInput(DEFAULT_EVENTS_FROM_EMAIL);
    setFormMessage(null);
  };

  const handleOpenCreateForm = () => {
    resetEventForm();
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: ClubEventWithStats) => {
    const evt = item.event;
    setEditingEventId(evt.id);
    setTitleInput(evt.title);
    setDescriptionInput(evt.description);
    setStartDateInput(toDatetimeLocalValue(evt.startDate));
    setSaleStartAtInput(toDatetimeLocalValue(evt.saleStartAt));
    setMaxTicketsInput(String(evt.maxTickets));
    setTicketPriceInput(String(evt.ticketPrice));
    setAddressInput(evt.address);
    setLogoUrlInput(evt.logoUrl || '');
    setFromEmailInput(evt.fromEmail || DEFAULT_EVENTS_FROM_EMAIL);
    setFormMessage(null);
    setIsFormOpen(true);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setFormMessage(null);
    try {
      const uploadedUrl = await uploadImage(file);
      setLogoUrlInput(uploadedUrl);
      setFormMessage({
        type: 'success',
        text: 'Custom event logo uploaded to Cloud Storage.',
      });
    } catch (err: any) {
      setFormMessage({
        type: 'error',
        text: err.message || 'Failed to upload custom logo.',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    setSavingEvent(true);

    try {
      const startIso = startDateInput ? new Date(startDateInput).toISOString() : '';
      const saleIso = saleStartAtInput ? new Date(saleStartAtInput).toISOString() : '';

      const payload = {
        title: titleInput.trim(),
        description: descriptionInput.trim(),
        startDate: startIso,
        saleStartAt: saleIso,
        maxTickets: Number(maxTicketsInput),
        ticketPrice: Number(ticketPriceInput),
        address: addressInput.trim(),
        logoUrl: logoUrlInput.trim(),
        fromEmail: fromEmailInput.trim() || DEFAULT_EVENTS_FROM_EMAIL,
      };

      if (editingEventId) {
        const updated = await updateEvent(editingEventId, payload);
        await loadEvents(updated.id, false);
        setFormMessage({
          type: 'success',
          text: `Updated "${updated.title}" successfully.`,
        });
      } else {
        const created = await createEvent(payload);
        await loadEvents(created.id, false);
        setFormMessage({
          type: 'success',
          text: `Created "${created.title}" successfully.`,
        });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormMessage({
        type: 'error',
        text: err.message || 'Failed to save event.',
      });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      await deleteEvent(eventId);
      const nextId = selectedEventId === eventId ? undefined : selectedEventId;
      await loadEvents(nextId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    await loadTicketsForEvent(eventId);
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: EventTicketStatus) => {
    setUpdatingTicketId(ticketId);
    try {
      await updateEventTicketStatus(ticketId, status);
      await loadEvents(selectedEventId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleResendTicketEmail = async (ticketId: string) => {
    setResendingTicketId(ticketId);
    try {
      await resendEventTicketEmail(ticketId);
      await loadEvents(selectedEventId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to resend ticket email');
    } finally {
      setResendingTicketId(null);
    }
  };

  const handleVerifyUuid = async (uuidToVerify: string) => {
    const clean = uuidToVerify.trim();
    if (!clean || verifyingQrRef.current) return;

    verifyingQrRef.current = true;
    setVerifyingQr(true);
    try {
      const targetEventId = selectedEventIdRef.current || selectedEventId || undefined;
      await verifyEventTicketQr(clean, targetEventId);
      await loadEvents(targetEventId ?? null, false);
    } catch (err: any) {
      alert(err.message || 'Failed to verify QR ticket UUID.');
    } finally {
      verifyingQrRef.current = false;
      setVerifyingQr(false);
    }
  };

  const selectedEventWithStats =
    events.find((e) => e.event.id === selectedEventId) || null;

  return (
    <div className="space-y-8">
      {/* =========================================================
         SECTION 1: CLUB EVENTS DIRECTORY & CREATE/EDIT FORM
         ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-[#525e3e] bg-[#f2f5ec] px-3 py-1 rounded-full mb-2">
              <Ticket className="w-3.5 h-3.5" />
              <span>Club Events &amp; Ticketing CMS</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Manage Club Events
            </h2>
            <p className="text-sm text-slate-600">
              Create and manage club events, ticket limits, release countdowns, and custom event
              logos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#525e3e] hover:bg-[#414b31] text-white font-extrabold text-sm shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Event</span>
          </button>
        </div>

        {formMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-bold border ${
              formMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {formMessage.text}
          </div>
        )}

        {/* CREATE / EDIT EVENT FORM */}
        {isFormOpen && (
          <form
            data-testid="event-admin-form"
            onSubmit={handleSaveEvent}
            className="mb-8 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingEventId ? 'Edit Club Event' : 'Create New Club Event'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label
                  htmlFor="admin-event-title"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Event Title *
                </label>
                <input
                  id="admin-event-title"
                  type="text"
                  required
                  placeholder="e.g. PRRC Christmas Party 2026"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="admin-event-description"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Event Description *
                </label>
                <textarea
                  id="admin-event-description"
                  rows={3}
                  required
                  placeholder="Describe the event, schedule, dress code, or what's included in the ticket..."
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-event-start-date"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Event Start Date &amp; Time *
                </label>
                <input
                  id="admin-event-start-date"
                  type="datetime-local"
                  required
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-event-sale-date"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Ticket Sale Countdown Date &amp; Time *
                </label>
                <input
                  id="admin-event-sale-date"
                  type="datetime-local"
                  required
                  value={saleStartAtInput}
                  onChange={(e) => setSaleStartAtInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-event-max-tickets"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Number of Tickets Available *
                </label>
                <input
                  id="admin-event-max-tickets"
                  type="number"
                  min={1}
                  required
                  value={maxTicketsInput}
                  onChange={(e) => setMaxTicketsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-event-price"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Ticket Price (£) *
                </label>
                <input
                  id="admin-event-price"
                  type="number"
                  step="0.01"
                  min={0.5}
                  required
                  value={ticketPriceInput}
                  onChange={(e) => setTicketPriceInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="admin-event-address"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5"
                >
                  Event Address / Venue *
                </label>
                <input
                  id="admin-event-address"
                  type="text"
                  required
                  placeholder="e.g. The Brentwood Tap, 48 High St, Brentwood CM14 4AN"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                />
              </div>

              {/* Event Logo Upload (Cloud Storage) with fallback to Standard Club Logo */}
              <div className="sm:col-span-2 bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={logoUrlInput.trim() ? logoUrlInput : '/logo.png'}
                    alt="Event Logo Preview"
                    className="w-14 h-14 rounded-full border border-slate-200 p-1 object-contain bg-white flex-shrink-0"
                  />
                  <div>
                    <div className="text-xs font-extrabold uppercase text-slate-700">
                      Event Logo
                    </div>
                    <div className="text-xs text-slate-500">
                      {logoUrlInput.trim()
                        ? 'Using custom uploaded logo from Cloud Storage'
                        : 'Using standard Peasants Revolt Running Club logo (/logo.png)'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload Custom Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                  {logoUrlInput.trim() && (
                    <button
                      type="button"
                      onClick={() => setLogoUrlInput('')}
                      className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Use Standard Logo</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="admin-event-from-email"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1.5 flex items-center space-x-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[#525e3e]" />
                  <span>Ticket Email Sender</span>
                </label>
                <input
                  id="admin-event-from-email"
                  type="text"
                  value={fromEmailInput}
                  onChange={(e) => setFromEmailInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEvent || uploadingLogo}
                className="px-6 py-2.5 rounded-xl bg-[#525e3e] hover:bg-[#414b31] disabled:opacity-50 text-white font-extrabold text-sm shadow-sm"
              >
                {savingEvent
                  ? 'Saving Event...'
                  : editingEventId
                  ? 'Save Event Changes'
                  : 'Create Event'}
              </button>
            </div>
          </form>
        )}

        {/* EVENTS LIST */}
        {loadingEvents ? (
          <p className="text-sm text-slate-500">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-slate-600 font-medium text-sm">
              No club events created yet. Click <strong>Add New Event</strong> above to schedule
              your first event.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((item) => {
              const evt = item.event;
              const isSelected = evt.id === selectedEventId;
              const logoSrc = evt.logoUrl?.trim() ? evt.logoUrl : '/logo.png';

              return (
                <div
                  key={evt.id}
                  data-testid={`admin-event-card-${evt.id}`}
                  onClick={() => handleSelectEvent(evt.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#525e3e] bg-[#f8faf5] ring-2 ring-[#9ba582]/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={logoSrc}
                          alt={evt.title}
                          className="w-11 h-11 rounded-full border border-slate-200 p-1 object-contain bg-white flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-base truncate">
                            {evt.title}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">{evt.address}</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-sm text-[#525e3e] bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex-shrink-0">
                        £{Number(evt.ticketPrice).toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center bg-white rounded-xl p-2.5 border border-slate-200 text-xs mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Sold
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {item.ticketsSold} / {evt.maxTickets}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Remaining
                        </span>
                        <span className="font-extrabold text-emerald-700">
                          {item.ticketsRemaining}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Checked In
                        </span>
                        <span className="font-extrabold text-indigo-700">
                          {item.ticketsCheckedIn}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                    <span className="font-bold text-slate-500">
                      {new Date(evt.startDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <div
                      className="flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/admin/scanner?eventId=${encodeURIComponent(evt.id)}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 font-bold"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Scan</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(item)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id, evt.title)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
         SECTION 2 & 3: SELECTED EVENT DOOR QR SCANNER LAUNCHER & ATTENDEES
         ========================================================= */}
      {selectedEventWithStats && (
        <>
          {/* DEDICATED DOOR QR SCANNER LAUNCHER CARD */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full mb-2">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Door Entry Check-In — {selectedEventWithStats.event.title}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Door QR Code Scanner
                </h2>
                <p className="text-sm text-slate-600">
                  Open the dedicated single-screen Door QR Scanner for{' '}
                  <strong>{selectedEventWithStats.event.title}</strong> with a compact square
                  viewfinder, instant green/red visual flash, and audio check-in cues.
                </p>
              </div>

              <Link
                href={`/admin/scanner?eventId=${encodeURIComponent(
                  selectedEventWithStats.event.id
                )}`}
                data-testid="open-door-scanner-link"
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center space-x-2 shadow-sm transition-all self-start sm:self-auto whitespace-nowrap"
              >
                <QrCode className="w-4 h-4" />
                <span>Open Door QR Scanner</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </Link>
            </div>
          </div>

          {/* EVENT ATTENDEE TICKETS LIST */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 mb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Attendees &amp; Ticket Orders — {selectedEventWithStats.event.title} (
                  {tickets.length})
                </h2>
                <p className="text-sm text-slate-600">
                  Marking a ticket as <strong>Payment Received</strong> automatically emails the
                  customer their branded QR code ticket.
                </p>
              </div>
            </div>

            {loadingTickets ? (
              <p className="text-sm text-slate-500">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No tickets have been ordered for this event yet.
              </p>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => {
                  const isCancelled = ticket.status === 'cancelled';
                  const isBusy = updatingTicketId === ticket.id;
                  const isResending = resendingTicketId === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      data-testid={`event-ticket-row-${ticket.id}`}
                      className={`rounded-2xl border p-5 transition-all ${
                        isCancelled
                          ? 'bg-slate-100 border-slate-200 opacity-60'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900">
                              {ticket.id}
                            </span>
                            <span
                              className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                                ticket.status === 'completed' || ticket.checkedIn
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : ticket.status === 'payment_successful'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ticket.status === 'cancelled'
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ticket.checkedIn
                                ? 'Checked In at Door'
                                : ticket.status === 'payment_successful'
                                ? 'Payment Received (Ticket Sent)'
                                : ticket.status === 'cancelled'
                                ? 'Cancelled'
                                : 'Pending Payment'}
                            </span>
                            {ticket.ticketEmailSentAt && (
                              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCheck className="w-3 h-3" />
                                <span>QR Email Sent</span>
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-bold text-slate-900">
                            {ticket.userName}{' '}
                            <span className="font-normal text-slate-600">
                              ({ticket.userEmail})
                            </span>
                          </div>

                          {ticket.ticketUuid && (
                            <div className="text-xs text-slate-500 font-mono">
                              Ticket UUID: <span className="select-all">{ticket.ticketUuid}</span>
                            </div>
                          )}
                        </div>

                        {!isCancelled && (
                          <div className="flex flex-wrap items-center gap-2">
                            {ticket.status === 'pending_payment' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateTicketStatus(ticket.id, 'payment_successful')
                                }
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Payment Received &amp; Send Ticket</span>
                              </button>
                            )}

                            {(ticket.status === 'payment_successful' ||
                              ticket.status === 'completed') && (
                              <button
                                type="button"
                                disabled={isResending}
                                onClick={() => handleResendTicketEmail(ticket.id)}
                                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center space-x-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>
                                  {isResending ? 'Sending...' : 'Resend Ticket Email'}
                                </span>
                              </button>
                            )}

                            {!ticket.checkedIn &&
                              (ticket.status === 'payment_successful' ||
                                ticket.status === 'completed') && (
                                <button
                                  type="button"
                                  disabled={verifyingQr}
                                  onClick={() =>
                                    ticket.ticketUuid && handleVerifyUuid(ticket.ticketUuid)
                                  }
                                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Check In Now</span>
                                </button>
                              )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'cancelled')}
                              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
