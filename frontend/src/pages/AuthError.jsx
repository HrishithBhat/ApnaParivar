import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';

const AuthError = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const error = searchParams.get('error');
  const errorMessage = {
    'auth_failed': 'Google authentication failed. Please try again.',
    'callback_failed': 'Authentication callback failed. Please check your connection.',
    'access_denied': 'You denied access to your Google account.',
    'invalid_request': 'Invalid authentication request.',
  }[error] || 'An unknown authentication error occurred.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <div className="text-red-600 text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Failed</h2>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">Error Code: {error || 'unknown'}</p>
          <p className="text-red-700 mt-2">{errorMessage}</p>
        </div>
        
        <div className="text-sm text-gray-600 mb-6">
          <p>Don't worry, this happens sometimes. Here are a few things you can try:</p>
          <ul className="list-disc list-inside mt-2 text-left space-y-1">
            <li>Make sure you have a stable internet connection</li>
            <li>Clear your browser cache and cookies</li>
            <li>Try using a different browser</li>
            <li>Check if you're using the correct Google account</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.href = apiUrl('/api/auth/google')}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🔄 Try Again with Google
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Still having trouble? Contact support at{' '}
            <a href="mailto:support@apnaparivar.com" className="text-red-600 hover:underline">
              support@apnaparivar.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthError;