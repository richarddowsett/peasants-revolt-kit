'use client';

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
  Send,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import {
  ChristmasPartyStatus,
  DEFAULT_CHRISTMAS_FROM_EMAIL,
  TicketVerificationResult,
  isChristmasTicketOrderType,
} from '@/domain/models/ChristmasPartySettings';
import { Order, OrderStatus } from '@/domain/models/Order';
import {
  fetchChristmasPartyStatus,
  updateChristmasPartySettings,
  verifyChristmasTicketQr,
  resendChristmasTicketEmail,
} from '@/lib/api';

interface ChristmasPartyAdminPanelProps {
  orders: Order[];
  updatingOrderId: string | null;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onRefreshOrders: () => Promise<void>;
}

function toDatetimeLocalValue(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ChristmasPartyAdminPanel({
  orders,
  updatingOrderId,
  onUpdateOrderStatus,
  onCancelOrder,
  onRefreshOrders,
}: ChristmasPartyAdminPanelProps) {
  const [partyStatus, setPartyStatus] = useState<ChristmasPartyStatus | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Settings form state
  const [partyDateTimeInput, setPartyDateTimeInput] = useState('');
  const [saleStartAtInput, setSaleStartAtInput] = useState('');
  const [maxTicketsInput, setMaxTicketsInput] = useState('50');
  const [ticketPriceInput, setTicketPriceInput] = useState('25');
  const [partyLocationInput, setPartyLocationInput] = useState('');
  const [fromEmailInput, setFromEmailInput] = useState(DEFAULT_CHRISTMAS_FROM_EMAIL);

  // Door QR Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualUuidInput, setManualUuidInput] = useState('');
  const [verifyingQr, setVerifyingQr] = useState(false);
  const [scanResult, setScanResult] = useState<TicketVerificationResult | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedUuidRef = useRef<string>('');

  const loadPartySettings = async () => {
    setLoadingSettings(true);
    try {
      const data: ChristmasPartyStatus = await fetchChristmasPartyStatus();
      setPartyStatus(data);
      setPartyDateTimeInput(toDatetimeLocalValue(data.settings.partyDateTime));
      setSaleStartAtInput(toDatetimeLocalValue(data.settings.saleStartAt));
      setMaxTicketsInput(String(data.settings.maxTickets ?? 50));
      setTicketPriceInput(String(data.settings.ticketPrice ?? 25));
      setPartyLocationInput(data.settings.partyLocation || '');
      setFromEmailInput(data.settings.fromEmail || DEFAULT_CHRISTMAS_FROM_EMAIL);
    } catch (err) {
      console.error('Failed to load Christmas party settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadPartySettings();
    return () => {
      stopCameraScanner();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);
    setSavingSettings(true);

    try {
      const partyIso = partyDateTimeInput.trim()
        ? new Date(partyDateTimeInput).toISOString()
        : '';
      const saleIso = saleStartAtInput.trim()
        ? new Date(saleStartAtInput).toISOString()
        : '';

      const res = await updateChristmasPartySettings({
        partyDateTime: partyIso,
        saleStartAt: saleIso,
        maxTickets: Number(maxTicketsInput),
        ticketPrice: Number(ticketPriceInput),
        partyLocation: partyLocationInput.trim(),
        fromEmail: fromEmailInput.trim() || DEFAULT_CHRISTMAS_FROM_EMAIL,
      });

      setPartyStatus(res.status);
      setSettingsMessage({
        type: 'success',
        text: partyIso
          ? `Saved Christmas Party ${res.settings.eventYear} settings.`
          : 'Cleared Christmas party date. Holding page with Instagram link is now active.',
      });
    } catch (err: any) {
      setSettingsMessage({
        type: 'error',
        text: err.message || 'Failed to save Christmas party settings.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearPartyDate = async () => {
    setSettingsMessage(null);
    setSavingSettings(true);
    try {
      const res = await updateChristmasPartySettings({
        partyDateTime: '',
      });
      setPartyDateTimeInput('');
      setPartyStatus(res.status);
      setSettingsMessage({
        type: 'success',
        text: 'Christmas party date cleared. Customers now see "No Christmas party, please check Instagram for more details".',
      });
    } catch (err: any) {
      setSettingsMessage({
        type: 'error',
        text: err.message || 'Failed to clear Christmas party date.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVerifyUuid = async (uuidToVerify: string) => {
    const trimmed = uuidToVerify.trim();
    if (!trimmed || verifyingQr) return;

    setVerifyingQr(true);
    try {
      const result: TicketVerificationResult = await verifyChristmasTicketQr(trimmed);
      setScanResult(result);
      await onRefreshOrders();
      await loadPartySettings();
    } catch (err: any) {
      setScanResult({
        valid: false,
        reason: 'NOT_FOUND',
        message: err.message || 'Failed to verify QR code.',
      });
    } finally {
      setVerifyingQr(false);
    }
  };

  const stopCameraScanner = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setScanResult(null);
    lastScannedUuidRef.current = '';

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please use manual UUID verification below.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScannerActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
          requestAnimationFrame(tickQrFrame);
        }
      }, 100);
    } catch (err: any) {
      setCameraError(
        err.message || 'Unable to access camera. Check camera permissions or enter UUID below.'
      );
      setScannerActive(false);
    }
  };

  const tickQrFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim() && code.data.trim() !== lastScannedUuidRef.current) {
          lastScannedUuidRef.current = code.data.trim();
          stopCameraScanner();
          handleVerifyUuid(code.data.trim());
          return;
        }
      }
    }

    rafRef.current = requestAnimationFrame(tickQrFrame);
  };

  const handleResendEmail = async (orderId: string) => {
    setResendingOrderId(orderId);
    try {
      await resendChristmasTicketEmail(orderId);
      await onRefreshOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to resend ticket email');
    } finally {
      setResendingOrderId(null);
    }
  };

  const christmasTicketOrders = orders.filter((o) => isChristmasTicketOrderType(o.orderType));
  const activeYear = partyStatus?.settings.eventYear;
  const displayedTicketOrders = activeYear
    ? christmasTicketOrders.filter(
        (o) => o.orderType === `christmas_${activeYear}_ticket` || o.eventYear === activeYear
      )
    : christmasTicketOrders;

  const paidTicketsCount = displayedTicketOrders.filter(
    (o) => o.status === 'payment_successful' || o.status === 'completed'
  ).length;
  const checkedInCount = displayedTicketOrders.filter((o) => o.checkedIn).length;

  return (
    <div className="space-y-8">
      {/* Top Grid: Event Settings & Door QR Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Christmas Party Settings Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Ticket size={20} className="text-[rgb(82,94,62)]" />
                <span>Christmas Party Configuration</span>
              </h2>
              <p className="text-xs text-slate-500">
                Set the countdown sale date, ticket limit, price, and party date/location.
              </p>
            </div>
            {partyDateTimeInput && (
              <button
                type="button"
                onClick={handleClearPartyDate}
                disabled={savingSettings}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <Trash2 size={13} /> Clear Party Date
              </button>
            )}
          </div>

          {settingsMessage && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                settingsMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {settingsMessage.type === 'success' ? (
                <CheckCircle2 size={15} className="shrink-0" />
              ) : (
                <AlertTriangle size={15} className="shrink-0" />
              )}
              <span>{settingsMessage.text}</span>
            </div>
          )}

          {loadingSettings ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-[rgb(155,165,130)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="admin-party-datetime"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Christmas Party Date &amp; Time
                  </label>
                  <input
                    id="admin-party-datetime"
                    type="datetime-local"
                    value={partyDateTimeInput}
                    onChange={(e) => setPartyDateTimeInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Leave empty to show &quot;No Christmas party&quot; holding page.
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="admin-sale-start"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Ticket Sale Countdown Date &amp; Time
                  </label>
                  <input
                    id="admin-sale-start"
                    type="datetime-local"
                    value={saleStartAtInput}
                    onChange={(e) => setSaleStartAtInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="admin-max-tickets"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Ticket Limit (Max Tickets)
                  </label>
                  <input
                    id="admin-max-tickets"
                    type="number"
                    min={1}
                    value={maxTicketsInput}
                    onChange={(e) => setMaxTicketsInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-ticket-price"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Ticket Price (£)
                  </label>
                  <input
                    id="admin-ticket-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={ticketPriceInput}
                    onChange={(e) => setTicketPriceInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-party-location"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Christmas Party Location / Venue
                </label>
                <input
                  id="admin-party-location"
                  type="text"
                  value={partyLocationInput}
                  onChange={(e) => setPartyLocationInput(e.target.value)}
                  placeholder="e.g. The Brentwood Tap, Brentwood CM14"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-from-email"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Ticket Sender Email Address
                </label>
                <input
                  id="admin-from-email"
                  type="text"
                  value={fromEmailInput}
                  onChange={(e) => setFromEmailInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl shadow transition"
              >
                {savingSettings ? 'Saving Settings...' : 'Save Christmas Party Settings'}
              </button>
            </form>
          )}
        </div>

        {/* 2. Door QR Scanner Card (Auto Check-In) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <QrCode size={20} className="text-[rgb(82,94,62)]" />
                  <span>Door QR Ticket Scanner (Auto Check-In)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Scan customer QR codes at the door to verify their UUID and automatically confirm entry.
                </p>
              </div>
              {scannerActive ? (
                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                >
                  <CameraOff size={15} /> Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="bg-[rgb(82,94,62)] hover:bg-[rgb(68,78,50)] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                >
                  <Camera size={15} /> Scan with Camera
                </button>
              )}
            </div>

            {cameraError && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                {cameraError}
              </div>
            )}

            {scannerActive && (
              <div className="mb-4 rounded-2xl overflow-hidden bg-slate-900 border-2 border-[rgb(155,165,130)] relative">
                <video ref={videoRef} className="w-full h-56 object-cover" muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="bg-slate-900/90 text-white text-[11px] font-bold py-2 px-3 text-center">
                  Point camera at attendee&apos;s ticket QR code...
                </div>
              </div>
            )}

            {/* Scan / Verification Result Banner */}
            {scanResult && (
              <div
                data-testid="qr-scan-result"
                className={`mb-4 p-5 rounded-2xl border-2 ${
                  scanResult.valid
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : scanResult.reason === 'ALREADY_CHECKED_IN'
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-red-50 border-red-400 text-red-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {scanResult.valid ? (
                    <CheckCircle2 size={28} className="text-emerald-600 shrink-0" />
                  ) : scanResult.reason === 'ALREADY_CHECKED_IN' ? (
                    <AlertTriangle size={28} className="text-amber-600 shrink-0" />
                  ) : (
                    <XCircle size={28} className="text-red-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      {scanResult.valid
                        ? 'Entry Confirmed — Checked In!'
                        : scanResult.reason === 'ALREADY_CHECKED_IN'
                        ? 'Already Checked In'
                        : 'Entry Denied'}
                    </h3>
                    <p className="text-xs font-semibold mt-0.5">{scanResult.message}</p>
                    {scanResult.order && (
                      <div className="mt-3 pt-3 border-t border-black/10 text-xs space-y-1">
                        <div>
                          Attendee: <strong>{scanResult.order.userName}</strong> (
                          {scanResult.order.userEmail})
                        </div>
                        <div>
                          Order Ref:{' '}
                          <strong className="font-mono">{scanResult.order.id}</strong>
                        </div>
                        <div>
                          UUID:{' '}
                          <span className="font-mono text-[11px]">
                            {scanResult.order.ticketUuid}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual UUID Verification Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyUuid(manualUuidInput);
            }}
            className="pt-4 border-t border-slate-100"
          >
            <label
              htmlFor="manual-ticket-uuid"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Verify Ticket UUID (or USB/Bluetooth QR Scanner Input)
            </label>
            <div className="flex gap-2">
              <input
                id="manual-ticket-uuid"
                type="text"
                value={manualUuidInput}
                onChange={(e) => setManualUuidInput(e.target.value)}
                placeholder="Paste or scan ticket UUID..."
                className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl text-slate-900"
              />
              <button
                type="submit"
                disabled={verifyingQr || !manualUuidInput.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition shrink-0"
              >
                {verifyingQr ? 'Checking...' : 'Verify & Check In'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Ticket Limit {activeYear ? `(${activeYear})` : ''}
          </span>
          <span className="text-2xl font-black text-slate-900">
            {partyStatus?.settings.maxTickets ?? 50}
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Tickets Sold / Remaining
          </span>
          <span className="text-2xl font-black text-slate-900">
            {partyStatus?.ticketsSold ?? 0}{' '}
            <span className="text-xs font-semibold text-slate-500">
              ({partyStatus?.ticketsRemaining ?? 0} left)
            </span>
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Paid &amp; Ticket Emailed
          </span>
          <span className="text-2xl font-black text-blue-700">{paidTicketsCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Checked In at Door
          </span>
          <span className="text-2xl font-black text-emerald-700">{checkedInCount}</span>
        </div>
      </div>

      {/* Ticket Orders List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Christmas Party Ticket Orders ({displayedTicketOrders.length})
            </h3>
            <p className="text-xs text-slate-500">
              Marking a ticket as Payment Received automatically emails the branded QR code ticket from{' '}
              <span className="font-mono">{partyStatus?.settings.fromEmail}</span>.
            </p>
          </div>
        </div>

        {displayedTicketOrders.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No Christmas party ticket orders yet.
          </div>
        ) : (
          <div className="space-y-4">
            {displayedTicketOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {order.id}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        order.status === 'pending_payment'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'payment_successful'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {order.status === 'pending_payment'
                        ? 'Pending Payment'
                        : order.status === 'payment_successful'
                        ? 'Payment Received'
                        : order.status === 'completed'
                        ? 'Checked In'
                        : order.status}
                    </span>
                    {order.ticketEmailSentAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                        <Mail size={12} /> Ticket Email Sent
                      </span>
                    )}
                    {order.checkedIn && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        <CheckCheck size={12} /> Checked In at Door
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>{order.userName}</strong> &bull; {order.userEmail} &bull; £
                    {order.totalAmount.toFixed(2)}
                  </div>
                  {order.ticketUuid && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      UUID: {order.ticketUuid}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status === 'pending_payment' && (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => onUpdateOrderStatus(order.id, 'payment_successful')}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Payment Received &amp; Email Ticket</span>
                    </button>
                  )}

                  {(order.status === 'payment_successful' || order.status === 'completed') && (
                    <button
                      type="button"
                      disabled={resendingOrderId === order.id}
                      onClick={() => handleResendEmail(order.id)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
                    >
                      <Send size={13} />
                      <span>
                        {resendingOrderId === order.id ? 'Sending...' : 'Resend Ticket Email'}
                      </span>
                    </button>
                  )}

                  {order.status === 'payment_successful' && !order.checkedIn && order.ticketUuid && (
                    <button
                      type="button"
                      disabled={verifyingQr}
                      onClick={() => handleVerifyUuid(order.ticketUuid!)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
                    >
                      <CheckCheck size={14} />
                      <span>Confirm Door Entry</span>
                    </button>
                  )}

                  {order.status !== 'cancelled' && (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => onCancelOrder(order.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
