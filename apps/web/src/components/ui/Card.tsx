interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border-light overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
