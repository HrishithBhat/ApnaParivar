import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
  const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (!me.ok) { navigate('/'); return; }
        const meData = await me.json();
        const famIdRaw = meData.user?.primaryFamily?.familyId;
        const famId = typeof famIdRaw === 'string' ? famIdRaw : (famIdRaw?._id || famIdRaw?.$oid || String(famIdRaw));
        if (!famId) { navigate('/dashboard'); return; }
  const famRes = await fetch(apiUrl(`/api/families/${encodeURIComponent(famId)}`), { credentials: 'include' });
        if (famRes.ok) {
          const fam = await famRes.json();
          setFamily(fam.family);
        }
        // Prefer GET /api/events which returns current family events per backend summary
  const evRes = await fetch(apiUrl('/api/events'), { credentials: 'include' });
        if (!evRes.ok) {
          const err = await evRes.json();
          throw new Error(err.error || 'Failed to load events');
        }
        const data = await evRes.json();
        setEvents(data.events || []);
      } catch (e) {
        console.error('Load events error:', e);
        setError(e.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <AppLayout title="Events" subtitle={family?.familyName}>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading events...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const formatWhen = (e) => {
    const d = e.date || e.when || e.happenedOn;
    if (!d) return '';
    return new Date(d).toLocaleString();
  };

  return (
    <AppLayout title="Events" subtitle={family?.familyName}>
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader title="Family Events" subtitle="Timeline of important family moments" actions={<Button onClick={() => navigate('/add-event')}>Add Event</Button>} />
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center text-gray-600">No events added yet.</div>
            ) : (
              <ol className="relative border-s border-gray-200">
                {events.sort((a,b) => new Date(b.date||b.when||b.happenedOn) - new Date(a.date||a.when||a.happenedOn)).map(e => (
                  <li key={e._id} className="mb-10 ms-4">
                    <div className="absolute w-3 h-3 bg-indigo-200 rounded-full mt-1.5 -start-1.5 border border-white"></div>
                    <time className="mb-1 text-sm font-normal leading-none text-gray-500">{formatWhen(e)}</time>
                    <h3 className="text-lg font-semibold text-gray-900">{e.title || e.name}</h3>
                    {e.description && <p className="mb-2 text-base font-normal text-gray-600">{e.description}</p>}
                    {e.location && <p className="text-sm text-gray-500">Location: {e.location}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
