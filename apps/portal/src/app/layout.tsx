import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Članski portal — eCommerce Hrvatska',
  description: 'Portal za članove Udruge eCommerce Hrvatska',
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
      </body>
    </html>
  );
}
