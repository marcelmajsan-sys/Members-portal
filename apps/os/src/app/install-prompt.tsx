'use client';

import { useEffect, useState } from 'react';

// Chrome/Edge na Androidu: hvatamo beforeinstallprompt i nudimo vlastiti gumb za instalaciju.
// Event ne postoji u TS lib-u pa ga minimalno tipiziramo.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    // Banner samo na mobilnim uređajima — na desktopu instalaciju ne nudimo
    if (!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'dismissed') localStorage.setItem(DISMISS_KEY, '1');
    setPromptEvent(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setPromptEvent(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl bg-primary p-4 text-white shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instaliraj aplikaciju</p>
          <p className="text-xs text-white/70">Brži pristup s početnog zaslona</p>
        </div>
        <button
          onClick={install}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-white/90"
        >
          Instaliraj
        </button>
        <button onClick={dismiss} aria-label="Zatvori" className="p-1 text-white/60 hover:text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
