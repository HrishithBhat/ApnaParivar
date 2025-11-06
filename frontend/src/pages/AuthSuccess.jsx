import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get token from URL params (fallback, cookie is preferred)
        const token = searchParams.get('token');
        
        // Call the /me endpoint to get user profile
        const response = await fetch(apiUrl('/api/auth/me'), {
          method: 'GET',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          
          // Remove token from URL for security
          if (token) {
            window.history.replaceState({}, document.title, '/auth/success');
          }
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (err) {
        console.error('Auth success error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Verifying your account...</h2>
          <p className="text-gray-600 mt-2">Please wait while we set up your profile</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <div className="text-green-600 text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ApnaParivar!</h2>
        
        {user && (
          <div className="mb-6">
            <div className="mb-4">
              {user.profilePicture && (
                <img
                  src={user.profilePicture}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-green-200"
                />
              )}
              <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-2">
                {user.userType}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p><strong>Account Status:</strong> Active</p>
              <p><strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
              <p><strong>Family Memberships:</strong> {user.familyMemberships?.length || 0}</p>
            </div>
          </div>
        )}
        
        <p className="text-gray-600 mb-6">
          Your account has been successfully created. You'll be redirected to your dashboard in a few seconds.
        </p>
        
        <div className="space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccess;