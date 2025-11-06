import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import { apiUrl } from '../lib/api';

export default function DummyCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [familyId, setFamilyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fam = location.state?.familyId;
    if (!fam) {
      navigate('/billing');
      return;
    }
    setFamilyId(fam);
  }, [location.state, navigate]);

  const payNow = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(apiUrl('/api/payments/dummy/activate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ familyId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to activate subscription');
      }
      navigate('/billing');
    } catch (e) {
      setError(e.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Checkout">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-600">{error}</div>
        )}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">ApnaParivar Yearly Plan</h2>
        <p className="text-gray-700 mb-6">₹500 per year • First year free (demo). This is a dummy checkout for testing without Razorpay.</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/billing')}>Cancel</Button>
          <Button onClick={payNow} disabled={submitting}>
            {submitting ? 'Processing…' : 'Pay Now (Dummy)'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
