import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [{ label: 'Početna', href: '/' }, ...items];

  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-sm text-text-secondary ${className}`}
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-text-muted">/</span>}
            {item.href && index < allItems.length - 1 ? (
              <Link
                href={item.href}
                className="text-primary hover:text-accent transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={index === allItems.length - 1 ? 'text-text-secondary font-medium' : ''}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
