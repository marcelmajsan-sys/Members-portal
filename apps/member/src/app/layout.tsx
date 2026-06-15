import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Member Zone — eCommerce Hrvatska',
  description: 'Portal za članove eCommerce Hrvatska udruge',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body className="bg-bg-light min-h-screen">{children}</body>
    </html>
  );
}
