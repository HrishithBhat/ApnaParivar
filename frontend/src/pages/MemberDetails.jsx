import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { apiUrl } from '../lib/api';

export default function MemberDetails() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Ensure logged in
  const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (!me.ok) {
          navigate('/');
          return;
        }
        const meData = await me.json();
        setUser(meData.user);

  const res = await fetch(apiUrl(`/api/members/${encodeURIComponent(memberId)}`), { credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to load member');
        }
        const data = await res.json();
        setMember(data.member);
      } catch (e) {
        setError(e.message || 'Failed to load member');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [memberId, navigate]);

  const copyId = async () => {
    if (!member?.id) return;
    try {
      await navigator.clipboard.writeText(member.id);
      alert('Member ID copied');
    } catch {
      // no-op
    }
  };

  if (loading) {
    return (
      <AppLayout title="Member Details">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading member details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Member Details">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {member && (
          <Card>
            <CardHeader title={`${member.firstName} ${member.lastName}`} subtitle={member.gender ? member.gender.charAt(0).toUpperCase()+member.gender.slice(1) : '—'} />
            <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 mt-1">DOB: {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : '—'}</p>
                <div className="mt-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">ID: {member.id}</span>
                    <Button size="sm" onClick={copyId}>Copy ID</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Parents</h3>
                <ul className="text-gray-700 list-disc list-inside">
                  <li>Father: {member.parents?.father ? `${member.parents.father.firstName} ${member.parents.father.lastName}` : '—'}</li>
                  <li>Mother: {member.parents?.mother ? `${member.parents.mother.firstName} ${member.parents.mother.lastName}` : '—'}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Spouses</h3>
                {member.spouses?.length ? (
                  <ul className="text-gray-700 list-disc list-inside">
                    {member.spouses.map((s, idx) => (
                      <li key={idx}>{s.member?.firstName} {s.member?.lastName} {s.isCurrentSpouse ? '(current)' : ''}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">—</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Children</h3>
              {member.children?.length ? (
                <ul className="text-gray-700 list-disc list-inside">
                  {member.children.map((c) => (
                    <li key={c._id || c.id}>{c.firstName} {c.lastName}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">—</p>
              )}
            </div>

            <div className="flex justify-end mt-8 gap-3">
              <Button variant="gray" onClick={() => navigate(`/tree?focus=${encodeURIComponent(member.id)}`)}>View in Tree</Button>
              <Button variant="outline" onClick={() => navigate('/members')}>Close</Button>
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
