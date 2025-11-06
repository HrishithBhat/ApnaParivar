import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

export default function FamilyAdminPanel() {
  const [family, setFamily] = useState(null);
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('admin2');
  const [viewers, setViewers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
      try {
        // Get current user to determine familyId
        const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (!me.ok) throw new Error('Not authenticated');
  const meData = await me.json();
  setCurrentUserId(meData.user?._id || meData.user?.id || null);

        const famObj = meData.user?.primaryFamily?.familyId;
        // Prefer the real Mongo _id if present
        let idCandidate = typeof famObj === 'string' ? famObj : (famObj?._id || famObj?.$oid || '');
        // Capture slug if available
        const slugCandidate = typeof famObj === 'object' && famObj?.familyId ? String(famObj.familyId) : null;
        if (!idCandidate && !slugCandidate) throw new Error('No active family found');

        // Try fetching with id
        let res = idCandidate
          ? await fetch(apiUrl(`/api/families/${encodeURIComponent(String(idCandidate))}`), { credentials: 'include' })
          : { ok: false, status: 404 };

        // If that fails and we have a slug, resolve slug to id then retry
        if (!res.ok && slugCandidate) {
          try {
            const pub = await fetch(apiUrl(`/api/families/public/${encodeURIComponent(slugCandidate)}`), { credentials: 'include' });
            if (pub.ok) {
              const pubData = await pub.json();
              const resolvedId = pubData?.family?._id;
              if (resolvedId) {
                res = await fetch(apiUrl(`/api/families/${encodeURIComponent(String(resolvedId))}`), { credentials: 'include' });
              }
            }
          } catch {}
        }

        if (!res.ok) {
          let msg = `Failed to load family (HTTP ${res.status})`;
          try {
            const err = await res.json();
            if (err?.message) msg = err.message;
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();
        setFamily(data.family);
        setUserRole(data.family?.userRole || null);
        setViewers(data.family?.accessSettings?.allowedViewers || []);
        setSubscription(data.family?.subscription || null);
      } catch (e) {
        setError(e.message);
      }
  };

  useEffect(() => { load(); }, []);

  const addAdmin = async () => {
    if (!email) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/families/${family.id || family._id}/admins`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.toLowerCase().trim(), role: level }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to add admin');
      await load();
      alert(body.message || 'Admin added');
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeAdmin = async (role) => {
    if (!['admin2', 'admin3'].includes(role)) return;
    if (!confirm(`Remove ${role}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/families/${family.id || family._id}/admins/${role}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to remove admin');
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const approveViewer = async (viewerEmail) => {
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/families/${family.id || family._id}/viewers`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: String(viewerEmail || '').toLowerCase().trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to approve viewer');
      // Refresh from server to get canonical viewer list (objects with userId)
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const startPayment = async () => {
    setBusy(true);
    try {
      const res = await fetch(apiUrl('/api/payments/create-order'), { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Create order failed');
      const { order } = await res.json();
      // Mock verify
      const verify = await fetch(apiUrl('/api/payments/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: order.id || order._id, paymentId: 'mock_payment_id', signature: 'mock_signature' })
      });
      if (!verify.ok) throw new Error('Payment verification failed');
      const data = await verify.json();
      setSubscription(data.subscription);
      alert('Subscription activated');
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!family) return <div className="p-6">Loading...</div>;

  // Determine if current user is actually admin1 (by ID), or equivalent role
  const admin1Obj = family?.admins?.admin1?.userId;
  const admin1Id = typeof admin1Obj === 'object' ? (admin1Obj?._id || admin1Obj?.id) : admin1Obj;
  const isAdmin1ById = currentUserId && admin1Id && String(admin1Id) === String(currentUserId);
  const canAdminAssign = isAdmin1ById || userRole === 'admin1' || userRole === 'creator';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Family Admin Panel</h1>

      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="font-medium">{family.familyName}</div>
        <div className="text-sm text-gray-600">Family ID: {family.familyId}</div>
        <div className="text-sm text-gray-600">Subscription: {subscription?.status || 'inactive'} {subscription?.subscriptionEndsAt && `(till ${new Date(subscription.subscriptionEndsAt).toLocaleDateString()})`}</div>
        <div className="text-sm text-gray-700 mt-1">Your role: {userRole || 'viewer'}</div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Assign Sub Admins</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {['admin1','admin2','admin3'].map((r) => {
            const u = family?.admins?.[r]?.userId;
            const canClear = r !== 'admin1' && canAdminAssign;
            return (
              <div key={r} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium uppercase">{r}</div>
                  <div className="text-xs text-gray-600 break-all">{u ? (u.email || u.name || u._id) : '—'}</div>
                </div>
                {r !== 'admin1' && (
                  <button
                    disabled={busy || !u || !canClear}
                    onClick={() => canClear && removeAdmin(r)}
                    className={`text-sm ${canClear ? 'text-red-600' : 'text-gray-400 cursor-not-allowed'} disabled:opacity-50`}
                    title={canClear ? 'Remove admin' : 'Only Admin1 can remove'}
                  >
                    Clear
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="User email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={!canAdminAssign}
          />
          <select
            className="border rounded px-3 py-2"
            value={level}
            onChange={e => setLevel(e.target.value)}
            disabled={!canAdminAssign}
          >
            <option value="admin2">Admin 2</option>
            <option value="admin3">Admin 3</option>
          </select>
          <button
            disabled={busy || !canAdminAssign}
            onClick={addAdmin}
            className={`px-4 py-2 rounded ${canAdminAssign ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            title={canAdminAssign ? 'Add admin' : 'Only Admin1 can add admins'}
          >
            Add
          </button>
        </div>
        {!canAdminAssign && (
          <p className="text-xs text-gray-500 mt-2">Only the family creator (admin1) can add or remove admins. You can still see who is assigned.</p>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Approve Viewers</h2>
        <div className="space-y-2">
          {(Array.isArray(viewers) ? viewers : []).map((v, i) => {
            const userObj = typeof v?.userId === 'object' ? v.userId : null;
            const id = userObj?._id || (typeof v?.userId === 'string' ? v.userId : i);
            const label = userObj ? (userObj.email || userObj.name || userObj._id) : (typeof v?.userId === 'string' ? v.userId : 'viewer');
            return (
              <div key={id} className="text-sm text-gray-700 break-all">{label}</div>
            );
          })}
          {(!Array.isArray(viewers) || viewers.length === 0) && (
            <div className="text-sm text-gray-500">No approved viewers yet.</div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <input className="border rounded px-3 py-2 flex-1" placeholder="Viewer email" onKeyDown={(e) => { if (e.key === 'Enter') approveViewer(e.currentTarget.value) }} />
          <button disabled={busy} onClick={() => {
            const input = document.querySelector('input[placeholder="Viewer email"]');
            if (input?.value) approveViewer(input.value)
          }} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">Approve</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Subscription</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700">Status: {subscription?.status || 'inactive'}</div>
            {subscription?.subscriptionEndsAt && <div className="text-xs text-gray-500">Ends at: {new Date(subscription.subscriptionEndsAt).toLocaleString()}</div>}
          </div>
          <button disabled={busy} onClick={startPayment} className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-60">Pay ₹500 / year</button>
        </div>
      </div>
    </div>
  );
}
