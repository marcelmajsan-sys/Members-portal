import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  href,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-200';

  const variants = {
    primary:
      'bg-accent text-primary rounded-lg px-6 py-3 hover:bg-accent-light shadow-sm hover:shadow-md',
    secondary:
      'border-2 border-primary text-primary rounded-lg px-6 py-3 hover:bg-primary hover:text-white',
    ghost:
      'text-primary hover:text-primary-light underline-offset-4 hover:underline',
  };

  const classes = `${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}
