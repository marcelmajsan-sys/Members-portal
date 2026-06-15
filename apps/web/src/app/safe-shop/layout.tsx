import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Safe Shop - Certifikacija webshopa | eCommerce Hrvatska',
  description:
    'Safe Shop je oznaka povjerenja za online trgovine. Certifikacija webshopa prema kriterijima kupaca uz sustav za prikupljanje i prikaz recenzija.',
  openGraph: {
    title: 'Safe Shop - Certifikacija webshopa | eCommerce Hrvatska',
    description:
      'Pokažite kupcima da vam mogu vjerovati. Učlanite se u udrugu eCommerce Hrvatska i ostvarite pravo na besplatnu certifikaciju webshopa.',
    type: 'website',
  },
};

export default function SafeShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
