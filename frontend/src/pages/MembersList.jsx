import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { apiUrl } from '../lib/api';

export default function MembersList() {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // member being edited
  const [editData, setEditData] = useState({ firstName: '', lastName: '', gender: '', dateOfBirth: '' });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const fetchMembers = async (famId, q = '') => {
    const url = new URL(apiUrl('/api/members'));
    url.searchParams.set('familyId', famId);
    if (q && q.trim()) url.searchParams.set('q', q.trim());
    url.searchParams.set('ts', Date.now());
    const res = await fetch(url.toString(), { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load members');
    }
    const data = await res.json();
    setMembers(data.members || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
  const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (!me.ok) {
          navigate('/');
          return;
        }
        const meData = await me.json();
        setUser(meData.user);
        const famIdRaw = meData.user?.primaryFamily?.familyId;
        const famId = typeof famIdRaw === 'string' ? famIdRaw : (famIdRaw?._id || famIdRaw?.$oid || String(famIdRaw));
        if (!famId) {
          navigate('/dashboard');
          return;
        }
        setFamilyId(famId);
  const famRes = await fetch(apiUrl(`/api/families/${encodeURIComponent(famId)}?ts=${Date.now()}`) , { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } });
        if (famRes.ok) {
          const fam = await famRes.json();
          setFamily(fam.family);
        }
        await fetchMembers(famId);
      } catch (e) {
        console.error('Load members error:', e);
        setError(e.message || 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  // Debounce search
  useEffect(() => {
    if (!familyId) return;
    const t = setTimeout(() => {
      fetchMembers(familyId, query).catch(e => setError(e.message || 'Failed to load members'));
    }, 300);
    return () => clearTimeout(t);
  }, [query, familyId]);

  if (loading) {
    return (
      <AppLayout title="Members" subtitle={family?.familyName}>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading members...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Members" subtitle={family?.familyName}>
      <div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader title="Family Members" subtitle="Search and manage members in your family" />
          <CardContent>
            <div className="flex items-end justify-between mb-4 gap-3">
              <div className="w-full md:w-1/2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or Member ID..."
                  hint="Try: first name, last name, or 24-char member ID."
                />
              </div>
              <div className="hidden md:block">
                <Button variant="secondary" onClick={() => navigate('/add-member')}>Add Member</Button>
              </div>
            </div>
          {members.length === 0 ? (
            <div className="text-center py-10 text-gray-600">No members found yet.</div>
          ) : (
            <div className="overflow-x-auto relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((m) => {
                    const isAdmin = !!(family?.admins?.admin1?.userId === user?._id ||
                      family?.admins?.admin1?.userId?._id === user?._id ||
                      family?.admins?.admin2?.userId === user?._id ||
                      family?.admins?.admin2?.userId?._id === user?._id ||
                      family?.admins?.admin3?.userId === user?._id ||
                      family?.admins?.admin3?.userId?._id === user?._id ||
                      user?.primaryFamily?.role === 'creator');
                    return (
                    <tr key={m._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">
                        <div className="flex flex-col">
                          <span>{m.firstName} {m.lastName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="text-xs text-gray-500">{m._id}</code>
                            <button
                              type="button"
                              className="text-xs text-indigo-600 hover:underline"
                              onClick={() => {
                                navigator.clipboard?.writeText(m._id).then(() => {
                                  // Optional: lightweight feedback
                                });
                              }}
                            >Copy ID</button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-700 capitalize">{m.gender || '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{m.dateOfBirth ? new Date(m.dateOfBirth).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="gray" onClick={() => navigate(`/tree?focus=${encodeURIComponent(m._id)}`)}>View in Tree</Button>
                          <Button size="sm" variant="subtle" onClick={() => navigate(`/member/${encodeURIComponent(m._id)}`)}>View Details</Button>
                          <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(m._id)}>Copy ID</Button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {isAdmin && (
                            <>
                              <Button
                                onClick={() => {
                                  setEditing(m);
                                  setEditData({
                                    firstName: m.firstName || '',
                                    lastName: m.lastName || '',
                                    gender: m.gender || '',
                                    dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth).toISOString().split('T')[0] : '',
                                    email: m.email || '',
                                    phone: m.contactInfo?.phone || '',
                                    address: m.contactInfo?.address || ''
                                  });
                                }}
                                size="sm"
                              >Edit</Button>
                              <Button
                                onClick={async () => {
                                  const ok = window.confirm(`Delete ${m.firstName} ${m.lastName}? This cannot be undone.`);
                                  if (!ok) return;
                                  try {
                                    const res = await fetch(apiUrl(`/api/members/${m._id}`), { method: 'DELETE', credentials: 'include' });
                                    if (!res.ok) {
                                      let msg = 'Failed to delete member';
                                      try { const err = await res.json(); msg = err.message || msg; } catch {}
                                      throw new Error(msg);
                                    }
                                    setMembers(prev => prev.filter(x => x._id !== m._id));
                                    // Notify other views (e.g., FamilyTree) to refresh
                                    window.dispatchEvent(new CustomEvent('apna:familyChanged'));
                                  } catch (e) {
                                    setError(e.message || 'Failed to delete member');
                                  }
                                }}
                                variant="danger" size="sm"
                              >Delete</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Member</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setEditing(null)}>✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">First Name</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={editData.firstName} onChange={e => setEditData(d => ({...d, firstName: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Last Name</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={editData.lastName} onChange={e => setEditData(d => ({...d, lastName: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Gender</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={editData.gender} onChange={e => setEditData(d => ({...d, gender: e.target.value}))}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2" value={editData.dateOfBirth} onChange={e => setEditData(d => ({...d, dateOfBirth: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input type="email" className="w-full border rounded-lg px-3 py-2" value={editData.email || ''} onChange={e => setEditData(d => ({...d, email: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone</label>
                  <input type="tel" className="w-full border rounded-lg px-3 py-2" value={editData.phone || ''} onChange={e => setEditData(d => ({...d, phone: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Address</label>
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={editData.address || ''} onChange={e => setEditData(d => ({...d, address: e.target.value}))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button
                  disabled={saving}
                  onClick={async () => {
                    if (!editData.firstName?.trim() || !editData.lastName?.trim()) {
                      setError('First and last name are required');
                      return;
                    }
                    setSaving(true);
                    try {
                      const res = await fetch(apiUrl(`/api/members/${editing._id}`), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          firstName: editData.firstName,
                          lastName: editData.lastName,
                          gender: editData.gender,
                          dateOfBirth: editData.dateOfBirth || undefined,
                          email: editData.email || undefined,
                          address: editData.address || undefined,
                          phone: editData.phone || undefined
                        })
                      });
                      if (!res.ok) {
                        let msg = 'Failed to update member';
                        try { const err = await res.json(); msg = err.message || msg; } catch {}
                        throw new Error(msg);
                      }
                      const data = await res.json();
                      const updated = data.member || editing;
                      setMembers(prev => prev.map(x => x._id === editing._id ? { ...x, ...updated } : x));
                      setEditing(null);
                      // Notify other views (e.g., FamilyTree) to refresh
                      window.dispatchEvent(new CustomEvent('apna:familyChanged'));
                    } catch (e) {
                      setError(e.message || 'Failed to update member');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
