import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';

const AddEvent = () => {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const [eventData, setEventData] = useState({
    title: '',
    eventType: '',
    date: '',
    endDate: '',
    location: '',
    description: '',
    participants: '',
    isRecurring: false,
    significance: '',
    photos: [],
    isPrivate: false
  });

  useEffect(() => {
    fetchUserAndFamily();
  }, []);

  const fetchUserAndFamily = async () => {
    try {
      setLoading(true);
      
      const userResponse = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        navigate('/');
        return;
      }
      
      const userData = await userResponse.json();
      setUser(userData.user);

      if (userData.user.primaryFamily?.familyId) {
        const rawId = userData.user.primaryFamily.familyId;
        const famId = typeof rawId === 'string' ? rawId : (rawId?._id || rawId?.$oid || String(rawId));
        const familyResponse = await fetch(apiUrl(`/api/families/${encodeURIComponent(famId)}`), {
          credentials: 'include'
        });
        
        if (familyResponse.ok) {
          const familyData = await familyResponse.json();
          setFamily(familyData.family);
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventData.title.trim() || !eventData.date) {
      setError('Event title and date are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // For now, we'll simulate the API call since we haven't built the events backend yet
      const response = await fetch(apiUrl('/api/events'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...eventData,
          familyId: family._id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const result = await response.json();
      
      setSuccess(`"${eventData.title}" has been added to your family timeline!`);
      
      // Reset form
      setEventData({
        title: '',
        eventType: '',
        date: '',
        endDate: '',
        location: '',
        description: '',
        participants: '',
        isRecurring: false,
        significance: '',
        photos: [],
        isPrivate: false
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error('Error adding event:', err);
      setError('Failed to add family event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-indigo-600 hover:text-indigo-700 mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-indigo-600">Add Family Event</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-gray-700">{user.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Add Event to {family?.familyName} Timeline
            </h2>
            <p className="text-gray-600">
              Record important family moments, celebrations, and milestones.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Event Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={eventData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Wedding of John & Jane, Baby's First Birthday"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  name="eventType"
                  value={eventData.eventType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Event Type</option>
                  <option value="birth">Birth</option>
                  <option value="birthday">Birthday</option>
                  <option value="wedding">Wedding</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="graduation">Graduation</option>
                  <option value="retirement">Retirement</option>
                  <option value="death">Memorial/Death</option>
                  <option value="religious">Religious Ceremony</option>
                  <option value="reunion">Family Reunion</option>
                  <option value="travel">Family Trip/Travel</option>
                  <option value="achievement">Achievement/Award</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Significance Level
                </label>
                <select
                  name="significance"
                  value={eventData.significance}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Significance</option>
                  <option value="high">High - Major Life Event</option>
                  <option value="medium">Medium - Important Moment</option>
                  <option value="low">Low - Regular Event</option>
                </select>
              </div>
            </div>

            {/* Date and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={eventData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (if multi-day event)
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={eventData.endDate}
                  onChange={handleInputChange}
                  min={eventData.date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location/Venue
              </label>
              <input
                type="text"
                name="location"
                value={eventData.location}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai, India or St. Mary's Church, Delhi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participants/Family Members Involved
              </label>
              <textarea
                name="participants"
                value={eventData.participants}
                onChange={handleInputChange}
                placeholder="List family members who were part of this event"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Description/Story
              </label>
              <textarea
                name="description"
                value={eventData.description}
                onChange={handleInputChange}
                placeholder="Share the story, details, and memories of this event..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={eventData.isRecurring}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  This is a recurring annual event (e.g., birthday, anniversary)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={eventData.isPrivate}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Keep this event private (only visible to family administrators)
                </label>
              </div>
            </div>

            {/* Future Photo Upload Placeholder */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                📸 Event Photos
              </h3>
              <p className="text-sm text-gray-600">
                Photo upload for events will be available soon. For now, you can add photos separately and tag them with this event.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Event...
                  </span>
                ) : (
                  'Add Family Event'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEvent;