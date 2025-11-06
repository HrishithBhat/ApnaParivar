import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { apiUrl } from '../lib/api';

const FamilyDashboard = () => {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFamily, setNewFamily] = useState({ 
    familyName: '', 
    description: '' 
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include'
      });
      
      if (!response.ok) {
        navigate('/');
        return;
      }
      
      const userData = await response.json();
      setUser(userData.user);
      
      // If user has a family, fetch family data
      if (userData.user.primaryFamily?.familyId) {
        await fetchFamilyData(userData.user.primaryFamily.familyId);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const toIdString = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'object') {
      // handle {_id}, {$oid}, or ObjectId-like objects
      if (id._id) return toIdString(id._id);
      if (id.$oid) return String(id.$oid);
      if (id.toString && typeof id.toString === 'function') return id.toString();
    }
    return String(id);
  };

  const fetchFamilyData = async (familyId) => {
    try {
      const familyIdStr = encodeURIComponent(toIdString(familyId));
      if (!familyIdStr) return;
      const response = await fetch(apiUrl(`/api/families/${familyIdStr}`), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const familyData = await response.json();
        setFamily(familyData.family);
      }
    } catch (err) {
      console.error('Error fetching family data:', err);
    }
  };

  const createFamily = async (e) => {
    e.preventDefault();
    if (!newFamily.familyName.trim()) return;

    try {
      const response = await fetch(apiUrl('/api/families'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newFamily)
      });

      if (response.ok) {
        const result = await response.json();
        setFamily(result.family);
        setShowCreateForm(false);
        setNewFamily({ familyName: '', description: '' });
        
        // Refresh user data to get updated family info
        await fetchUserData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create family');
      }
    } catch (err) {
      console.error('Error creating family:', err);
      setError('Failed to create family');
    }
  };

  const copyFamilyLink = () => {
    if (family) {
      const familyLink = `${window.location.origin}/join/${family.familyId || family._id}`;
      navigator.clipboard.writeText(familyLink);
      alert('Family invitation link copied to clipboard!');
    }
  };

  const logout = async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your family tree...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle={family?.familyName} actions={<Button variant="outline" onClick={logout}>Logout</Button>}>
      <div className="space-y-6">
        {!user?.primaryFamily?.familyId ? (
          // No family - Show create family option
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader title="Create Your Family Tree" subtitle="Start building your family tree and invite your relatives to collaborate!" />
              <CardContent>
                {!showCreateForm ? (
                  <Button className="w-full" onClick={() => setShowCreateForm(true)}>Create Family Tree</Button>
                ) : (
                  <form onSubmit={createFamily} className="space-y-4">
                    <Input
                      placeholder="Family Name (e.g., The Sharma Family)"
                      value={newFamily.familyName}
                      onChange={(e) => setNewFamily({...newFamily, familyName: e.target.value})}
                      required
                    />
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-1">Family Description</span>
                      <textarea
                        placeholder="Optional"
                        value={newFamily.description}
                        onChange={(e) => setNewFamily({...newFamily, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows={3}
                      />
                    </label>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1">Create Family</Button>
                      <Button type="button" variant="gray" className="flex-1" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Has family - Show family dashboard
          <div className="space-y-6">
            <Card>
              <CardHeader
                title={family?.familyName || 'Your Family Tree'}
                subtitle={family?.description}
                actions={user.primaryFamily.role === 'creator' && (
                  <Button onClick={copyFamilyLink}>Share Family Link</Button>
                )}
              />
              <CardContent>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Badge color={user.primaryFamily.role === 'creator' ? 'green' : 'indigo'}>
                    {user.primaryFamily.role === 'creator' ? 'Family Creator' : 'Family Member'}
                  </Badge>
                  {family && (
                    <span>{family.stats?.totalMembers || 0} members</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Quick Actions" subtitle="Everything you need in one place." />
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => navigate('/add-member')}>Add Member</Button>
                  <Button variant="primary" onClick={() => navigate('/upload-photos')}>Upload Photos</Button>
                  <Button variant="gray" onClick={() => navigate('/photos')}>View Photos</Button>
                  <Button variant="primary" onClick={() => navigate('/add-event')}>Add Event</Button>
                  <Button variant="gray" onClick={() => navigate('/events')}>View Events</Button>
                  <Button onClick={() => navigate('/members')}>View Members</Button>
                  <Button variant="gray" onClick={() => navigate('/tree')}>View Family Tree</Button>
                  <Button variant="amber" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => navigate('/billing')}>Billing / Subscription</Button>
                </div>
              </CardContent>
            </Card>

            {/* Highlights (horizontal scroll) */}
            <Card>
              <CardHeader title="Highlights" subtitle="A quick tour of what you can do" />
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 whitespace-nowrap pb-1">
                    <Badge color="indigo">🧬 Family Tree</Badge>
                    <Badge color="blue">🖼️ Photos</Badge>
                    <Badge color="green">📅 Events</Badge>
                    <Badge color="amber">🔎 Search by name/ID</Badge>
                    <Badge color="gray">👑 Admin Controls</Badge>
                    <Badge color="red">🔒 Private & Secure</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

              {user?.isSuperAdmin && (
                <Card>
                  <CardContent>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-2">Super Admin</h4>
                      <p className="text-gray-600 text-sm mb-4">Manage users, families, payments</p>
                      <Button variant="danger" onClick={() => navigate('/admin')}>Open Admin</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {user?.primaryFamily?.role === 'creator' && (
                <Card>
                  <CardContent>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-2">Family Admin Panel</h4>
                      <p className="text-gray-600 text-sm mb-4">Assign sub-admins, approve viewers, subscription</p>
                      <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => navigate('/family-admin')}>Open Panel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Invitation Link Display */}
              {user?.primaryFamily?.role === 'creator' && family && (
                <Card className="border-amber-200">
                  <CardContent>
                    <h4 className="font-semibold text-amber-800 mb-2">🔗 Family Invitation Link</h4>
                    <p className="text-amber-700 text-sm mb-3">Share this link with family members to invite them to your family tree:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-amber-50 px-3 py-2 rounded text-sm border border-amber-200">
                        {window.location.origin}/join/{family.familyId}
                      </code>
                      <Button className="bg-amber-600 hover:bg-amber-700" onClick={copyFamilyLink}>Copy</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* About & Explanations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="About ApnaParivar" subtitle="A secure, private place for your family history" />
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    <p className="text-gray-700">
                      ApnaParivar helps you build and preserve your family tree. Invite relatives, add members,
                      link relationships, and keep photos and events in one place—just for your family.
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Interactive family tree with automatic layout</li>
                      <li>Private galleries for family photos</li>
                      <li>Family events timeline (birthdays, anniversaries, reunions)</li>
                      <li>Role-based access: family creator, admins, and members</li>
                      <li>Fast search by name or unique Member ID</li>
                    </ul>
                    <p className="text-sm text-gray-600">
                      Privacy first: your families are private by default. Only invited members can view or contribute.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Getting Started" subtitle="Simple steps to build your tree" />
                <CardContent>
                  <ol className="list-decimal list-inside text-gray-700 space-y-2">
                    <li>Create or join your family using the invitation link</li>
                    <li>Add members with names and basic details</li>
                    <li>Link relationships (father/mother/child/spouse) as needed</li>
                    <li>Upload photos and add events to capture memories</li>
                    <li>Open the Family Tree to visualize connections</li>
                    <li>Use search to find anyone by name or Member ID</li>
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => navigate('/add-member')}>Add first member</Button>
                    <Button variant="gray" onClick={() => navigate('/tree')}>View tree</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FamilyDashboard;