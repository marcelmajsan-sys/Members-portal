import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '16. eCommerce Akademija | eCommerce Hrvatska',
  description:
    'Mentorska edukacija o planiranju, vođenju i razvoju uspješne online trgovine. 8 modula, vrhunski predavači, certifikat. Upisi otvoreni!',
  openGraph: {
    title: '16. eCommerce Akademija | eCommerce Hrvatska',
    description:
      'Naučite kako izgraditi webshop koji privlači i zadržava kupce uz provjerene metode vodećih stručnjaka.',
    type: 'website',
  },
};

export default function AkademijaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
