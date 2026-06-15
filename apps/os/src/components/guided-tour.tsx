'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
}

interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/* ── Step icons ─────────────────────────────────────────────── */
const STEP_ICONS: Record<string, string> = {
  dashboard: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z',
  members: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  offers: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  tasks: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  team: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  email: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
  automation: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z',
  notifications: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
  search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
};

/* ── Position calculator ────────────────────────────────────── */
function getTargetEl(step: TourStep): Element | null {
  return (
    document.querySelector(`[data-tour="${step.target}"]`) ||
    document.querySelector(step.target)
  );
}

function getPosition(
  targetRect: DOMRect,
  tooltipW: number,
  tooltipH: number,
  preferred: TourStep['position'],
): { top: number; left: number; arrow: 'top' | 'bottom' | 'left' | 'right' } {
  const pad = 20;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const attempts: Array<TourStep['position']> = preferred
    ? [preferred, 'bottom', 'right', 'top', 'left']
    : ['bottom', 'right', 'top', 'left'];

  for (const pos of attempts) {
    switch (pos) {
      case 'bottom': {
        const t = targetRect.bottom + pad;
        const l = Math.max(pad, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, vw - tooltipW - pad));
        if (t + tooltipH < vh - pad) return { top: t, left: l, arrow: 'top' };
        break;
      }
      case 'top': {
        const t = targetRect.top - tooltipH - pad;
        const l = Math.max(pad, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, vw - tooltipW - pad));
        if (t > pad) return { top: t, left: l, arrow: 'bottom' };
        break;
      }
      case 'right': {
        const t = Math.max(pad, Math.min(targetRect.top + targetRect.height / 2 - tooltipH / 2, vh - tooltipH - pad));
        const l = targetRect.right + pad;
        if (l + tooltipW < vw - pad) return { top: t, left: l, arrow: 'left' };
        break;
      }
      case 'left': {
        const t = Math.max(pad, Math.min(targetRect.top + targetRect.height / 2 - tooltipH / 2, vh - tooltipH - pad));
        const l = targetRect.left - tooltipW - pad;
        if (l > pad) return { top: t, left: l, arrow: 'right' };
        break;
      }
    }
  }

  return { top: vh / 2 - tooltipH / 2, left: vw / 2 - tooltipW / 2, arrow: 'top' };
}

/* ── Welcome screen ─────────────────────────────────────────── */
function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-[#0a1628]/80 backdrop-blur-sm" onClick={onSkip} />
      <div
        className={`relative z-10 w-[440px] overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-700 ${
          visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'
        }`}
      >
        {/* Header gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1B365D] via-[#234175] to-[#1B365D] px-8 pb-8 pt-10">
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#E8A838]/20 blur-2xl" />
          <div className="absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-[#E8A838]/10 blur-xl" />

          <div className="relative">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <svg className="h-7 w-7 text-[#E8A838]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Dobrodošli, Marcel!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Pripremili smo kratki vodič kroz sve mogućnosti sustava. Traje manje od minute.
            </p>
          </div>
        </div>

        {/* Features preview */}
        <div className="px-8 py-6">
          <div className="space-y-3">
            {[
              { icon: '1', label: 'Navigacija i ključne sekcije' },
              { icon: '2', label: 'Upravljanje članovima i ponudama' },
              { icon: '3', label: 'Automatizacija i email predlošci' },
            ].map((item) => (
              <div key={item.icon} className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1B365D]/10 text-xs font-bold text-[#1B365D]">
                  {item.icon}
                </span>
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 transition hover:bg-gray-50"
            >
              Preskoči
            </button>
            <button
              onClick={onStart}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#1B365D] to-[#234175] py-3 text-sm font-semibold text-white shadow-lg shadow-[#1B365D]/25 transition hover:shadow-xl hover:shadow-[#1B365D]/30 active:scale-[0.98]"
            >
              Pokreni vodič
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Completion screen ──────────────────────────────────────── */
function CompletionScreen({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-[#0a1628]/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-[400px] overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-700 ${
          visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-12'
        }`}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-8 py-10 text-center">
          <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Sve je spremno!</h2>
            <p className="mt-2 text-sm text-white/80">Vodič je završen. Sada znate gdje se sve nalazi.</p>
          </div>
        </div>
        <div className="px-8 py-6 text-center">
          <p className="text-sm text-gray-500">
            Gumb <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1B365D] text-xs font-bold text-white">?</span> je uvijek dostupan dolje desno ako vam zatreba.
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#1B365D] to-[#234175] py-3 text-sm font-semibold text-white shadow-lg shadow-[#1B365D]/25 transition hover:shadow-xl active:scale-[0.98]"
          >
            Započni rad
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function GuidedTour({ steps, isOpen, onClose, onComplete }: GuidedTourProps) {
  const [phase, setPhase] = useState<'welcome' | 'tour' | 'complete'>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrow: 'top' | 'bottom' | 'left' | 'right' }>({ top: 0, left: 0, arrow: 'top' });
  const [animClass, setAnimClass] = useState('');
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const updatePosition = useCallback(() => {
    if (!step || phase !== 'tour') return;
    const el = getTargetEl(step);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestAnimationFrame(() => {
        setTargetRect(el.getBoundingClientRect());
      });
    }
  }, [step, phase]);

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const pos = getPosition(targetRect, tooltipRect.width, tooltipRect.height, step?.position);
    setTooltipPos(pos);
  }, [targetRect, step]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setPhase('welcome');
      setCurrentStep(0);
      setTargetRect(null);
    }
  }, [isOpen]);

  // Position tracking during tour
  useEffect(() => {
    if (phase !== 'tour') return;

    setAnimClass('tour-tooltip-enter');
    const animTimer = setTimeout(() => setAnimClass('tour-tooltip-visible'), 50);
    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      clearTimeout(animTimer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, phase, updatePosition]);

  // Keyboard
  useEffect(() => {
    if (!isOpen || phase !== 'tour') return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, phase, currentStep]);

  function handleClose() {
    onClose();
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setAnimClass('tour-tooltip-exit');
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
      }, 200);
    } else {
      setPhase('complete');
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setAnimClass('tour-tooltip-exit');
      setTimeout(() => {
        setCurrentStep((s) => s - 1);
      }, 200);
    }
  }

  if (!isOpen) return null;

  /* ── Phase: Welcome ── */
  if (phase === 'welcome') {
    return (
      <WelcomeScreen
        onStart={() => setPhase('tour')}
        onSkip={handleClose}
      />
    );
  }

  /* ── Phase: Complete ── */
  if (phase === 'complete') {
    return (
      <CompletionScreen
        onClose={() => {
          onComplete();
        }}
      />
    );
  }

  /* ── Phase: Tour ── */
  const pad = 10;
  const iconPath = step.icon ? STEP_ICONS[step.icon] : null;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Inline keyframes */}
      <style>{`
        @keyframes tour-spotlight-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(232,168,56,0.4), 0 0 24px 4px rgba(232,168,56,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(232,168,56,0.25), 0 0 40px 8px rgba(232,168,56,0.2); }
        }
        .tour-tooltip-enter {
          opacity: 0;
          transform: translateY(12px) scale(0.96);
        }
        .tour-tooltip-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tour-tooltip-exit {
          opacity: 0;
          transform: translateY(-8px) scale(0.97);
          transition: all 0.2s ease-in;
        }
        @keyframes tour-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tour-dot-pop {
          0% { transform: scale(0.5); }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="fixed inset-0 z-[9999]" style={{ animation: 'tour-fade-in 0.3s ease-out' }}>
        {/* Dark overlay with SVG cutout */}
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - pad}
                  y={targetRect.top - pad}
                  width={targetRect.width + pad * 2}
                  height={targetRect.height + pad * 2}
                  rx="14"
                  fill="black"
                  style={{ transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(10, 22, 40, 0.75)"
            mask="url(#tour-mask)"
            style={{ pointerEvents: 'auto', backdropFilter: 'blur(2px)' }}
            onClick={handleClose}
          />
        </svg>

        {/* Animated spotlight ring */}
        {targetRect && (
          <div
            className="absolute rounded-2xl"
            style={{
              top: targetRect.top - pad,
              left: targetRect.left - pad,
              width: targetRect.width + pad * 2,
              height: targetRect.height + pad * 2,
              pointerEvents: 'none',
              border: '2px solid rgba(232, 168, 56, 0.6)',
              animation: 'tour-spotlight-pulse 2s ease-in-out infinite',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}

        {/* Tooltip card */}
        <div
          ref={tooltipRef}
          className={`absolute z-10 w-[380px] ${animClass}`}
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1f38]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {/* Top accent bar with progress */}
            <div className="relative h-1 bg-white/5">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#E8A838] to-[#f0c060]"
                style={{ width: `${progress}%`, transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </div>

            <div className="p-6">
              {/* Header row: icon + step counter + close */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {iconPath && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E8A838]/15">
                      <svg className="h-5 w-5 text-[#E8A838]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="text-[15px] font-bold text-white">{step.title}</h3>
                    <span className="text-[11px] font-medium text-white/40">
                      Korak {currentStep + 1} od {steps.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white/60"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Description */}
              <p className="text-[13px] leading-relaxed text-white/65">{step.description}</p>

              {/* Step dots */}
              <div className="mt-5 flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'w-6 bg-[#E8A838]'
                        : i < currentStep
                        ? 'w-1.5 bg-[#E8A838]/40'
                        : 'w-1.5 bg-white/15'
                    }`}
                    style={i === currentStep ? { animation: 'tour-dot-pop 0.3s ease-out' } : undefined}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={handleClose}
                  className="text-[12px] text-white/30 transition hover:text-white/50"
                >
                  Preskoči
                </button>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                      Natrag
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#E8A838] to-[#f0c060] px-5 py-2.5 text-[13px] font-bold text-[#1B365D] shadow-lg shadow-[#E8A838]/20 transition hover:shadow-xl hover:shadow-[#E8A838]/30 active:scale-[0.97]"
                  >
                    {currentStep === steps.length - 1 ? 'Završi' : 'Dalje'}
                    {currentStep < steps.length - 1 && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
