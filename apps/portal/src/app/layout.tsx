import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import SwRegister from './sw-register';

export const metadata: Metadata = {
  title: 'Članski portal — eCommerce Hrvatska',
  description: 'Portal za članove Udruge eCommerce Hrvatska',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'eCommerce HR',
  },
  icons: {
    apple: '/apple-touch-icon.png',
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
      </body>
    </html>
  );
}
