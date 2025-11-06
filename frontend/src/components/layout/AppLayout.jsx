import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { apiUrl } from '../../lib/api';

export default function AppLayout({ title, subtitle, actions, children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
  fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (mounted && data?.user) setUser(data.user); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-indigo-600 hover:text-indigo-700">←</button>
              <span className="text-xl font-bold text-indigo-600">ApnaParivar</span>
              {title && <span className="text-gray-700">/</span>}
              {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
            </div>
            <div className="flex items-center gap-3">
              {actions}
              {user && (
                <div className="flex items-center gap-2">
                  <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-full" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {subtitle && (
        <div className="bg-indigo-50 border-b border-indigo-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-sm text-indigo-800">{subtitle}</p>
          </div>
        </div>
      )}

      <main className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8')}>
        {children}
      </main>
    </div>
  );
}
