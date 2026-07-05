'use client';

import { useEffect } from 'react';

// Registracija service workera (samo u produkciji, kad je podržan).
// Putanja mora eksplicitno uključivati /admin (basePath ne prefiksira stringove u JS-u).
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/admin/sw.js').catch(() => {
      /* PWA je progresivno poboljšanje — greška registracije ne smije ništa srušiti */
    });
  }, []);
  return null;
}
