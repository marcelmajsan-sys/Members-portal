import type { MetadataRoute } from 'next';

// PWA manifest — Next ga servira na /manifest.webmanifest i sam dodaje <link>
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'eCommerce Hrvatska — Članski portal',
    short_name: 'eCommerce HR',
    description: 'Portal za članove Udruge eCommerce Hrvatska',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1B365D',
    lang: 'hr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
