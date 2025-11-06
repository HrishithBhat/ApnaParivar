import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { apiUrl } from '../lib/api';

const AddMember = () => {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const [memberData, setMemberData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    dateOfDeath: '',
    placeOfBirth: '',
    occupation: '',
    education: '',
    bio: '',
    relationshipType: '',
    relatedToMemberId: '',
    phone: '',
    email: '',
    address: ''
  });
  const [familyMembers, setFamilyMembers] = useState([]);

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
        // Extract the family ID robustly (handles string, ObjectId, or populated doc)
        const famRaw = userData.user.primaryFamily.familyId;
        const familyId = typeof famRaw === 'string' 
          ? famRaw 
          : (famRaw?._id || famRaw?.$oid || String(famRaw));
          
        console.log('Family ID:', familyId); // Debug log
        
        // Pre-seed family from /auth/me populated data as a fallback
        const seededFamily = {
          _id: familyId,
          familyName: famRaw?.familyName || 'My Family',
          description: famRaw?.description,
        };
        setFamily(seededFamily);

        const familyResponse = await fetch(apiUrl(`/api/families/${encodeURIComponent(familyId)}`), {
          credentials: 'include'
        });
        
        console.log('Family response status:', familyResponse.status); // Debug log
        
        if (familyResponse.ok) {
          const familyData = await familyResponse.json();
          console.log('Family data:', familyData); // Debug log
          const normalizedFamily = { ...familyData.family, _id: familyData.family._id || familyData.family.id };
          setFamily(normalizedFamily);
          // Load family members for relationship selection
          const famIdForMembers = normalizedFamily._id;
          const membersRes = await fetch(apiUrl(`/api/members?familyId=${encodeURIComponent(famIdForMembers)}`), { credentials: 'include' });
          if (membersRes.ok) {
            const data = await membersRes.json();
            setFamilyMembers(data.members || []);
          }
        } else {
          // Fall back to using seeded family from /auth/me and still load members list
          console.warn('Family details endpoint failed:', familyResponse.status, familyResponse.statusText);
          const membersRes = await fetch(apiUrl(`/api/members?familyId=${encodeURIComponent(seededFamily._id)}`), { credentials: 'include' });
          if (membersRes.ok) {
            const data = await membersRes.json();
            setFamilyMembers(data.members || []);
          } else {
            let msg = 'Failed to load family data';
            try {
              const err = await membersRes.json();
              msg = err.message || msg;
            } catch (e) {
              console.debug('Failed to parse membersRes error JSON', e);
            }
            setError(msg);
          }
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
    const { name, value } = e.target;
    setMemberData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberData.firstName.trim() || !memberData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (!memberData.gender || memberData.gender.trim() === '') {
      setError('Please select a gender');
      return;
    }

    if (!family || !family._id) {
      setError('Family data not loaded. Please refresh the page.');
      return;
    }

    try {
      // Map friendly relationship types to backend-supported keys
      let mappedRelationshipType = memberData.relationshipType;
      const impliedGender = (type) => (
        type === 'son_of' || type === 'husband_of' ? 'male' :
        type === 'daughter_of' || type === 'wife_of' ? 'female' : ''
      );
      if (['son_of','daughter_of'].includes(memberData.relationshipType)) {
        mappedRelationshipType = 'child_of';
      } else if (['husband_of','wife_of'].includes(memberData.relationshipType)) {
        mappedRelationshipType = 'spouse_of';
      }

      const autoGender = impliedGender(memberData.relationshipType);
      const finalGender = memberData.gender || autoGender;

      setSaving(true);
      setError(null);

      console.log('Submitting member data:', memberData); // Debug log
      console.log('Family ID:', family._id); // Debug log

      // Construct payload; optionally omit empty relatedToMemberId
      const payload = {
        ...memberData,
        gender: finalGender,
        relationshipType: mappedRelationshipType,
        familyId: family._id,
      };
      if (!payload.relatedToMemberId) {
        delete payload.relatedToMemberId;
      }

      const response = await fetch(apiUrl('/api/members'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await response.json();
        setSuccess(`${memberData.firstName} ${memberData.lastName} has been added to the family tree!`);
        // Notify others (e.g., FamilyTree) to refresh
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(
            new CustomEvent('apna:familyChanged', { detail: { familyId: family._id, action: 'member-added' } })
          );
        }
        
        // Reset form
        setMemberData({
          firstName: '',
          lastName: '',
          gender: '',
          dateOfBirth: '',
          dateOfDeath: '',
          placeOfBirth: '',
          occupation: '',
          education: '',
          bio: '',
          relationshipType: '',
          relatedToMemberId: '',
          phone: '',
          email: '',
          address: ''
        });

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add family member');
      }
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add family member');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Add Member">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Add Member" subtitle={family?.familyName}>
      <div className="max-w-4xl mx-auto">
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

        <Card>
          <CardHeader title={`Add New Member${family?.familyName ? ' to ' + family.familyName : ''}`} subtitle="Fill in the information below to add a new family member to your tree." />
          <CardContent>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship Type (optional)
                </label>
                <select
                  name="relationshipType"
                  value={memberData.relationshipType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="father_of">Father of</option>
                  <option value="mother_of">Mother of</option>
                  <option value="child_of">Child of</option>
                  <option value="spouse_of">Spouse of</option>
                      <option value="son_of">Son of</option>
                      <option value="daughter_of">Daughter of</option>
                      <option value="husband_of">Husband of</option>
                      <option value="wife_of">Wife of</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Member (optional)
                </label>
                <select
                  name="relatedToMemberId"
                  value={memberData.relatedToMemberId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Member</option>
                  {familyMembers.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Used with a relationship type to link this member.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={memberData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={memberData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={memberData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={memberData.dateOfBirth}
                  onChange={handleInputChange}
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place of Birth
                </label>
                <input
                  type="text"
                  name="placeOfBirth"
                  value={memberData.placeOfBirth}
                  onChange={handleInputChange}
                  placeholder="City, State, Country"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Death (if applicable)
                </label>
                <input
                  type="date"
                  name="dateOfDeath"
                  value={memberData.dateOfDeath}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occupation
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={memberData.occupation}
                  onChange={handleInputChange}
                  placeholder="e.g., Doctor, Teacher, Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Education
                </label>
                <input
                  type="text"
                  name="education"
                  value={memberData.education}
                  onChange={handleInputChange}
                  placeholder="e.g., MBA, B.Tech, High School"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={memberData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={memberData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={memberData.address}
                onChange={handleInputChange}
                placeholder="Full address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Biography / Notes
              </label>
              <textarea
                name="bio"
                value={memberData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about this family member..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Adding Member...' : 'Add Family Member'}</Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AddMember;