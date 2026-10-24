'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import Link from 'next/link';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  ClubEventWithStats,
  EventTicketVerificationResult,
} from '@/domain/models/ClubEvent';
import { fetchEvents, verifyEventTicketQr } from '@/lib/api';

export type ScanFlashType = 'success' | 'warning' | 'error' | null;

/**
 * Synthesizes clear door-scanner audio cues using the Web Audio API
 * (no external audio files required) and triggers mobile haptic feedback.
 */
export function playScanFeedbackCue(
  status: EventTicketVerificationResult['status'],
  soundEnabled = true
): void {
  if (typeof window === 'undefined') return;

  // Trigger haptic vibration on supported mobile devices
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (status === 'checked_in_now') {
        navigator.vibrate([80, 40, 140]);
      } else if (status === 'already_checked_in') {
        navigator.vibrate([140, 60, 140]);
      } else {
        navigator.vibrate([320]);
      }
    }
  } catch {
    // Ignore vibration errors
  }

  if (!soundEnabled) return;

  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startTime: number,
      duration: number,
      type: OscillatorType = 'sine',
      peakGain = 0.25
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    };

    if (status === 'checked_in_now') {
      // Bright ascending major chime (D5 -> A5 -> D6)
      playTone(587.33, now, 0.11, 'sine', 0.28);
      playTone(880.0, now + 0.09, 0.12, 'sine', 0.3);
      playTone(1174.66, now + 0.18, 0.24, 'triangle', 0.32);
    } else if (status === 'already_checked_in') {
      // Double amber alert beep (A4 -> A4)
      playTone(440.0, now, 0.13, 'triangle', 0.28);
      playTone(440.0, now + 0.18, 0.18, 'triangle', 0.28);
    } else {
      // Low descending error buzz (Eb4 -> A3)
      playTone(311.13, now, 0.18, 'sawtooth', 0.24);
      playTone(207.65, now + 0.16, 0.28, 'sawtooth', 0.28);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore Web Audio errors when blocked by browser autoplay policy
  }
}

interface BarcodeDetectorLike {
  detect(video: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
};

interface DoorQrScannerProps {
  initialEventId?: string | null;
  autoStartCamera?: boolean;
}

export default function DoorQrScanner({
  initialEventId = null,
  autoStartCamera = false,
}: DoorQrScannerProps) {
  const [events, setEvents] = useState<ClubEventWithStats[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualUuidInput, setManualUuidInput] = useState('');
  const [verifyingQr, setVerifyingQr] = useState(false);
  const [scanResult, setScanResult] = useState<EventTicketVerificationResult | null>(null);
  const [flashType, setFlashType] = useState<ScanFlashType>(null);
  const [scanCount, setScanCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedUuidRef = useRef<string>('');
  const lastScannedAtRef = useRef<number>(0);
  const selectedEventIdRef = useRef<string | null>(initialEventId);
  const verifyingQrRef = useRef<boolean>(false);
  const soundEnabledRef = useRef<boolean>(true);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const triggerVisualAndAudioFeedback = useCallback(
    (result: EventTicketVerificationResult) => {
      const nextFlash: ScanFlashType =
        result.status === 'checked_in_now'
          ? 'success'
          : result.status === 'already_checked_in'
          ? 'warning'
          : 'error';

      setFlashType(nextFlash);
      setScanCount((prev) => prev + 1);
      playScanFeedbackCue(result.status, soundEnabledRef.current);

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = setTimeout(() => {
        setFlashType(null);
      }, 1800);
    },
    []
  );

  const loadEvents = useCallback(
    async (preferredEventId?: string | null, showSpinner = false) => {
      if (showSpinner) setLoadingEvents(true);
      try {
        const list: ClubEventWithStats[] = await fetchEvents(true);
        const safeList = Array.isArray(list) ? list : [];
        setEvents(safeList);

        const targetId =
          preferredEventId && safeList.some((e) => e.event.id === preferredEventId)
            ? preferredEventId
            : selectedEventIdRef.current &&
              safeList.some((e) => e.event.id === selectedEventIdRef.current)
            ? selectedEventIdRef.current
            : safeList[0]?.event.id || null;

        setSelectedEventId(targetId);
      } catch (err) {
        console.error('Failed to load events for scanner:', err);
      } finally {
        if (showSpinner) setLoadingEvents(false);
      }
    },
    []
  );

  const stopCameraScanner = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
  }, []);

  const handleVerifyUuid = useCallback(
    async (uuidToVerify: string) => {
      const clean = uuidToVerify.trim();
      if (!clean || verifyingQrRef.current) return;

      verifyingQrRef.current = true;
      setVerifyingQr(true);
      try {
        const targetEventId = selectedEventIdRef.current || undefined;
        const result: EventTicketVerificationResult = await verifyEventTicketQr(
          clean,
          targetEventId
        );
        setScanResult(result);
        triggerVisualAndAudioFeedback(result);
        await loadEvents(targetEventId ?? null, false);
      } catch (err: unknown) {
        const fallbackResult: EventTicketVerificationResult = {
          valid: false,
          status: 'not_found',
          message: (err as Error).message || 'Failed to verify QR ticket UUID.',
        };
        setScanResult(fallbackResult);
        triggerVisualAndAudioFeedback(fallbackResult);
      } finally {
        verifyingQrRef.current = false;
        setVerifyingQr(false);
      }
    },
    [loadEvents, triggerVisualAndAudioFeedback]
  );

  const startCameraScanner = useCallback(async () => {
    setCameraError(null);
    lastScannedUuidRef.current = '';
    lastScannedAtRef.current = 0;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access is not supported in this browser. Please use manual UUID verification below.'
      );
      return;
    }

    try {
      stopCameraScanner();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setScannerActive(true);
    } catch (err: unknown) {
      setCameraError(
        (err as Error).message || 'Could not access camera. Please check camera permissions.'
      );
      setScannerActive(false);
    }
  }, [stopCameraScanner]);

  useEffect(() => {
    loadEvents(initialEventId, true);
    if (autoStartCamera) {
      startCameraScanner();
    }
    return () => {
      stopCameraScanner();
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [initialEventId, autoStartCamera, loadEvents, startCameraScanner, stopCameraScanner]);

  useEffect(() => {
    if (!scannerActive || !streamRef.current) {
      return;
    }

    let cancelled = false;
    const stream = streamRef.current;
    const video = videoRef.current;

    if (video) {
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('Video autoplay warning:', err);
        });
      }
    }

    let detector: BarcodeDetectorLike | null = null;
    const win = typeof window !== 'undefined' ? (window as WindowWithBarcodeDetector) : undefined;
    if (win?.BarcodeDetector) {
      try {
        detector = new win.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (cancelled || !streamRef.current) return;

      const currentVideo = videoRef.current;
      const canvas = canvasRef.current;

      if (
        currentVideo &&
        currentVideo.readyState >= 2 &&
        currentVideo.videoWidth > 0 &&
        currentVideo.videoHeight > 0
      ) {
        let detectedValue: string | null = null;

        if (detector) {
          try {
            const barcodes = await detector.detect(currentVideo);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedValue = String(barcodes[0].rawValue).trim();
            }
          } catch {
            // Fallback to jsQR
          }
        }

        if (!detectedValue && canvas) {
          const rawWidth = currentVideo.videoWidth || 320;
          const rawHeight = currentVideo.videoHeight || 240;
          // Crop central square region for fast QR decoding
          const cropSize = Math.min(rawWidth, rawHeight);
          const sx = Math.floor((rawWidth - cropSize) / 2);
          const sy = Math.floor((rawHeight - cropSize) / 2);
          const targetSize = Math.min(cropSize, 480);

          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              currentVideo,
              sx,
              sy,
              cropSize,
              cropSize,
              0,
              0,
              targetSize,
              targetSize
            );
            const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              detectedValue = code.data.trim();
            }
          }
        }

        const now = Date.now();
        const isNewCode = detectedValue !== lastScannedUuidRef.current;
        const cooldownElapsed = now - lastScannedAtRef.current > 3500;

        if (detectedValue && (isNewCode || cooldownElapsed) && !verifyingQrRef.current) {
          lastScannedUuidRef.current = detectedValue;
          lastScannedAtRef.current = now;
          setManualUuidInput(detectedValue);
          await handleVerifyUuid(detectedValue);
        }
      }

      if (!cancelled && streamRef.current) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    };

    rafRef.current = requestAnimationFrame(scanFrame);

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scannerActive, handleVerifyUuid]);

  const handleResetScan = () => {
    setScanResult(null);
    setFlashType(null);
    setManualUuidInput('');
    lastScannedUuidRef.current = '';
    lastScannedAtRef.current = 0;
  };

  const selectedEventWithStats =
    events.find((e) => e.event.id === selectedEventId) || events[0] || null;

  return (
    <div
      data-testid="door-qr-scanner-screen"
      className={`rounded-3xl border-2 transition-all duration-300 p-4 sm:p-6 shadow-md ${
        flashType === 'success'
          ? 'bg-emerald-950/5 border-emerald-500 ring-4 ring-emerald-500/40'
          : flashType === 'warning'
          ? 'bg-amber-950/5 border-amber-500 ring-4 ring-amber-500/40'
          : flashType === 'error'
          ? 'bg-red-950/5 border-red-500 ring-4 ring-red-500/40'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* FULL-WIDTH FLASH BANNER ON SCAN */}
      {flashType && (
        <div
          data-testid="qr-flash-banner"
          role="alert"
          className={`mb-4 py-2.5 px-4 rounded-2xl text-center font-black uppercase tracking-wider text-sm sm:text-base text-white shadow-lg animate-pulse flex items-center justify-center space-x-2 ${
            flashType === 'success'
              ? 'bg-emerald-600'
              : flashType === 'warning'
              ? 'bg-amber-500'
              : 'bg-red-600'
          }`}
        >
          {flashType === 'success' ? (
            <>
              <Sparkles className="w-5 h-5" />
              <span>VALID TICKET — ENTRY CONFIRMED!</span>
            </>
          ) : flashType === 'warning' ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span>HOLD ON — TICKET ALREADY CHECKED IN</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span>STOP — INVALID OR UNPAID TICKET</span>
            </>
          )}
        </div>
      )}

      {/* COMPACT HEADER & EVENT SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <Link
            href="/admin/events"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to CMS</span>
          </Link>
          <div className="inline-flex items-center space-x-1.5 text-xs font-extrabold uppercase tracking-wider text-[#525e3e] bg-[#f2f5ec] px-2.5 py-1 rounded-full">
            <QrCode className="w-3.5 h-3.5" />
            <span>Door Scanner</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {selectedEventWithStats && (
            <div
              data-testid="scanner-checkin-stats"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                Checked In: {selectedEventWithStats.ticketsCheckedIn} /{' '}
                {selectedEventWithStats.ticketsSold}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-label={soundEnabled ? 'Mute scanner audio' : 'Unmute scanner audio'}
            className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              soundEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* EVENT DROPDOWN SELECTOR */}
      {!loadingEvents && events.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="scanner-event-select"
            className="text-xs font-extrabold uppercase text-slate-600 whitespace-nowrap"
          >
            Scanning Event:
          </label>
          <select
            id="scanner-event-select"
            value={selectedEventWithStats?.event.id || ''}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              handleResetScan();
            }}
            className="flex-grow px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-extrabold text-slate-900 text-sm"
          >
            {events.map((item) => (
              <option key={item.event.id} value={item.event.id}>
                {item.event.title} ({item.ticketsCheckedIn}/{item.ticketsSold} Checked In)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SINGLE-SCREEN MAIN GRID: COMPACT SQUARE CAMERA + LIVE RESULT PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* LEFT / TOP: COMPACT SQUARE QR CAMERA VIEWFINDER */}
        <div className="md:col-span-5 bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              QR Viewfinder
            </span>
            <button
              type="button"
              onClick={scannerActive ? stopCameraScanner : startCameraScanner}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 transition-all ${
                scannerActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#9ba582] hover:bg-[#8a9470] text-slate-950'
              }`}
            >
              {scannerActive ? (
                <>
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Launch Camera QR Scanner</span>
                </>
              )}
            </button>
          </div>

          {cameraError && (
            <div className="w-full mb-2 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold">
              {cameraError}
            </div>
          )}

          {/* COMPACT SQUARE QR BOX (192x192 / 224x224 instead of full portrait) */}
          <div
            className={`relative w-48 h-48 sm:w-56 sm:h-56 aspect-square rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center transition-all duration-200 ${
              flashType === 'success'
                ? 'ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                : flashType === 'warning'
                ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
                : flashType === 'error'
                ? 'ring-4 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]'
                : 'border-2 border-[#9ba582]/70'
            }`}
          >
            {scannerActive ? (
              <>
                <video
                  ref={videoRef}
                  data-testid="qr-scanner-video"
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Corner target reticles */}
                <div className="pointer-events-none absolute inset-4">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white/90 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white/90 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white/90 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white/90 rounded-br-lg" />
                </div>
              </>
            ) : (
              <div className="p-4 text-slate-400 flex flex-col items-center space-y-2">
                <QrCode className="w-12 h-12 text-[#9ba582]/70" />
                <span className="text-xs font-semibold">
                  Tap <strong>Launch Camera QR Scanner</strong> to start scanning
                </span>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Center the QR code inside the square frame
          </p>
        </div>

        {/* RIGHT / BOTTOM: PROMINENT VISUAL SCAN RESULT & MANUAL VERIFY */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          {/* LIVE SCAN STATUS CARD (ALWAYS VISIBLE IN SINGLE VIEW) */}
          {scanResult ? (
            <div
              key={scanCount}
              data-testid="qr-scan-result"
              className={`flex-grow rounded-2xl border-2 p-4 sm:p-5 flex flex-col justify-between transition-all ${
                scanResult.status === 'checked_in_now'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                  : scanResult.status === 'already_checked_in'
                  ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg'
                  : 'bg-red-600 border-red-400 text-white shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        scanResult.status === 'checked_in_now'
                          ? 'bg-white text-emerald-700'
                          : scanResult.status === 'already_checked_in'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-white text-red-700'
                      }`}
                    >
                      {scanResult.status === 'checked_in_now' ? (
                        <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                      ) : scanResult.status === 'already_checked_in' ? (
                        <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
                      ) : (
                        <XCircle className="w-8 h-8 stroke-[2.5]" />
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-90">
                        {scanResult.status === 'checked_in_now'
                          ? 'Entry Confirmed — Checked In'
                          : scanResult.status === 'already_checked_in'
                          ? 'Already Checked In'
                          : scanResult.status === 'unpaid'
                          ? 'Payment Pending — Not Yet Paid'
                          : scanResult.status === 'cancelled'
                          ? 'Ticket Cancelled'
                          : scanResult.status === 'wrong_event'
                          ? 'Wrong Event Ticket'
                          : 'Invalid Ticket'}
                      </div>
                      <h3 className="text-lg sm:text-xl font-black leading-tight mt-0.5">
                        {scanResult.ticket
                          ? scanResult.ticket.userName
                          : scanResult.status === 'checked_in_now'
                          ? 'Valid Ticket'
                          : 'Entry Denied'}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetScan}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center space-x-1 flex-shrink-0 ${
                      scanResult.status === 'already_checked_in'
                        ? 'bg-slate-950/15 hover:bg-slate-950/25 text-slate-950'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Next</span>
                  </button>
                </div>

                <p className="mt-3 text-sm sm:text-base font-bold opacity-95">
                  {scanResult.message}
                </p>
              </div>

              {scanResult.ticket && (
                <div
                  className={`mt-3 pt-3 border-t text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
                    scanResult.status === 'already_checked_in'
                      ? 'border-slate-950/20'
                      : 'border-white/25'
                  }`}
                >
                  <span>
                    Attendee: <strong>{scanResult.ticket.userName}</strong> (
                    {scanResult.ticket.userEmail})
                  </span>
                  <span className="font-mono px-2 py-0.5 rounded bg-black/20">
                    Ref: {scanResult.ticket.id}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mb-2" />
              <div className="text-sm font-extrabold text-slate-700">
                Ready to Scan Next Ticket
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Hold a ticket QR code up to the square camera viewfinder or paste a Ticket UUID
                below. Green/Red visual flash &amp; audio tone will play immediately.
              </p>
            </div>
          )}

          {/* COMPACT MANUAL UUID FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyUuid(manualUuidInput);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              placeholder="Paste or scan Ticket UUID..."
              value={manualUuidInput}
              onChange={(e) => setManualUuidInput(e.target.value)}
              aria-label="Ticket UUID"
              className="flex-grow px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm"
            />
            <button
              type="submit"
              disabled={verifyingQr || !manualUuidInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#525e3e] hover:bg-[#414b31] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm whitespace-nowrap"
            >
              {verifyingQr ? 'Verifying...' : 'Verify & Check In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
