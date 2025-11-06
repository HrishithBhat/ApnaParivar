import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/api';

const UploadPhotos = () => {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: 'family',
    tags: ''
  });
  const navigate = useNavigate();

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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      setError('Only JPEG, PNG, and GIF files are allowed');
      return;
    }

    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = validFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError('Each file must be less than 5MB');
      return;
    }

    setSelectedFiles(validFiles);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUploadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Please select at least one photo to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append('photos', file);
      });
      
  // Family object may contain either 'id' (API response) or '_id' depending on endpoint
  const familyIdToSend = family?._id || family?.id || family?.familyId || '';
  formData.append('familyId', familyIdToSend);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('category', uploadData.category);
      formData.append('tags', uploadData.tags);

      // For now, we'll simulate the upload since we haven't set up file upload backend yet
      const response = await fetch(apiUrl('/api/photos/upload'), {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      setSuccess(`Successfully uploaded ${selectedFiles.length} photo(s) to ${family.familyName}!`);
      
      // Reset form
      setSelectedFiles([]);
      setUploadData({
        title: '',
        description: '',
        category: 'family',
        tags: ''
      });
      
      // Clear file input
      const fileInput = document.getElementById('photo-upload');
      if (fileInput) fileInput.value = '';

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error('Error uploading photos:', err);
      setError('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
              <h1 className="text-2xl font-bold text-indigo-600">Upload Family Photos</h1>
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
              Add Photos to {family?.familyName}
            </h2>
            <p className="text-gray-600">
              Upload family photos, member portraits, or event pictures to preserve your family memories.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="photo-upload"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="text-6xl text-gray-400 mb-4">📸</div>
                <p className="text-lg text-gray-600 mb-2">
                  Click to select photos or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPEG, PNG, GIF up to 5MB each
                </p>
              </label>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Selected Photos ({selectedFiles.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative bg-gray-100 rounded-lg p-2">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Title/Album Name
                </label>
                <input
                  type="text"
                  name="title"
                  value={uploadData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Wedding Day, Family Reunion 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={uploadData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="family">Family Photos</option>
                  <option value="wedding">Wedding</option>
                  <option value="celebration">Celebration/Festival</option>
                  <option value="portraits">Individual Portraits</option>
                  <option value="historical">Historical Photos</option>
                  <option value="documents">Documents/Certificates</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={uploadData.description}
                  onChange={handleInputChange}
                  placeholder="Describe these photos, when they were taken, who's in them, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={uploadData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g., grandparents, 1990s, mumbai, graduation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add tags to make photos easier to find later
                </p>
              </div>
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
                disabled={uploading || selectedFiles.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </span>
                ) : (
                  `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadPhotos;