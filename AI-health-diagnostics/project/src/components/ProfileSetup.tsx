import React, { useState, useMemo } from 'react';
import { User, Heart, Activity, AlertCircle, Save, X, Plus } from 'lucide-react'; // Import Plus icon
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProfileSetupProps {
  onComplete: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const { user, updateProfile, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({}); // For client-side validation errors

  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: '', // Ensures no default value from user profile to force selection
    height: user?.height || '', // in cm
    weight: user?.weight || '', // in kg
    bloodGroup: user?.bloodGroup || '',
    emergencyContact: user?.emergencyContact || '', // Phone number
    diseases: user?.diseases || [], // Array of strings
    allergies: user?.allergies || [], // Array of strings
    medications: user?.medications || [], // Array of strings
    smokingStatus: user?.smokingStatus || 'never', // 'never', 'former', 'current'
    alcoholConsumption: user?.alcoholConsumption || 'never', // 'never', 'occasional', 'regular'
    exerciseFrequency: user?.exerciseFrequency || 'moderate', // 'sedentary', 'light', 'moderate', 'active', 'very_active'
    dietaryPreferences: user?.dietaryPreferences || [], // Array of strings
    familyHistory: user?.familyHistory || [], // Array of strings
    occupation: user?.occupation || ''
  });

  // New state to manage temporary input for array fields
  const [tempArrayInput, setTempArrayInput] = useState<Record<string, string>>({
    diseases: '',
    allergies: '',
    medications: '',
    dietaryPreferences: '',
    familyHistory: ''
  });

  // --- BMI Calculation (WHO Norms) ---
  const calculateBMI = useMemo(() => {
    const heightInMeters = parseFloat(formData.height as string) / 100;
    const weightInKg = parseFloat(formData.weight as string);

    if (heightInMeters > 0 && weightInKg > 0) {
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      return bmi.toFixed(2);
    }
    return null;
  }, [formData.height, formData.weight]);

  const getBMICategory = useMemo(() => {
    if (!calculateBMI) return null;
    const bmi = parseFloat(calculateBMI);

    if (bmi < 18.5) return { category: 'Underweight', color: 'text-orange-500' };
    if (bmi >= 18.5 && bmi <= 24.9) return { category: 'Normal weight', color: 'text-green-600' };
    if (bmi >= 25 && bmi <= 29.9) return { category: 'Overweight', color: 'text-orange-500' };
    if (bmi >= 30) return { category: 'Obesity', color: 'text-red-600' };
    return null;
  }, [calculateBMI]);

  // --- Input Handlers ---
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setInputErrors(prev => ({ ...prev, [field]: '' })); // Clear error on change
  };

  const handleTempArrayInputChange = (field: string, value: string) => {
    setTempArrayInput(prev => ({ ...prev, [field]: value }));
    setInputErrors(prev => ({ ...prev, [field]: '' })); // Clear error on change
  };

  const addToArrayInput = (field: string) => {
    const valueToAdd = tempArrayInput[field].trim();
    if (valueToAdd && !(formData[field as keyof typeof formData] as string[]).includes(valueToAdd)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), valueToAdd]
      }));
      setTempArrayInput(prev => ({ ...prev, [field]: '' })); // Clear temp input after adding
      setInputErrors(prev => ({ ...prev, [field]: '' })); // Clear error if it was "required"
    } else if (valueToAdd && (formData[field as keyof typeof formData] as string[]).includes(valueToAdd)) {
      setInputErrors(prev => ({ ...prev, [field]: 'This item already exists.' }));
    } else {
      setInputErrors(prev => ({ ...prev, [field]: 'Please enter a value to add.' }));
    }
  };

  const removeArrayItem = (field: string, indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, index) => index !== indexToRemove)
    }));
    setInputErrors(prev => ({ ...prev, [field]: '' })); // Clear error on change
  };

  // --- Client-side Validation ---
  const validateStep = (stepFields: string[]) => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    stepFields.forEach(field => {
      const value = formData[field as keyof typeof formData];

      // Basic required field check for all fields (string and array types)
      if (typeof value === 'string' && value.trim() === '') {
        newErrors[field] = 'This field is required.';
        isValid = false;
      } else if (Array.isArray(value) && value.length === 0 && ['diseases', 'allergies', 'medications', 'familyHistory', 'dietaryPreferences'].includes(field)) {
        // For array fields, check if they are empty
        newErrors[field] = 'At least one entry is required.';
        isValid = false;
      }
      
      // Specific validations for numerical and phone fields
      if (field === 'age' && (parseInt(value as string) < 1 || parseInt(value as string) > 120 || isNaN(parseInt(value as string)))) {
        newErrors[field] = 'Please enter a valid age (1-120).';
        isValid = false;
      }
      if (field === 'height' && (parseInt(value as string) < 50 || parseInt(value as string) > 250 || isNaN(parseInt(value as string)))) {
        newErrors[field] = 'Please enter a valid height (50-250 cm).';
        isValid = false;
      }
      if (field === 'weight' && (parseFloat(value as string) < 20 || parseFloat(value as string) > 300 || isNaN(parseFloat(value as string)))) {
        newErrors[field] = 'Please enter a valid weight (20-300 kg).';
        isValid = false;
      }
      // Indian phone number validation: Starts with +91 (optional) followed by 10 digits (6-9)
      if (field === 'emergencyContact' && !/^(\+91[\s-]?)?[6789]\d{9}$/.test(value as string)) {
        newErrors[field] = 'Please enter a valid Indian mobile number (e.g., +91 9876543210 or 9876543210).';
        isValid = false;
      }
    });

    setInputErrors(newErrors);
    return isValid;
  };

  // --- Navigation & Submission ---
  const handleNext = () => {
    const currentStepFields = steps[currentStep - 1].fields;
    if (validateStep(currentStepFields)) {
      setCurrentStep(prev => prev + 1);
      setSubmissionError(null); // Clear any previous submission error
    } else {
      setSubmissionError('Please correct the highlighted errors before proceeding.');
    }
  };

  const handleSubmit = async () => {
    const finalStepFields = steps[currentStep - 1].fields;
    if (!validateStep(finalStepFields)) {
      setSubmissionError('Please correct the highlighted errors before completing your profile.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null); // Clear previous errors

    try {
      const profileData = {
        ...formData,
        age: parseInt(formData.age as string) || 0,
        height: parseInt(formData.height as string) || 0,
        weight: parseFloat(formData.weight as string) || 0,
        profileCompleted: true // Mark profile as completed
      };
      
      const success = await updateProfile(profileData);
      if (success) {
        onComplete(); // Call parent's onComplete callback
      } else {
        setSubmissionError('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      setSubmissionError('An unexpected error occurred during profile update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    logout(); // Log out user if they cancel setup
  };

  // --- Step Definitions ---
  const steps = [
    {
      title: 'Basic Information',
      icon: User,
      fields: ['name', 'age', 'gender', 'height', 'weight', 'bloodGroup', 'occupation']
    },
    {
      title: 'Medical History',
      icon: Heart,
      fields: ['diseases', 'allergies', 'medications', 'familyHistory']
    },
    {
      title: 'Lifestyle & Emergency', // Renamed for clarity
      icon: Activity,
      fields: ['smokingStatus', 'alcoholConsumption', 'exerciseFrequency', 'dietaryPreferences', 'emergencyContact']
    }
  ];

  // --- Render Functions for Each Step ---
  const renderInput = (label: string, fieldName: string, type: string = 'text', options?: { value: string; label: string }[], placeholder?: string, min?: number, max?: number, step?: number) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span> {/* All fields are mandatory */}
      </label>
      {type === 'select' ? (
        <select
          value={formData[fieldName as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${inputErrors[fieldName] ? 'border-red-500' : 'border-gray-300'}`}
          required // All fields are mandatory
        >
          <option value="">{`Select ${label}`}</option>
          {options?.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : type === 'array_input' ? ( // New type for array inputs with an add button
        <>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={tempArrayInput[fieldName] || ''} // Use temp state for this input
              onChange={(e) => handleTempArrayInputChange(fieldName, e.target.value)}
              className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${inputErrors[fieldName] ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={placeholder}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Prevent form submission
                  addToArrayInput(fieldName);
                }
              }}
            />
            <button
              type="button" // Important to prevent form submission
              onClick={() => addToArrayInput(fieldName)}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {(formData[fieldName as keyof typeof formData] as string[]).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {(formData[fieldName as keyof typeof formData] as string[]).map((item, index) => (
                <span key={index} className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full break-words">
                  {item}
                  <X className="ml-1 h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => removeArrayItem(fieldName, index)} />
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <input
          type={type}
          value={formData[fieldName as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          // Added pl-4 for explicit left padding
          className={`w-full px-4 py-3 pl-4 border rounded-lg focus:ring-2 focus:ring-blue-500 ${inputErrors[fieldName] ? 'border-red-500' : 'border-gray-300'}`}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          required // All fields are mandatory
        />
      )}
      {inputErrors[fieldName] && (
        <p className="mt-1 text-sm text-red-500 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {inputErrors[fieldName]}
        </p>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInput('Full Name', 'name', 'text', undefined, undefined, undefined, undefined, undefined)}
        {renderInput('Age', 'age', 'number', undefined, undefined, 1, 120, undefined)}
        {renderInput('Gender', 'gender', 'select', [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' }
        ])}
        {renderInput('Height (cm)', 'height', 'number', undefined, undefined, 50, 250, undefined)}
        {renderInput('Weight (kg)', 'weight', 'number', undefined, undefined, 20, 300, 0.1)}
        {renderInput('Blood Group', 'bloodGroup', 'select', [
          { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
          { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
          { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
          { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }
        ])}
      </div>
      {renderInput('Occupation', 'occupation', 'text', undefined, 'e.g., Software Engineer, Teacher, Student')}

      {/* BMI Display */}
      {calculateBMI && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800">Your Calculated BMI: {calculateBMI}</h4>
          {getBMICategory && (
            <p className={`text-sm mt-1 ${getBMICategory.color}`}>
              Category: **{getBMICategory.category}** (WHO standards)
            </p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            <AlertCircle className="h-3 w-3 inline-block mr-1" /> BMI is a general indicator and may not apply to all individuals (e.g., highly muscular athletes, pregnant women). Consult a healthcare professional for personalized advice.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {renderInput('Current Medical Conditions', 'diseases', 'array_input', undefined, 'e.g., Diabetes, High Blood Pressure, Asthma')}
      {renderInput('Known Allergies', 'allergies', 'array_input', undefined, 'e.g., Peanuts, Shellfish, Penicillin')}
      {renderInput('Current Medications', 'medications', 'array_input', undefined, 'e.g., Metformin 500mg, Lisinopril 10mg')}
      {renderInput('Family Medical History', 'familyHistory', 'array_input', undefined, 'e.g., Father - Heart Disease, Mother - Diabetes')}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInput('Smoking Status', 'smokingStatus', 'select', [
          { value: 'never', label: 'Never Smoked' },
          { value: 'former', label: 'Former Smoker' },
          { value: 'current', label: 'Current Smoker' }
        ])}
        {renderInput('Alcohol Consumption', 'alcoholConsumption', 'select', [
          { value: 'never', label: 'Never' },
          { value: 'occasional', label: 'Occasional' },
          { value: 'regular', label: 'Regular' }
        ])}
        {renderInput('Exercise Frequency', 'exerciseFrequency', 'select', [
          { value: 'sedentary', label: 'Sedentary (Little to no exercise)' },
          { value: 'light', label: 'Light (1-3 days/week)' },
          { value: 'moderate', label: 'Moderate (3-5 days/week)' },
          { value: 'active', label: 'Active (6-7 days/week)' },
          { value: 'very_active', label: 'Very Active (2x/day or intense)' }
        ])}
        {renderInput('Emergency Contact', 'emergencyContact', 'tel', undefined, '+91 9876543210')}
      </div>
      {renderInput('Dietary Preferences/Restrictions', 'dietaryPreferences', 'array_input', undefined, 'e.g., Vegetarian, Gluten-free, Low sodium')}
    </div>
  );

  const currentStepData = steps[currentStep - 1];
  const StepIcon = currentStepData.icon;

  // Redirect if user is not logged in (assuming useAuth provides this)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <StepIcon className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Health Profile</h1>
          </div>
          <p className="text-gray-600">Help us personalize your healthcare experience</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300
                    ${index + 1 <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {index + 1}
                  </div>
                  <span className={`mt-2 text-xs text-center ${index + 1 === currentStep ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
                    {step.title.split(' & ').join('\n& ')} {/* Break long titles for readability */}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-colors duration-300
                    ${index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current Step Title */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          {currentStepData.title}
        </h2>

        {/* Form Content */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Global Error Message */}
        {submissionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {submissionError}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
          <div className="flex space-x-4">
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Cancel & Logout</span>
            </button>
            
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isSubmitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
          </div>
          
          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" /> {/* Loading spinner */}
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Complete Profile</span>
                </>
              )
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;