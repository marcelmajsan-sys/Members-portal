import Link from 'next/link';

interface MembershipCardProps {
  title: string;
  subtitle?: string;
  price: string;
  benefits: string[];
  featured?: boolean;
  ctaText: string;
  ctaLink: string;
  className?: string;
}

export default function MembershipCard({
  title,
  subtitle,
  price,
  benefits,
  featured = false,
  ctaText,
  ctaLink,
  className = '',
}: MembershipCardProps) {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col ${
        featured
          ? 'gradient-primary text-white scale-105 shadow-xl border-t-4 border-accent relative z-10'
          : 'bg-white text-text-dark shadow-sm border border-border-light'
      } ${className}`}
    >
      {/* Header */}
      <div className="px-8 pt-8 pb-4 text-center">
        <h3
          className={`font-heading text-xl font-bold ${
            featured ? 'text-white' : 'text-text-heading'
          }`}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={`mt-2 text-sm ${
              featured ? 'text-white/80' : 'text-text-secondary'
            }`}
          >
            {subtitle}
          </p>
        )}
        <div className="mt-6">
          <span
            className={`text-4xl font-bold ${
              featured ? 'text-white' : 'text-primary'
            }`}
          >
            {price}
          </span>
        </div>
      </div>

      {/* Benefits */}
      <div className="flex-1 px-8 py-6">
        <ul className="space-y-3">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5 text-accent"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className={featured ? 'text-white/90' : 'text-text-body'}>
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-8 pb-8 pt-4">
        <Link
          href={ctaLink}
          className={`block text-center rounded-lg px-6 py-3 font-semibold transition-all duration-200 ${
            featured
              ? 'bg-white text-primary hover:bg-white/90 shadow-sm'
              : 'bg-accent text-primary hover:bg-accent-light shadow-sm hover:shadow-md'
          }`}
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
