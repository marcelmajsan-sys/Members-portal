interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  accentBar?: boolean;
  className?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({
  title,
  subtitle,
  accentBar = false,
  className = '',
  align = 'center',
}: SectionHeadingProps) {
  return (
    <div className={`${align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      {accentBar && (
        <div
          className={`w-12 h-1 bg-accent rounded-full mb-4 ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        />
      )}
      <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-heading leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-text-secondary mt-4">{subtitle}</p>
      )}
    </div>
  );
}
