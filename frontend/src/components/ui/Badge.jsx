import { cn } from '../../lib/cn';

export default function Badge({ color = 'gray', children, className }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-800'
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[color] || colors.gray, className)}>
      {children}
    </span>
  );
}
