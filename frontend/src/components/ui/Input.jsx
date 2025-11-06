import { cn } from '../../lib/cn';

export default function Input({ label, hint, error, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <input
        className={cn(
          'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          error ? 'border-red-300' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </label>
  );
}
