import React, { useState, ChangeEvent, useRef } from 'react';
import { Loader, FlaskConical, Brain, AlertTriangle, FileText, Lightbulb, UserCheck, Stethoscope, Salad } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Please replace 'YOUR_PLACEHOLDER_API_KEY' with your actual API key.
const GEMINI_API_KEY = "AIzaSyB8LoMMNW3gbmYVbnv0iGSAN50H_LRqOMU";
// Initialize the Gemini AI model with the new system instruction
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are Dr. MediBot, an AI health assistant. Your primary role is to provide general health-related information and basic medical knowledge. You are programmed to always prioritize safety. You should provide accurate, general information about lung cancer disease and risk factors based on the provided data, and your advice should always include a strong recommendation to consult a qualified healthcare professional. You must never give a definitive diagnosis or medical advice.`
});

// A simple component for the 1-10 scale inputs to reduce repetition
const getDescription = (value) => {
    const descriptionMap = {
        '1': 'Very Low', '2': 'Low', '3': 'Slightly Low', '4': 'Moderate', '5': 'Medium',
        '6': 'Slightly High', '7': 'High', '8': 'Very High', '9': 'Critical', '10': 'Extremely High'
    };
    return descriptionMap[value] || '';
};

const ScaleInput = ({ name, value, onChange }) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 capitalize mb-1">
            {name.replace(/_/g, ' ')}
        </label>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            min="1"
            max="10"
            className="rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Enter a value (1-10)`}
        />
        {value && (
            <p className="text-xs text-gray-500 mt-1">
                {getDescription(value)}
            </p>
        )}
    </div>
);

const LungCancerPredictor = () => {
    const [predictionResult, setPredictionResult] = useState(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const [predictionError, setPredictionError] = useState('');
    const [generatedReport, setGeneratedReport] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [dietRecommendations, setDietRecommendations] = useState([]);
    const [medibotMessage, setMedibotMessage] = useState('');

    const reportRef = useRef(null);

    // Lung Cancer Prediction Form State
    const initialPredictionState = {
        age: '', gender: '1', air_pollution: '', alcohol_use: '', dust_allergy: '',
        occupational_hazards: '', genetic_risk: '', chronic_lung_disease: '',
        balanced_diet: '', obesity: '', smoking: '', passive_smoker: '',
        chest_pain: '', coughing_of_blood: '', fatigue: '', weight_loss: '',
        shortness_of_breath: '', wheezing: '', swallowing_difficulty: '',
        clubbing_of_finger_nails: '', frequent_cold: '', dry_cough: '', snoring: ''
    };
    const [predictionForm, setPredictionForm] = useState(initialPredictionState);

    // New state for detailed diet info
    const initialDietState = {
        dietary_preferences: '',
        specific_allergies_intolerances: '',
        preferred_food_groups: ''
    };
    const [dietForm, setDietForm] = useState(initialDietState);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setPredictionForm(prevForm => ({ ...prevForm, [name]: value }));
        setPredictionResult(null);
        setGeneratedReport(null);
        setRecommendations([]);
        setDietRecommendations([]);
        setMedibotMessage('');
    };

    const handleDietFormChange = (e) => {
        const { name, value } = e.target;
        setDietForm(prevForm => ({ ...prevForm, [name]: value }));
        setDietRecommendations([]);
    };

    const handlePredict = async () => {
        setIsPredicting(true);
        setPredictionResult(null);
        setPredictionError('');
        setGeneratedReport(null);
        setRecommendations([]);
        setDietRecommendations([]);
        setMedibotMessage('');

        const allRequiredFieldsFilled = Object.values(predictionForm).every(val => val !== '');
        if (!allRequiredFieldsFilled) {
            setPredictionError('Please fill out all risk assessment fields to get a risk assessment.');
            setIsPredicting(false);
            return;
        }

        try {
            const formData = Object.entries(predictionForm).map(([key, value]) => {
                if (key === 'gender') {
                    return `${key.replace(/_/g, ' ')}: ${value === '1' ? 'Male' : 'Female'}`;
                }
                return `${key.replace(/_/g, ' ')}: ${value}`;
            }).join(', ');
            
            const dietData = Object.entries(dietForm).map(([key, value]) => {
                return `${key.replace(/_/g, ' ')}: ${value || 'None specified'}`;
            }).join(', ');

            const userQuery = `Based on the following patient data for lung cancer risk factors on a scale of 1-10, where 1 is very low and 10 is extremely high, please provide a risk level (High, Medium, or Low), a detailed report, and a list of general recommendations and a separate list of very personalized food and diet recommendations tailored to the provided dietary preferences. Your report should be in markdown format.

            Data: ${formData}. Dietary Details: ${dietData}`;

            const result = await model.generateContent({
                contents: [{ parts: [{ text: userQuery }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "riskLevel": { "type": "STRING" },
                            "report": { "type": "STRING" },
                            "recommendations": { "type": "ARRAY", "items": { "type": "STRING" } },
                            "dietRecommendations": { "type": "ARRAY", "items": { "type": "STRING" } }
                        }
                    }
                }
            });

            const jsonString = result.response.candidates[0].content.parts[0].text;
            const parsedData = JSON.parse(jsonString);

            if (parsedData.riskLevel && parsedData.report && parsedData.recommendations && parsedData.dietRecommendations) {
                setPredictionResult(parsedData.riskLevel);
                setGeneratedReport(parsedData.report);
                setRecommendations(parsedData.recommendations);
                setDietRecommendations(parsedData.dietRecommendations);

                // Set the dynamic MediBot message based on the risk level
                switch (parsedData.riskLevel) {
                    case 'High':
                        setMedibotMessage("Your assessment indicates a **High Risk** level based on the data you provided. This is not a diagnosis. It is crucial to schedule an appointment with a healthcare professional to discuss your results and undergo a comprehensive medical evaluation.");
                        break;
                    case 'Medium':
                        setMedibotMessage("Your assessment indicates a **Medium Risk** level. While this is not a cause for immediate alarm, it is still very important to consult with a doctor to review your risk factors and determine the best course of action.");
                        break;
                    case 'Low':
                        setMedibotMessage("Your assessment indicates a **Low Risk** level. This is encouraging, but it is not a guarantee of future health. We still strongly recommend a discussion with a healthcare professional to maintain a proactive approach to your well-being.");
                        break;
                    default:
                        setMedibotMessage('');
                }

            } else {
                setPredictionError('Unexpected response from API. Please try again.');
            }

        } catch (error) {
            console.error('Error during API call:', error);
            setPredictionError('Failed to get an assessment from API. Please check your network connection and API key.');
        } finally {
            setIsPredicting(false);
        }
    };

    const levelColors = {
        'High': 'bg-red-500',
        'Medium': 'bg-yellow-500',
        'Low': 'bg-green-500',
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800 flex flex-col items-center">
            <style>
                {`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                `}
            </style>

            <main ref={reportRef} className="w-full xl:max-w-7xl mx-auto space-y-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center"><Stethoscope className="w-10 h-10 mr-4 text-blue-500" /> Dr. MediBot Health Assessment</h1>
                    <p className="text-gray-500">This tool provides a general assessment of lung cancer risk factors based on the information you provide. It is not a substitute for professional medical advice.</p>
                </header>

                {/* Lung Cancer Prediction Section */}
                <div>
                    <div className="flex items-center mb-4 justify-center">
                        <Brain className="w-8 h-8 text-indigo-500 mr-3" />
                        <h2 className="text-2xl font-bold text-gray-900">Your Data</h2>
                    </div>

                    <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Age Input */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 capitalize mb-1">Age</label>
                            <input
                                type="number"
                                name="age"
                                value={predictionForm.age}
                                onChange={handleFormChange}
                                className="rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your age"
                            />
                        </div>

                        {/* Gender Input */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 capitalize mb-1">Gender</label>
                            <select
                                name="gender"
                                value={predictionForm.gender}
                                onChange={handleFormChange}
                                className="rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="1">Male</option>
                                <option value="2">Female</option>
                            </select>
                        </div>

                        {/* 1-10 Scale Inputs */}
                        {Object.entries(initialPredictionState).filter(([key]) => key !== 'age' && key !== 'gender').map(([key]) => (
                            <ScaleInput
                                key={key}
                                name={key}
                                value={predictionForm[key]}
                                onChange={handleFormChange}
                            />
                        ))}
                    </form>

                    {/* New Inputs for Personalized Diet Recommendations */}
                    <div className="mt-8 flex items-center mb-4 justify-center">
                        <Salad className="w-8 h-8 text-green-500 mr-3" />
                        <h2 className="text-2xl font-bold text-gray-900">Dietary Preferences</h2>
                    </div>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Food Allergies/Intolerances */}
                        <div className="flex flex-col md:col-span-1">
                            <label className="text-sm font-medium text-gray-700 capitalize mb-1">Specific Allergies/Intolerances</label>
                            <textarea
                                name="specific_allergies_intolerances"
                                value={dietForm.specific_allergies_intolerances}
                                onChange={handleDietFormChange}
                                rows={2}
                                className="rounded-md border border-gray-300 p-2 w-full focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Peanuts, dairy, gluten"
                            />
                        </div>
                        {/* Preferred Food Groups */}
                        <div className="flex flex-col md:col-span-1">
                            <label className="text-sm font-medium text-gray-700 capitalize mb-1">Preferred or Disliked Food Groups</label>
                            <textarea
                                name="preferred_food_groups"
                                value={dietForm.preferred_food_groups}
                                onChange={handleDietFormChange}
                                rows={2}
                                className="rounded-md border border-gray-300 p-2 w-full focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Lean proteins, leafy greens, avoid red meat"
                            />
                        </div>
                    </form>

                    <button
                        onClick={handlePredict}
                        className="w-full flex items-center justify-center mt-6 bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 transition-colors font-semibold shadow-md"
                        disabled={isPredicting}
                    >
                        {isPredicting ? (
                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <FlaskConical className="w-5 h-5 mr-2" />
                        )}
                        {isPredicting ? 'Assessing Risk...' : 'Assess Risk Level'}
                    </button>

                    {predictionError && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                            <AlertTriangle className="inline w-5 h-5 mr-2" />
                            {predictionError}
                        </div>
                    )}
                </div>

                {/* Report and Recommendation Section */}
                {predictionResult && generatedReport && (
                    <div className="mt-6 space-y-6">
                        {/* Dynamic Message Section */}
                        <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-md">
                            <div className="flex items-start">
                                <Stethoscope className="w-6 h-6 mr-3 mt-1 text-blue-500 flex-shrink-0" />
                                <p className="text-base font-medium">
                                    {medibotMessage}
                                </p>
                            </div>
                        </div>

                        {/* Prediction Result Display */}
                        <div className={`p-4 rounded-lg flex items-center space-x-3 transition-all duration-300 ${levelColors[predictionResult]} text-white shadow-md`}>
                            <UserCheck className="w-8 h-8" />
                            <div>
                                <h3 className="text-lg font-bold">Assessment Result:</h3>
                                <p className="text-2xl font-extrabold">{predictionResult} Risk</p>
                            </div>
                        </div>

                        {/* Report Section */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center mb-4">
                                <FileText className="w-8 h-8 text-blue-500 mr-3" />
                                <h2 className="text-2xl font-bold text-gray-900">Dr. MediBot's Report</h2>
                            </div>
                            <div className="prose max-w-none text-gray-600 mb-4 custom-scrollbar overflow-x-auto" dangerouslySetInnerHTML={{ __html: generatedReport }}></div>
                        </div>

                        {/* Recommendations Section */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center mb-4">
                                <Lightbulb className="w-8 h-8 text-yellow-500 mr-3" />
                                <h2 className="text-2xl font-bold text-gray-900">General Recommendations</h2>
                            </div>
                            <ul className="list-disc list-inside space-y-2 text-gray-600">
                                {recommendations.map((rec, index) => (
                                    <li key={index} dangerouslySetInnerHTML={{ __html: rec }} />
                                ))}
                            </ul>
                        </div>

                        {/* Diet Recommendations Section */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center mb-4">
                                <Salad className="w-8 h-8 text-green-500 mr-3" />
                                <h2 className="text-2xl font-bold text-gray-900">Diet & Nutrition Recommendations</h2>
                            </div>
                            <ul className="list-disc list-inside space-y-2 text-gray-600">
                                {dietRecommendations.map((rec, index) => (
                                    <li key={index} dangerouslySetInnerHTML={{ __html: rec }} />
                                ))}
                            </ul>
                            <div className="mt-6 p-4 bg-gray-50 border-l-4 border-yellow-500 text-sm text-gray-700 rounded-md">
                                <p className="font-semibold">Disclaimer:</p>
                                <p>This information is for general educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified health provider with any questions you may have regarding a medical condition.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LungCancerPredictor;
