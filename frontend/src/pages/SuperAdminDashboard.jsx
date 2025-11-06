import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [families, setFamilies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, fam, pay] = await Promise.all([
          fetch(apiUrl('/api/admin/overview'), { credentials: 'include' }),
          fetch(apiUrl('/api/admin/families'), { credentials: 'include' }),
          fetch(apiUrl('/api/admin/payments'), { credentials: 'include' })
        ]);
        if (!ov.ok) throw new Error('Overview failed');
        if (!fam.ok) throw new Error('Families failed');
        if (!pay.ok) throw new Error('Payments failed');
        setOverview((await ov.json()).data);
        setFamilies((await fam.json()).families || []);
        setPayments((await pay.json()).payments || []);
      } catch (e) {
        setError(e.message);
      }
    };
    load();
  }, []);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!overview) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Super Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500">Users</div>
          <div className="text-xl font-semibold">{overview.users.total} total / {overview.users.active} active</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500">Families</div>
          <div className="text-xl font-semibold">{overview.families.total} total / {overview.families.active} active</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500">Paid Payments</div>
          <div className="text-xl font-semibold">{overview.payments.totalPaid}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-8">
        <h2 className="text-lg font-semibold mb-2">Recent Payments</h2>
        <div className="divide-y">
          {payments.slice(0, 10).map(p => (
            <div key={p._id} className="py-2 text-sm text-gray-700 flex justify-between">
              <span>{p.invoice?.invoiceNumber || p.transactionId}</span>
              <span>₹{(p.amount/100).toFixed(2)}</span>
            </div>
          ))}
          {payments.length === 0 && <div className="text-sm text-gray-500">No payments yet.</div>}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Families</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {families.map(f => (
            <div key={f._id} className="border rounded p-3">
              <div className="font-medium">{f.familyName}</div>
              <div className="text-xs text-gray-500">{f.familyId}</div>
              <div className="text-xs text-gray-500 mt-1">Creator: {f.createdBy?.name} ({f.createdBy?.email})</div>
              <div className="text-xs text-gray-500 mt-1">Subscription: {f.subscription?.status} {(f.subscription?.subscriptionEndsAt ? `(till ${new Date(f.subscription.subscriptionEndsAt).toLocaleDateString()})` : '')}</div>
            </div>
          ))}
          {families.length === 0 && <div className="text-sm text-gray-500">No families found.</div>}
        </div>
      </div>
    </div>
  );
}
