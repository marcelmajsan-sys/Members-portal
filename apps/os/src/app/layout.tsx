import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import SwRegister from './sw-register';
import InstallPrompt from './install-prompt';

export const metadata: Metadata = {
  title: 'Operator Zone — eCommerce HR',
  description: 'Interni sustav za upravljanje',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'eCommerce OS',
  },
  icons: {
    apple: '/admin/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B365D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <SwRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
