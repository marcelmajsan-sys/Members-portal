import type { MetadataRoute } from 'next';

// PWA manifest admin panela — Next ga servira na /admin/manifest.webmanifest i sam dodaje <link>.
// Putanje ikona moraju eksplicitno uključivati /admin (basePath se ne primjenjuje na stringove u manifestu).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'eCommerce HR OS — Admin panel',
    short_name: 'eCommerce OS',
    description: 'Interni sustav Udruge eCommerce Hrvatska',
    id: '/admin',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1B365D',
    lang: 'hr',
    icons: [
      { src: '/admin/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/admin/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/admin/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
