import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';

const JoinFamily = () => {
  const { familyId } = useParams();
  const [family, setFamily] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFamily();
  }, [familyId]);

  const checkAuthAndFamily = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const userResponse = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        // Not authenticated, redirect to login with return URL
        const loginUrl = apiUrl('/api/auth/google') + `?returnTo=${encodeURIComponent(window.location.href)}`;
        window.location.href = loginUrl;
        return;
      }
      
      const userData = await userResponse.json();
      setUser(userData.user);
      
      // Check if user already has a family
      if (userData.user.primaryFamily?.familyId) {
        setError('You are already part of a family. Each user can only belong to one family tree.');
        return;
      }
      
      // Fetch family info
      const familyResponse = await fetch(apiUrl(`/api/families/public/${familyId}`), {
        credentials: 'include'
      });
      
      if (!familyResponse.ok) {
        setError('Family not found or invitation link is invalid.');
        return;
      }
      
      const familyData = await familyResponse.json();
      setFamily(familyData.family);
      
    } catch (err) {
      console.error('Error checking auth and family:', err);
      setError('Failed to load family information.');
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    try {
      setJoining(true);
      
      const response = await fetch(apiUrl(`/api/families/${family._id}/join`), {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Successfully joined, redirect to dashboard
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join family');
      }
    } catch (err) {
      console.error('Error joining family:', err);
      setError('Failed to join family');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Join Family</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">ApnaParivar</h1>
            <p className="text-gray-600">Join Your Family Tree</p>
          </div>

          {/* Family Invitation Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🌳</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're Invited to Join
              </h2>
              <h3 className="text-3xl font-bold text-indigo-600 mb-4">
                {family?.familyName}
              </h3>
              {family?.description && (
                <p className="text-gray-600 mb-4">{family.description}</p>
              )}
            </div>

            {/* Family Stats */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {family?.stats?.totalMembers || 0}
                  </div>
                  <div className="text-sm text-gray-600">Family Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {family?.stats?.totalGenerations || 0}
                  </div>
                  <div className="text-sm text-gray-600">Generations</div>
                </div>
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Join Action */}
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                By joining this family tree, you'll be able to:
              </p>
              <ul className="text-left text-gray-600 mb-6 space-y-2">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  View and explore the complete family tree
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Add your own information and photos
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Contribute to family history and events
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Connect with other family members
                </li>
              </ul>
              
              <button
                onClick={joinFamily}
                disabled={joining}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {joining ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Joining Family...
                  </span>
                ) : (
                  `Join ${family?.familyName}`
                )}
              </button>
              
              <p className="text-xs text-gray-500 mt-4">
                By joining, you agree to respectfully contribute to your family's digital heritage.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              Powered by <span className="font-semibold">ApnaParivar</span> - 
              Connecting families across generations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinFamily;