import { cn } from '../../lib/cn';

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    gray: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'bg-transparent border border-gray-300 text-gray-800 hover:bg-gray-50 focus:ring-gray-400',
    subtle: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300'
  };
  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5'
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
