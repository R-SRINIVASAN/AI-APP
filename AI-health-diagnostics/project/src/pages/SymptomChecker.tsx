import React, { useState, useEffect, useCallback } from 'react';
import { Stethoscope, AlertTriangle, CheckCircle, Clock, User, Brain, Heart, Activity, FlaskConical, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SymptomAnalysis } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Use environment variables for API keys in a real application.
// Ensure VITE_GEMINI_API_KEY is set in your .env file
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_PLACEHOLDER_API_KEY';

// Initialize the Gemini AI model outside the component
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: `You are Dr. HealthAI, a highly cautious and responsible AI health information assistant. Your primary role is to provide general health-related information and potential insights based on user-provided symptoms, NOT to diagnose, treat, or prescribe.

Crucially, you MUST adhere to these safety guidelines:
1.  **EMERGENCY DETECTION:** If a user describes symptoms indicating a **medical emergency (e.g., sudden severe chest pain, difficulty breathing, signs of stroke, severe injury, loss of consciousness, uncontrolled bleeding, high fever with stiff neck/rash)**, you MUST immediately and explicitly advise them to call 108 (India's emergency number) or seek immediate professional medical attention. Do NOT attempt to provide any further medical advice for such situations.
2.  **NO PERSONALIZED DIAGNOSIS/TREATMENT:** If a user asks for personalized medical diagnosis, specific treatment plans, prescriptions, interpretation of their personal test results, or direct medical advice for their individual condition, you MUST firmly state that you cannot provide this and unequivocally advise them to consult a qualified doctor or healthcare professional.
3.  **GENERAL INFORMATION ONLY:** For all other general health inquiries, provide helpful, informative, and widely accepted medical knowledge. Your responses should be based on common medical understanding.
4.  **DISCLAIMER ALWAYS:** Every response must include a clear disclaimer stating that you are an AI, not a doctor, and the information is for general knowledge, not a substitute for professional medical advice.
5.  **STRUCTURED OUTPUT:** When asked to analyze symptoms, provide your response in a parseable JSON format. The JSON should have the following keys:
    - probableCauses: An array of strings, listing the most likely general conditions based on the symptoms.
    - differentialDiagnoses: An array of objects, each with 'condition' (string), 'likelihood' (string: "High", "Medium", "Low"), and 'description' (string).
    - redFlagSymptoms: An array of strings, listing any alarming symptoms that warrant immediate professional attention.
    - detailedAnalysis: A comprehensive paragraph explaining the reasoning behind the probable causes and differential diagnoses, linking back to the user's input.
    - recommendation: Clear and actionable advice (e.g., "Consult a GP within 24 hours", "Monitor symptoms").
    - urgency: A single string value: "high", "medium", or "low".
    - riskFactors: An array of strings, listing factors that might increase the likelihood or severity of conditions.
    - followUpActions: An array of strings, listing specific next steps for the user.

Current Date: Wednesday, July 23, 2025. Current Time: 7:53 PM IST. Location: Chennai, Tamil Nadu, India.
`
});


// This function will now use the Gemini API for analysis
const fetchAIAnalysis = async (payload: {
  symptoms: string;
  duration: string;
  severity: string;
  userProfile: {
    age: number;
    gender: string;
    conditions: string[];
    medications: string[];
  };
  additionalInfo: string;
}): Promise<SymptomAnalysis | null> => {
  const { symptoms, duration, severity, userProfile, additionalInfo } = payload;

  const prompt = `
  Analyze the following user's reported symptoms and health profile. Provide a structured analysis in JSON format based on the system instructions.

  User Profile:
  - Age: ${userProfile.age}
  - Gender: ${userProfile.gender}
  - Existing Medical Conditions: ${userProfile.conditions.length > 0 ? userProfile.conditions.join(', ') : 'None'}
  - Current Medications: ${userProfile.medications.length > 0 ? userProfile.medications.join(', ') : 'None'}

  Symptoms:
  - Main Symptoms: ${symptoms}
  - Duration: ${duration}
  - Severity: ${severity}
  - Additional Information: ${additionalInfo || 'None provided'}

  Based on this, generate a JSON object with the following structure. Remember to prioritize safety and advise professional medical consultation for serious conditions or personalized advice.

  Expected JSON structure:
  \`\`\`json
  {
    "probableCauses": [],
    "differentialDiagnoses": [
      { "condition": "Condition A", "likelihood": "High/Medium/Low", "description": "Brief description" }
    ],
    "redFlagSymptoms": [],
    "detailedAnalysis": "",
    "recommendation": "",
    "urgency": "high/medium/low",
    "riskFactors": [],
    "followUpActions": []
  }
  \`\`\`
  Always include the general disclaimer at the end of your 'detailedAnalysis' or 'recommendation'.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("Raw Gemini Response:", text);

    // Attempt to extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    let parsedAnalysis: Partial<SymptomAnalysis> = {};

    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedAnalysis = JSON.parse(jsonMatch[1]);
        console.log("Parsed JSON Analysis:", parsedAnalysis);
      } catch (jsonError) {
        console.error("Failed to parse JSON from Gemini response:", jsonError);
        // Fallback if JSON parsing fails
        return {
          id: Date.now().toString(),
          userId: userProfile.age ? 'user-authenticated' : 'guest',
          symptoms: symptoms,
          duration,
          severity,
          additionalInfo,
          diagnosis: ['Analysis Error: Malformed AI Response'],
          recommendation: 'I encountered an issue processing the AI response. Please try rephrasing your symptoms, or consult a doctor directly. Remember, I am an AI and cannot provide medical advice.',
          urgency: 'low',
          detailedAnalysis: 'The AI model provided an output that could not be fully understood. This might be a temporary issue. For any health concerns, a direct consultation with a healthcare professional is recommended.',
          riskFactors: [],
          followUpActions: [],
          timestamp: new Date(),
          probableCauses: [],
          differentialDiagnoses: [],
          redFlagSymptoms: [],
        };
      }
    } else {
      console.warn("No JSON block found in Gemini response. Attempting simple text processing.");
      // If no JSON block, try to infer basic info (this is less reliable but provides a fallback)
      const lowerText = text.toLowerCase();
      let inferredUrgency: 'low' | 'medium' | 'high' = 'low';
      if (lowerText.includes('immediate emergency') || lowerText.includes('call 108') || lowerText.includes('severe medical attention')) {
        inferredUrgency = 'high';
      } else if (lowerText.includes('urgent consultation') || lowerText.includes('within 24-48 hours')) {
        inferredUrgency = 'medium';
      }

      return {
        id: Date.now().toString(),
        userId: userProfile.age ? 'user-authenticated' : 'guest',
        symptoms: symptoms,
        duration,
        severity,
        additionalInfo,
        diagnosis: ['General Health Information (AI could not parse structured data)'], // Fallback diagnosis
        recommendation: text.split('Disclaimer:')[0] || text, // Try to get recommendation before disclaimer
        urgency: inferredUrgency,
        detailedAnalysis: text, // Use full text as detailed analysis
        riskFactors: [],
        followUpActions: [],
        timestamp: new Date(),
        probableCauses: [],
        differentialDiagnoses: [],
        redFlagSymptoms: [],
      };
    }

    // Map the parsed JSON to SymptomAnalysis interface, providing defaults for robustness
    const finalAnalysis: SymptomAnalysis = {
      id: Date.now().toString(),
      userId: userProfile.age ? 'user-authenticated' : 'guest',
      symptoms: symptoms,
      duration: duration,
      severity: severity,
      additionalInfo: additionalInfo,
      diagnosis: parsedAnalysis.probableCauses || [], // Use probableCauses for main diagnosis array
      recommendation: parsedAnalysis.recommendation || 'Please consult a healthcare professional for specific advice. AI response was incomplete.',
      urgency: parsedAnalysis.urgency || 'low',
      detailedAnalysis: parsedAnalysis.detailedAnalysis || 'No detailed analysis was provided by the AI. Always seek professional medical advice.',
      riskFactors: parsedAnalysis.riskFactors || [],
      followUpActions: parsedAnalysis.followUpActions || [],
      timestamp: new Date(),
      probableCauses: parsedAnalysis.probableCauses || [],
      differentialDiagnoses: parsedAnalysis.differentialDiagnoses || [],
      redFlagSymptoms: parsedAnalysis.redFlagSymptoms || [],
    };

    return finalAnalysis;

  } catch (error) {
    console.error('Error calling Gemini API for analysis:', error);
    return {
      id: Date.now().toString(),
      userId: userProfile.age ? 'user-authenticated' : 'guest',
      symptoms: symptoms,
      duration,
      severity,
      additionalInfo,
      diagnosis: ['Analysis System Offline/Error'],
      recommendation: 'I apologize, but I am unable to perform the symptom analysis at this moment due to a technical issue. Please try again later, or consult a doctor directly for your health concerns.',
      urgency: 'low',
      detailedAnalysis: 'A connection error occurred while trying to fetch the AI analysis. This typically indicates a problem with the API service or your network connection. Please ensure your internet is stable and try again. For urgent matters, always seek medical attention.',
      riskFactors: [],
      followUpActions: [],
      timestamp: new Date(),
      probableCauses: [],
      differentialDiagnoses: [],
      redFlagSymptoms: [],
    };
  }
};


const SymptomChecker: React.FC = () => {
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [history, setHistory] = useState<SymptomAnalysis[]>([]);

  // Memoize the analysis function to prevent unnecessary re-renders or re-creations
  const analyzeSymptoms = useCallback(
    async (
      symptomText: string,
      duration: string,
      severity: string,
      additionalInfo: string
    ): Promise<SymptomAnalysis | null> => {
      const userProfile = {
        age: user?.age || 30, // Default age if not available
        gender: user?.gender || 'unknown', // Default gender if not available
        conditions: user?.diseases || [], // Assuming 'diseases' maps to 'conditions'
        medications: user?.medications || [],
      };

      // PRIMARY SAFETY CHECK: Hardcoded check for emergency keywords BEFORE sending to AI
      const lowerSymptoms = symptomText.toLowerCase();
      const emergencyKeywords = [
        'sudden severe chest pain', 'heart attack', 'stroke symptoms', 'difficulty breathing severe',
        'unconscious', 'severe bleeding', 'sudden weakness one side', 'blue lips', 'rigid belly',
        'worst headache of life', 'stiff neck with fever', 'call 108', 'call 911', 'emergency'
      ];

      if (emergencyKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
        return {
          id: Date.now().toString(),
          userId: user?.id || 'guest',
          symptoms: symptomText,
          duration,
          severity,
          additionalInfo,
          diagnosis: ['Medical Emergency Warning'],
          recommendation: '🚨 **IMMEDIATE EMERGENCY:** Your symptoms suggest a potential medical emergency. **Please call 108 (India\'s emergency number) or seek immediate professional medical attention at the nearest hospital.** Do not delay. I cannot provide medical diagnosis or treatment for emergencies.',
          urgency: 'high',
          detailedAnalysis: 'The AI system has detected critical keywords indicating a potentially life-threatening situation. It is paramount that you seek immediate in-person medical help.',
          riskFactors: ['Potential severe health event'],
          followUpActions: ['Call emergency services (108)', 'Go to ER immediately'],
          timestamp: new Date(),
          probableCauses: ['Medical Emergency'],
          differentialDiagnoses: [{ condition: 'Severe Medical Emergency', likelihood: 'High', description: 'Immediate professional medical intervention is required. AI cannot assist.' }],
          redFlagSymptoms: [symptomText], // Reflect the input as the red flag
        };
      }

      // If not an emergency, proceed with AI analysis
      try {
        const result = await fetchAIAnalysis({
          symptoms: symptomText,
          duration,
          severity,
          userProfile,
          additionalInfo,
        });
        return result;
      } catch (error) {
        console.error('Error during AI analysis:', error);
        // This catch block is for network/API call errors, fetchAIAnalysis also has its own error handling
        return {
          id: Date.now().toString(),
          userId: user?.id || 'guest',
          symptoms: symptomText,
          duration,
          severity,
          additionalInfo,
          diagnosis: ['Analysis Error'],
          recommendation: 'Could not complete analysis due to a network or server issue. Please try again or consult a doctor directly.',
          urgency: 'low',
          detailedAnalysis: 'An unexpected error occurred while trying to connect to the AI service. This might be a temporary problem with your internet connection or the server. For any health concerns, a direct consultation with a healthcare professional is always recommended.',
          riskFactors: [],
          followUpActions: [],
          timestamp: new Date(),
          probableCauses: [],
          differentialDiagnoses: [],
          redFlagSymptoms: [],
        };
      }
    },
    [user] // Recreate if user data changes
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim() || !duration || !severity) return; // Ensure all required fields are filled

    setIsAnalyzing(true);
    setAnalysis(null); // Clear previous analysis
    try {
      const result = await analyzeSymptoms(symptoms, duration, severity, additionalInfo);
      if (result) {
        setAnalysis(result);
        setHistory(prev => [result, ...prev]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      // The analyzeSymptoms function now handles error state returns, so this catch might be redundant for AI logic errors
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Removed handleDownloadPDF function

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-100 border-red-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-green-600 bg-green-100 border-green-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-6 w-6" />;
      case 'medium': return <Clock className="h-6 w-6" />;
      default: return <CheckCircle className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div className="flex items-center space-x-4">
            <Stethoscope className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900">Symptom Analyzer</h1>
              <p className="text-gray-600 text-lg mt-1">Get AI-powered insights for your symptoms. <span className="font-semibold text-blue-700">Not a substitute for medical advice.</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6 h-fit sticky top-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Search className="mr-2 h-6 w-6" /> Analyze Your Symptoms</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">Describe your symptoms in detail:</label>
                <textarea
                  id="symptoms"
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-y"
                  placeholder="e.g., 'Sharp pain in lower right abdomen, nausea, slight fever'"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                ></textarea>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">How long have you had these symptoms?</label>
                <select
                  id="duration"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                >
                  <option value="">Select Duration</option>
                  <option value="less than 24 hours">Less than 24 hours</option>
                  <option value="1-3 days">1-3 days</option>
                  <option value="3-7 days">3-7 days</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="2-4 weeks">2-4 weeks</option>
                  <option value="more than 1 month">More than 1 month</option>
                </select>
              </div>

              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-gray-700">How severe are your symptoms?</label>
                <select
                  id="severity"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  required
                >
                  <option value="">Select Severity</option>
                  <option value="mild">Mild (barely noticeable, doesn't affect daily activity)</option>
                  <option value="moderate">Moderate (noticeable, affects some daily activity)</option>
                  <option value="severe">Severe (significantly affects daily activity, distressing)</option>
                  <option value="critical">Critical (incapacitating, requires immediate attention)</option>
                </select>
              </div>

              <div>
                <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">Any other relevant information? (e.g., recent travel, diet changes, known allergies, family history)</label>
                <textarea
                  id="additionalInfo"
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-y"
                  placeholder="e.g., 'Recently ate raw seafood, no known allergies'"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white ${
                  isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Get Analysis'
                )}
              </button>
            </form>
          </div>

          {/* Analysis Report */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Brain className="mr-2 h-6 w-6" /> Symptom Analysis Report
            </h2>

            {analysis ? (
              <div className="space-y-6">
                <div className={`p-4 rounded-lg border-2 ${getUrgencyColor(analysis.urgency)} flex items-center space-x-3`}>
                  {getUrgencyIcon(analysis.urgency)}
                  <p className="font-bold text-lg">Urgency Level: {analysis.urgency.toUpperCase()}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><Stethoscope className="mr-2 h-5 w-5 text-blue-500" /> Probable Causes</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {analysis.probableCauses.length > 0 ? (
                      analysis.probableCauses.map((cause, index) => <li key={index}>{cause}</li>)
                    ) : (
                      <li>No specific probable causes identified.</li>
                    )}
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><FlaskConical className="mr-2 h-5 w-5 text-purple-500" /> Differential Diagnoses</h3>
                  {analysis.differentialDiagnoses.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {analysis.differentialDiagnoses.map((diag, index) => (
                        <li key={index}>
                          <strong>{diag.condition}</strong> (<span className={`font-semibold ${diag.likelihood === 'High' ? 'text-red-500' : diag.likelihood === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>{diag.likelihood}</span>): {diag.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700">No specific differential diagnoses provided by the AI at this time.</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-orange-500" /> Red Flag Symptoms</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {analysis.redFlagSymptoms && analysis.redFlagSymptoms.length > 0 ? (
                      analysis.redFlagSymptoms.map((flag, index) => <li key={index} className="text-red-700 font-medium">{flag}</li>)
                    ) : (
                      <li>None explicitly identified by AI in this analysis.</li>
                    )}
                  </ul>
                  {analysis.redFlagSymptoms && analysis.redFlagSymptoms.length > 0 && (
                    <p className="mt-2 text-sm text-red-700 font-semibold">
                      If you experience any of these symptoms, seek immediate medical attention.
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><Activity className="mr-2 h-5 w-5 text-teal-600" /> Detailed Analysis</h3>
                  <p className="text-gray-700 leading-relaxed">{analysis.detailedAnalysis}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><Heart className="mr-2 h-5 w-5 text-pink-600" /> Recommendations</h3>
                  <p className="text-gray-700 leading-relaxed">{analysis.recommendation}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><User className="mr-2 h-5 w-5 text-indigo-500" /> Risk Factors Identified</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {analysis.riskFactors && analysis.riskFactors.length > 0 ? (
                      analysis.riskFactors.map((factor, index) => <li key={index}>{factor}</li>)
                    ) : (
                      <li>No specific risk factors identified by AI.</li>
                    )}
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center"><Clock className="mr-2 h-5 w-5 text-gray-600" /> Suggested Follow-up Actions</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {analysis.followUpActions && analysis.followUpActions.length > 0 ? (
                      analysis.followUpActions.map((action, index) => <li key={index}>{action}</li>)
                    ) : (
                      <li>Standard monitoring of symptoms.</li>
                    )}
                  </ul>
                </div>

                {/* Removed PDF Download Button */}

                <p className="text-sm text-gray-500 mt-4 text-center">
                  **Disclaimer:** This analysis is generated by an AI and is intended for general informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare professional for any medical conditions or health concerns.
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                <Stethoscope className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-xl">Enter your symptoms to get an AI-powered analysis.</p>
                <p className="text-sm mt-2">Remember, this tool provides general information and is not a substitute for professional medical advice.</p>
              </div>
            )}
          </div>
        </div>

        {/* History Section - Optional, if you want to display past analyses */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Analysis History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500">No past analyses.</p>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">Symptoms: {item.symptoms}</p>
                    <p className="text-sm text-gray-600">Analyzed on: {item.timestamp.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Urgency: <span className={`${getUrgencyColor(item.urgency)} px-2 py-1 rounded-full text-xs`}>{item.urgency.toUpperCase()}</span></p>
                  </div>
                  {/* You could add a button here to view full analysis of historical item if desired */}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SymptomChecker;