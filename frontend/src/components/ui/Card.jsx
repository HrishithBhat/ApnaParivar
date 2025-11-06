import { cn } from '../../lib/cn';

export function Card({ className, children }) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, title, subtitle, actions }) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200 flex items-start justify-between', className)}>
      <div>
        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function CardContent({ className, children }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}
