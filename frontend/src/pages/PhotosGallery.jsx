import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function PhotosGallery() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
  const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (!me.ok) { navigate('/'); return; }
        const meData = await me.json();
        setUser(meData.user);
        const famIdRaw = meData.user?.primaryFamily?.familyId;
        const famId = typeof famIdRaw === 'string' ? famIdRaw : (famIdRaw?._id || famIdRaw?.$oid || String(famIdRaw));
        if (!famId) { navigate('/dashboard'); return; }
  const famRes = await fetch(apiUrl(`/api/families/${encodeURIComponent(famId)}`), { credentials: 'include' });
        if (famRes.ok) {
          const fam = await famRes.json();
          setFamily(fam.family);
        }
  const photosRes = await fetch(apiUrl(`/api/photos/family/${encodeURIComponent(famId)}`), { credentials: 'include' });
        if (!photosRes.ok) {
          const err = await photosRes.json();
          throw new Error(err.error || 'Failed to load photos');
        }
        const data = await photosRes.json();
        setPhotos(data.photos || []);
      } catch (e) {
        console.error('Load photos error:', e);
        setError(e.message || 'Failed to load photos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <AppLayout title="Photos" subtitle={family?.familyName}>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading photos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Photos" subtitle={family?.familyName}>
      <div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader title="Family Photos" subtitle="Browse your uploaded memories" actions={<Button variant="secondary" onClick={() => navigate('/upload-photos')}>Upload Photos</Button>} />
          <CardContent>
            {photos.length === 0 ? (
              <div className="text-center text-gray-600">No photos uploaded yet.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(p => (
                  <div key={p._id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md transition" onClick={() => setPreview(p)}>
                    <img src={p.url} alt={p.title} className="w-full h-48 object-cover" />
                    <div className="p-3">
                      <div className="font-medium text-gray-900 truncate">{p.title || 'Photo'}</div>
                      {p.description && <div className="text-sm text-gray-600 truncate">{p.description}</div>}
                      <div className="text-xs text-gray-500 mt-1">{new Date(p.uploadedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {preview && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <img src={preview.url} alt={preview.title} className="w-full max-h-[70vh] object-contain bg-black" />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{preview.title || 'Photo'}</div>
                  {preview.description && <div className="text-sm text-gray-600 mt-1">{preview.description}</div>}
                </div>
                <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
