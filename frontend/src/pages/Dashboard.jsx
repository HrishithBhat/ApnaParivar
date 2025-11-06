import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ApnaParivar Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
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
          <div className="grid gap-6 mb-8">
            {/* Welcome Section */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-3xl font-bold text-gray-600 mb-4">🎉 Welcome to Your Dashboard!</h2>
              <p className="text-gray-500 mb-6">Your family tree management system is ready to use.</p>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="text-blue-600 text-4xl mb-4">👨‍👩‍👧‍👦</div>
                <h3 className="text-lg font-semibold mb-2">Manage Families</h3>
                <p className="text-gray-600 mb-4 text-sm">View, create, and manage your family trees</p>
                <button 
                  onClick={() => navigate('/families')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full"
                >
                  Go to Families
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="text-green-600 text-4xl mb-4">➕</div>
                <h3 className="text-lg font-semibold mb-2">Create Family Tree</h3>
                <p className="text-gray-600 mb-4 text-sm">Start a new family tree from scratch</p>
                <button 
                  onClick={() => navigate('/families?create=true')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full"
                >
                  Create New
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="text-purple-600 text-4xl mb-4">🔗</div>
                <h3 className="text-lg font-semibold mb-2">Join Family</h3>
                <p className="text-gray-600 mb-4 text-sm">Join an existing family using an invite link</p>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors w-full">
                  Join Family
                </button>
              </div>
            </div>

            {/* API Testing Section */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">🧪 API Testing</h3>
              <p className="text-gray-600 mb-4">Test the family management API endpoints:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <button 
                  onClick={() => window.open(apiUrl('/api/auth/me'), '_blank')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  📋 Test /api/auth/me
                </button>
                <button 
                  onClick={() => window.open(apiUrl('/health'), '_blank')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ❤️ Test /health
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;