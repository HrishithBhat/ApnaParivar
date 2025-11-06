import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';

const FamilyManagement = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFamily, setNewFamily] = useState({ familyName: '', description: '' });
  const navigate = useNavigate();

  // Fetch user profile and families
  useEffect(() => {
    fetchUserAndFamilies();
  }, []);

  const fetchUserAndFamilies = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const userResponse = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        navigate('/');
        return;
      }
      
      const userData = await userResponse.json();
      setUser(userData.user);

      // Get families
      const familiesResponse = await fetch(apiUrl('/api/families'), {
        credentials: 'include'
      });
      
      if (familiesResponse.ok) {
        const familiesData = await familiesResponse.json();
        setFamilies(familiesData.families || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (e) => {
    e.preventDefault();
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
        const data = await response.json();
        setFamilies([...families, data.family]);
        setNewFamily({ familyName: '', description: '' });
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create family');
      }
    } catch (err) {
      console.error('Error creating family:', err);
      setError('Failed to create family');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your families...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Family Management</h1>
              {user && (
                <div className="flex items-center space-x-2">
                  <img 
                    src={user.profilePicture || '/default-avatar.png'} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {user.userType}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showCreateForm ? 'Cancel' : 'Create New Family'}
            </button>
            <button
              onClick={fetchUserAndFamilies}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Create Family Form */}
          {showCreateForm && (
            <div className="mb-6 bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Create New Family</h3>
              <form onSubmit={createFamily}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Family Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFamily.familyName}
                      onChange={(e) => setNewFamily({ ...newFamily, familyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter family name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newFamily.description}
                      onChange={(e) => setNewFamily({ ...newFamily, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Family description (optional)"
                    />
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Create Family
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Families List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Families ({families.length})
              </h2>
            </div>

            {families.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">👨‍👩‍👧‍👦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No families yet</h3>
                <p className="text-gray-600 mb-4">Create your first family to get started!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Family
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {families.map((family) => (
                  <div key={family.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {family.familyName}
                            </h3>
                            <p className="text-sm text-gray-600">ID: {family.familyId}</p>
                            {family.description && (
                              <p className="text-gray-700 mt-1">{family.description}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {family.userRole}
                            </span>
                            {family.isPrivate && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                Private
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                          <span>👥 {family.memberCount} members</span>
                          <span>👑 {family.adminCount} admins</span>
                          <span>📅 Created {new Date(family.createdAt).toLocaleDateString()}</span>
                          {family.joinedAt && family.joinedAt !== family.createdAt && (
                            <span>🚪 Joined {new Date(family.joinedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm">
                          View Family
                        </button>
                        {['admin1', 'admin2', 'admin3'].includes(family.userRole) && (
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm">
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FamilyManagement;