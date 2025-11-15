import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X, Heart, Activity, Shield, Phone, Briefcase, Camera, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // Assuming you use react-router-dom for navigation

// Define a type for gender for better type safety
type Gender = 'male' | 'female' | 'other' | ''; // Added '' for initial empty state in forms

const Profile: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define the form data state with more precise types
  const [formData, setFormData] = useState<{
    name: string;
    age: number | ''; // Allow empty string for input field
    gender: Gender;
    height: number | ''; // Allow empty string for input field
    weight: number | ''; // Allow empty string for input field
    bloodGroup: string;
    emergencyContact: string;
    diseases: string[];
    allergies: string[];
    medications: string[];
    smokingStatus: string;
    alcoholConsumption: string;
    exerciseFrequency: string;
    dietaryPreferences: string[];
    familyHistory: string[];
    occupation: string;
  }>({
    name: user?.name || '',
    age: user?.age || '', // Initialize with user.age or empty string
    gender: (user?.gender as Gender) || '', // Cast user.gender to Gender type
    height: user?.height || '', // Initialize with user.height or empty string
    weight: user?.weight || '', // Initialize with user.weight or empty string
    bloodGroup: user?.bloodGroup || '',
    emergencyContact: user?.emergencyContact || '',
    diseases: user?.diseases || [],
    allergies: user?.allergies || [],
    medications: user?.medications || [],
    smokingStatus: user?.smokingStatus || 'never',
    alcoholConsumption: user?.alcoholConsumption || 'never',
    exerciseFrequency: user?.exerciseFrequency || 'moderate',
    dietaryPreferences: user?.dietaryPreferences || [],
    familyHistory: user?.familyHistory || [],
    occupation: user?.occupation || ''
  });

  // Effect to update formData when user object changes (e.e.g., after a successful update)
  // or when the component mounts with initial user data
  useEffect(() => {
    setFormData({
      name: user?.name || '',
      age: user?.age !== undefined ? user.age : '', // Set to number if available, else empty string
      gender: (user?.gender as Gender) || '',
      height: user?.height !== undefined ? user.height : '',
      weight: user?.weight !== undefined ? user.weight : '',
      bloodGroup: user?.bloodGroup || '',
      emergencyContact: user?.emergencyContact || '',
      diseases: user?.diseases || [],
      allergies: user?.allergies || [],
      medications: user?.medications || [],
      smokingStatus: user?.smokingStatus || 'never',
      alcoholConsumption: user?.alcoholConsumption || 'never',
      exerciseFrequency: user?.exerciseFrequency || 'moderate',
      dietaryPreferences: user?.dietaryPreferences || [],
      familyHistory: user?.familyHistory || [],
      occupation: user?.occupation || ''
    });
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    // For gender, ensure the value is of type Gender
    if (field === 'gender') {
      setFormData(prev => ({ ...prev, [field]: value as Gender }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleArrayInput = (field: string, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item !== ''); // Filter out truly empty strings
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const profileData = {
        ...formData,
        // Convert empty strings to undefined or null for numerical fields if desired by backend
        age: formData.age !== '' ? parseInt(formData.age as string, 10) : undefined,
        height: formData.height !== '' ? parseInt(formData.height as string, 10) : undefined,
        weight: formData.weight !== '' ? parseFloat(formData.weight as string) : undefined,
      };

      const success = await updateProfile(profileData);
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      // Optional: Add user-friendly error message here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    // Revert formData to current user data
    setFormData({
      name: user?.name || '',
      age: user?.age !== undefined ? user.age : '',
      gender: (user?.gender as Gender) || '',
      height: user?.height !== undefined ? user.height : '',
      weight: user?.weight !== undefined ? user.weight : '',
      bloodGroup: user?.bloodGroup || '',
      emergencyContact: user?.emergencyContact || '',
      diseases: user?.diseases || [],
      allergies: user?.allergies || [],
      medications: user?.medications || [],
      smokingStatus: user?.smokingStatus || 'never',
      alcoholConsumption: user?.alcoholConsumption || 'never',
      exerciseFrequency: user?.exerciseFrequency || 'moderate',
      dietaryPreferences: user?.dietaryPreferences || [],
      familyHistory: user?.familyHistory || [],
      occupation: user?.occupation || ''
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout(); // Call the logout function from AuthContext
    navigate('/login'); // Redirect to the login page
  };

  // New handler for "Cancel and Return to Login" button
  const handleCancelAndGoToLogin = () => {
    navigate('/login'); // Navigate to the login page
  };

  const calculateBMI = () => {
    // Use user data directly for display calculations if available and valid
    if (user && user.height && user.weight && user.height > 0 && user.weight > 0) {
      const heightInMeters = user.height / 100;
      return (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return 'N/A';
  };

  const getBMIStatus = (bmi: string) => {
    const bmiValue = parseFloat(bmi);
    if (isNaN(bmiValue) || bmiValue === 0) return { status: 'Unknown', color: 'text-gray-600' };
    if (bmiValue < 18.5) return { status: 'Underweight', color: 'text-blue-600' };
    if (bmiValue < 25) return { status: 'Normal', color: 'text-green-600' };
    if (bmiValue < 30) return { status: 'Overweight', color: 'text-yellow-600' };
    return { status: 'Obese', color: 'text-red-600' };
  };

  const bmi = calculateBMI();
  const bmiStatus = getBMIStatus(bmi);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
              <User className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Health Profile
              </h1>
              <p className="text-xl text-gray-600 mt-2">Manage your personal health information</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 sticky top-8">
              {/* Profile Picture */}
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  {/* Future: Add actual image upload functionality here */}
                  <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-4">{user?.name || 'Guest User'}</h2>
                <p className="text-gray-600">{user?.email || 'N/A'}</p>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Age</p>
                    <p className="text-2xl font-bold text-blue-800">{user?.age || 'N/A'}</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-600 font-medium">BMI</p>
                    <p className={`text-2xl font-bold ${bmiStatus.color}`}>{bmi}</p>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-600 font-medium">BMI Status</span>
                    <Heart className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className={`font-bold ${bmiStatus.color}`}>{bmiStatus.status}</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-yellow-600 font-medium">Blood Group</span>
                    <Shield className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="font-bold text-yellow-800">{user?.bloodGroup || 'Not specified'}</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-red-600 font-medium">Emergency Contact</span>
                    <Phone className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="font-bold text-red-800">{user?.emergencyContact || 'Not specified'}</p>
                </div>
              </div>

              {/* Edit/Cancel Button */}
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleCancelEdit(); // If already editing, clicking this button cancels
                    } else {
                      setIsEditing(true); // If not editing, clicking this button starts editing
                    }
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {isEditing ? <X className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                  <span className="font-semibold">{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-semibold">Log Out</span>
                </button>
                {/* New Cancel and Return to Login Button - always visible in the profile summary card */}
                <button
                  onClick={handleCancelAndGoToLogin}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <X className="h-5 w-5" />
                  <span className="font-semibold">Cancel & Return to Login</span>
                </button>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <User className="h-8 w-8 text-blue-600" />
                <h3 className="text-2xl font-bold text-gray-900">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.name || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Age</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                        placeholder="e.g., 30"
                      />
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.age || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Gender</label>
                    {isEditing ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl capitalize">{user?.gender || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Height (cm)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                        placeholder="e.g., 170"
                      />
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.height ? `${user.height} cm` : 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Weight (kg)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                        placeholder="e.g., 70.5"
                      />
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.weight ? `${user.weight} kg` : 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Blood Group</label>
                    {isEditing ? (
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.bloodGroup || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Briefcase className="h-5 w-5 text-gray-600 mr-2" />
                  Occupation
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., Software Engineer, Teacher, Student"
                  />
                ) : (
                  <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.occupation || 'Not specified'}</p>
                )}
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <Heart className="h-8 w-8 text-red-600" />
                <h3 className="text-2xl font-bold text-gray-900">Medical Information</h3>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Current Medical Conditions</label>
                  {isEditing ? (
                    <textarea
                      value={formData.diseases.join(', ')}
                      onChange={(e) => handleArrayInput('diseases', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      rows={3}
                      placeholder="e.g., Diabetes, Hypertension, Asthma (separate with commas)"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      {user?.diseases && user.diseases.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.diseases.map((disease, index) => (
                            <span
                              key={index}
                              className="inline-block bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full"
                            >
                              {disease}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No conditions recorded</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Known Allergies</label>
                  {isEditing ? (
                    <textarea
                      value={formData.allergies.join(', ')}
                      onChange={(e) => handleArrayInput('allergies', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      rows={3}
                      placeholder="e.g., Peanuts, Shellfish, Penicillin (separate with commas)"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      {user?.allergies && user.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.allergies.map((allergy, index) => (
                            <span
                              key={index}
                              className="inline-block bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full"
                            >
                              {allergy}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No allergies recorded</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Current Medications</label>
                  {isEditing ? (
                    <textarea
                      value={formData.medications.join(', ')}
                      onChange={(e) => handleArrayInput('medications', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      rows={3}
                      placeholder="e.g., Metformin 500mg, Lisinopril 10mg (separate with commas)"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      {user?.medications && user.medications.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.medications.map((medication, index) => (
                            <span
                              key={index}
                              className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
                            >
                              {medication}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No medications recorded</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Family Medical History</label>
                  {isEditing ? (
                    <textarea
                      value={formData.familyHistory.join(', ')}
                      onChange={(e) => handleArrayInput('familyHistory', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      rows={3}
                      placeholder="e.g., Father - Heart Disease, Mother - Diabetes (separate with commas)"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      {user?.familyHistory && user.familyHistory.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.familyHistory.map((history, index) => (
                            <span
                              key={index}
                              className="inline-block bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full"
                            >
                              {history}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No family history recorded</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lifestyle Information */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <Activity className="h-8 w-8 text-green-600" />
                <h3 className="text-2xl font-bold text-gray-900">Lifestyle Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Smoking Status</label>
                    {isEditing ? (
                      <select
                        value={formData.smokingStatus}
                        onChange={(e) => handleInputChange('smokingStatus', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="never">Never Smoked</option>
                        <option value="former">Former Smoker</option>
                        <option value="current">Current Smoker</option>
                      </select>
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl capitalize">
                        {user?.smokingStatus?.replace('_', ' ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Alcohol Consumption</label>
                    {isEditing ? (
                      <select
                        value={formData.alcoholConsumption}
                        onChange={(e) => handleInputChange('alcoholConsumption', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="never">Never</option>
                        <option value="occasional">Occasional</option>
                        <option value="regular">Regular</option>
                      </select>
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl capitalize">
                        {user?.alcoholConsumption || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Exercise Frequency</label>
                    {isEditing ? (
                      <select
                        value={formData.exerciseFrequency}
                        onChange={(e) => handleInputChange('exerciseFrequency', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="sedentary">Sedentary (Little to no exercise)</option>
                        <option value="light">Light (1-3 days/week)</option>
                        <option value="moderate">Moderate (3-5 days/week)</option>
                        <option value="active">Active (6-7 days/week)</option>
                        <option value="very_active">Very Active (2x/day or intense)</option>
                      </select>
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl capitalize">
                        {user?.exerciseFrequency?.replace('_', ' ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Emergency Contact</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                        placeholder="+1-555-0123"
                      />
                    ) : (
                      <p className="text-gray-800 font-medium p-3 bg-gray-50 rounded-xl">{user?.emergencyContact || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Dietary Preferences/Restrictions</label>
                {isEditing ? (
                  <textarea
                    value={formData.dietaryPreferences.join(', ')}
                    onChange={(e) => handleArrayInput('dietaryPreferences', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                    rows={3}
                    placeholder="e.g., Vegetarian, Gluten-free, Low sodium (separate with commas)"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    {user?.dietaryPreferences && user.dietaryPreferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.dietaryPreferences.map((preference, index) => (
                          <span
                            key={index}
                            className="inline-block bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full"
                          >
                            {preference}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No dietary preferences recorded</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center space-x-3 py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="font-semibold">Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span className="font-semibold">Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;