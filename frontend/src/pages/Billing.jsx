import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { apiUrl } from '../lib/api';

export default function Billing() {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState('');
  const [status, setStatus] = useState(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadStatus = async (famId) => {
    const res = await fetch(apiUrl(`/api/payments/status?familyId=${encodeURIComponent(famId)}`), { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load billing status');
    }
    const data = await res.json();
    setPaymentsEnabled(data.paymentsEnabled !== false);
    setStatus(data.family?.subscription ? {
      ...data.family.subscription,
      familyName: data.family.name,
      id: data.family.id,
    } : null);
  };

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
        setFamilyId(famId);
        await loadStatus(famId);
      } catch (e) {
        setError(e.message || 'Failed to load billing');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const loadRazorpayScript = () => new Promise((resolve) => {
    if (document.getElementById('rzp-checkout')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'rzp-checkout';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const startPayment = async () => {
    if (!familyId) return;
    setError(null);
    setPaying(true);
    try {
      if (!paymentsEnabled) {
        // Dummy flow: navigate to internal checkout UI
        navigate('/checkout', { state: { familyId } });
        return;
      }

      // Real provider (Razorpay) flow preserved if ever enabled later
      const res = await fetch(apiUrl('/api/payments/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ familyId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create order');
      }
      const { provider, order, keyId } = await res.json();

      if (provider === 'razorpay') {
        const ok = await loadRazorpayScript();
        if (!ok) throw new Error('Failed to load Razorpay');

        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'ApnaParivar',
          description: 'Yearly Subscription',
          order_id: order.id,
          prefill: { name: user?.name || '', email: user?.email || '' },
          theme: { color: '#4f46e5' },
          handler: async function (response) {
            try {
              const verifyRes = await fetch(apiUrl('/api/payments/verify'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ familyId, razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature })
              });
              if (!verifyRes.ok) { const err = await verifyRes.json().catch(() => ({})); throw new Error(err.message || 'Verification failed'); }
              await loadStatus(familyId);
              alert('Payment successful! Subscription activated.');
            } catch (e) { setError(e.message || 'Payment verification failed'); }
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Payments are disabled');
      }
    } catch (e) {
      setError(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const TrialInfo = () => {
    if (!status) return null;
    const now = new Date();
    const trialEnd = status.trialEndsAt ? new Date(status.trialEndsAt) : null;
    const subEnd = status.subscriptionEndsAt ? new Date(status.subscriptionEndsAt) : null;
    const activeTrial = status.status === 'trial' && trialEnd && trialEnd > now;
    const activePaid = status.status === 'active' && subEnd && subEnd > now;

    let msg = '';
    let daysLeft = 0;

    if (activeTrial) {
      daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      msg = `Free trial active • ${daysLeft} day(s) remaining`;
    } else if (activePaid) {
      daysLeft = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
      msg = `Subscription active • ${daysLeft} day(s) remaining`;
    } else {
      msg = 'Subscription expired';
    }

    return (
      <div className={`p-4 rounded-lg ${activeTrial ? 'bg-emerald-50 border border-emerald-200' : activePaid ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{status.familyName || 'Your Family'}</h3>
            <p className="text-sm text-gray-700 mt-1">{msg}</p>
            {!paymentsEnabled && (
              <p className="text-xs text-gray-500 mt-1">Payments are turned off for now. You can continue using the free plan.</p>
            )}
          </div>
          <div>
            {activePaid ? (
              <button disabled className="px-4 py-2 bg-gray-300 text-gray-700 rounded">Active</button>
            ) : (
              <button onClick={startPayment} disabled={paying} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                {paymentsEnabled ? 'Pay ₹500' : 'Pay ₹500 '}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout title="Billing">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading billing...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Billing">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader title="Subscription" subtitle="Manage your plan and status" />
          <CardContent className="space-y-6">
          <TrialInfo />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Plan</h3>
            <p className="text-gray-700">ApnaParivar Yearly Plan • ₹500/year • First year free</p>
            {!paymentsEnabled && (
              <p className="text-sm text-gray-500 mt-1">Billing is disabled right now. No payment is required.</p>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-700 text-sm">We offer a 1-year free trial for every new family. After the trial ends, the subscription is ₹500/year. Payments are currently turned off and will be available later.</p>
          </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
