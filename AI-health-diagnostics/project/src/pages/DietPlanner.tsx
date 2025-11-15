import React, { useState, useEffect } from 'react';
import { Apple, Calculator, Download, RefreshCw, Target, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DietPlan } from '../types';
import { PDFExportUtil } from '../utils/pdfExport';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const DietPlanner: React.FC = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<DietPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preferences, setPreferences] = useState({
    dietType: 'balanced',
    activityLevel: user?.exerciseFrequency || 'moderate',
    goalType: 'maintain',
    restrictions: [] as string[]
  });

  // Load user's diet plan from localStorage
  useEffect(() => {
    if (user) {
      const userDietPlan = localStorage.getItem(`diet_plan_${user.id}`);
      if (userDietPlan) {
        const parsedPlan = JSON.parse(userDietPlan);
        parsedPlan.createdAt = new Date(parsedPlan.createdAt);
        setCurrentPlan(parsedPlan);
      }
    }
  }, [user]);

  // Calculate BMR and daily calories based on user data
  const calculateCalories = () => {
    if (!user || user.age === 0 || user.height === 0 || user.weight === 0) {
      return 2000; // Default fallback
    }
    
    // Harris-Benedict Equation
    let bmr;
    if (user.gender === 'male') {
      bmr = 88.362 + (13.397 * user.weight) + (4.799 * user.height) - (5.677 * user.age);
    } else {
      bmr = 447.593 + (9.247 * user.weight) + (3.098 * user.height) - (4.330 * user.age);
    }

    // Activity factor
    const activityFactors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = bmr * activityFactors[preferences.activityLevel as keyof typeof activityFactors];

    // Goal adjustment
    const goalAdjustments = {
      lose: -500,
      maintain: 0,
      gain: 300
    };

    return Math.round(tdee + goalAdjustments[preferences.goalType as keyof typeof goalAdjustments]);
  };

  // Generate personalized diet plan based on user data
  const generateDietPlan = async (): Promise<DietPlan> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const targetCalories = calculateCalories();
    const userConditions = user?.diseases || [];
    const userAllergies = user?.allergies || [];
    const dietaryPrefs = user?.dietaryPreferences || [];
    
    const isDiabetic = userConditions.some(d => d.toLowerCase().includes('diabetes'));
    const hasHypertension = userConditions.some(d => d.toLowerCase().includes('hypertension'));
    const isVegetarian = dietaryPrefs.some(p => p.toLowerCase().includes('vegetarian')) || preferences.dietType === 'vegetarian';
    const isGlutenFree = dietaryPrefs.some(p => p.toLowerCase().includes('gluten'));
    
    let meals;
    
    if (isVegetarian) {
      meals = {
        breakfast: isDiabetic 
          ? `Vegetable oats upma with mixed vegetables (${Math.round(targetCalories * 0.2)} cal) + Greek yogurt with berries + Green tea`
          : `Vegetable poha with peanuts (${Math.round(targetCalories * 0.25)} cal) + Milk with almonds + Fresh seasonal fruit`,
        lunch: isDiabetic
          ? `Brown rice (1/2 cup, ${Math.round(targetCalories * 0.15)} cal) + Dal tadka + Mixed vegetable curry + Cucumber salad`
          : `Quinoa pulao with vegetables (${Math.round(targetCalories * 0.3)} cal) + Rajma curry + Yogurt + Green salad`,
        dinner: isDiabetic
          ? `Grilled paneer with herbs (${Math.round(targetCalories * 0.2)} cal) + Roti (2 small) + Palak curry + Buttermilk`
          : `Vegetable biryani with raita (${Math.round(targetCalories * 0.25)} cal) + Papad + Pickle`,
        snacks: isDiabetic
          ? [`Roasted chana (${Math.round(targetCalories * 0.1)} cal)`, `Herbal tea with 2 digestive biscuits`]
          : [`Mixed nuts and seeds (${Math.round(targetCalories * 0.1)} cal)`, `Masala chai with whole grain rusk`]
      };
    } else if (preferences.dietType === 'keto') {
      meals = {
        breakfast: `Scrambled eggs with cheese and avocado (${Math.round(targetCalories * 0.25)} cal) + Bullet coffee`,
        lunch: `Grilled chicken salad with olive oil dressing (${Math.round(targetCalories * 0.35)} cal) + Broccoli with butter`,
        dinner: `Baked salmon with herbs (${Math.round(targetCalories * 0.25)} cal) + Asparagus + Cauliflower mash`,
        snacks: [`Cheese cubes (${Math.round(targetCalories * 0.08)} cal)`, `Macadamia nuts (${Math.round(targetCalories * 0.07)} cal)`]
      };
    } else {
      meals = {
        breakfast: isDiabetic
          ? `Oatmeal with nuts and seeds (${Math.round(targetCalories * 0.2)} cal) + Boiled egg + Green tea`
          : `Whole grain toast with avocado (${Math.round(targetCalories * 0.25)} cal) + Scrambled eggs + Orange juice`,
        lunch: isDiabetic
          ? `Grilled chicken breast (${Math.round(targetCalories * 0.25)} cal) + Quinoa + Steamed vegetables + Small apple`
          : `Chicken wrap with vegetables (${Math.round(targetCalories * 0.3)} cal) + Side salad + Yogurt`,
        dinner: isDiabetic
          ? `Baked fish with lemon (${Math.round(targetCalories * 0.2)} cal) + Sweet potato + Green beans + Mixed greens`
          : `Lean beef stir-fry with vegetables (${Math.round(targetCalories * 0.25)} cal) + Brown rice + Steamed broccoli`,
        snacks: isDiabetic
          ? [`Apple with almond butter (${Math.round(targetCalories * 0.1)} cal)`, `Greek yogurt with berries`]
          : [`Trail mix (${Math.round(targetCalories * 0.1)} cal)`, `Protein smoothie with banana`]
      };
    }

    // Adjust macros based on diet type and conditions
    let macros;
    if (preferences.dietType === 'keto') {
      macros = { protein: 25, carbs: 5, fat: 70 };
    } else if (isDiabetic) {
      macros = { protein: 30, carbs: 40, fat: 30 };
    } else if (isVegetarian) {
      macros = { protein: 20, carbs: 55, fat: 25 };
    } else {
      macros = { protein: 25, carbs: 50, fat: 25 };
    }

    const newPlan: DietPlan = {
      id: Date.now().toString(),
      userId: user?.id || '1',
      targetCalories,
      meals,
      macros,
      createdAt: new Date()
    };

    // Save to localStorage
    if (user) {
      localStorage.setItem(`diet_plan_${user.id}`, JSON.stringify(newPlan));
    }

    return newPlan;
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const plan = await generateDietPlan();
      setCurrentPlan(plan);
    } catch (error) {
      console.error('Failed to generate diet plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentPlan) return;
    
    try {
      await PDFExportUtil.generatePDF('diet-plan-content', 'Personalized Diet Plan');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const pieData = currentPlan ? [
    { name: 'Protein', value: currentPlan.macros.protein, color: '#3B82F6' },
    { name: 'Carbs', value: currentPlan.macros.carbs, color: '#10B981' },
    { name: 'Fat', value: currentPlan.macros.fat, color: '#F59E0B' }
  ] : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-medium">{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  const calculateBMI = () => {
    if (user && user.height > 0 && user.weight > 0) {
      const heightInMeters = user.height / 100;
      return (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return 'N/A';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Apple className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Personalized Diet Planner</h1>
            <p className="text-gray-600">AI-generated meal plans based on your health profile</p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Generate New Plan</span>
          </button>
          {currentPlan && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Preferences Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diet Type</label>
                <select
                  value={preferences.dietType}
                  onChange={(e) => setPreferences(prev => ({ ...prev, dietType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="balanced">Balanced</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="keto">Ketogenic</option>
                  <option value="mediterranean">Mediterranean</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
                <select
                  value={preferences.activityLevel}
                  onChange={(e) => setPreferences(prev => ({ ...prev, activityLevel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light Activity</option>
                  <option value="moderate">Moderate Activity</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
                <select
                  value={preferences.goalType}
                  onChange={(e) => setPreferences(prev => ({ ...prev, goalType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Weight</option>
                </select>
              </div>
            </div>

            {/* Health Profile */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-2">Health Profile</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{user?.age || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">BMI:</span>
                  <span className="font-medium">{calculateBMI()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-medium">{user?.weight || 'N/A'} kg</span>
                </div>
              </div>
            </div>

            {/* Health Conditions */}
            {user?.diseases && user.diseases.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Health Conditions</h3>
                <div className="space-y-2">
                  {user.diseases.map((disease, index) => (
                    <span
                      key={index}
                      className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2"
                    >
                      {disease}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dietary Preferences */}
            {user?.dietaryPreferences && user.dietaryPreferences.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Dietary Preferences</h3>
                <div className="space-y-2">
                  {user.dietaryPreferences.map((pref, index) => (
                    <span
                      key={index}
                      className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2"
                    >
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* BMI Calculator */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Calorie Target</span>
              </div>
              <div className="text-sm text-blue-800">
                <p>Daily Goal: {calculateCalories()} calories</p>
                <p className="text-xs mt-1">Based on your profile and activity level</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diet Plan Content */}
        <div className="lg:col-span-3">
          {isGenerating ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Generating Your Diet Plan</h2>
              <p className="text-gray-500">Creating personalized meal recommendations based on your health profile...</p>
            </div>
          ) : currentPlan ? (
            <div id="diet-plan-content" className="space-y-6">
              {/* Plan Overview */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Personalized Diet Plan</h2>
                    <p className="text-gray-600">Target: {currentPlan.targetCalories} calories/day</p>
                    <p className="text-sm text-gray-500">Generated on {currentPlan.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <Target className="h-5 w-5" />
                    <span className="font-medium">Optimized for your health profile</span>
                  </div>
                </div>

                {/* Macronutrient Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Macronutrient Distribution</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Protein</span>
                        <span className="font-medium text-blue-600">{currentPlan.macros.protein}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Carbohydrates</span>
                        <span className="font-medium text-green-600">{currentPlan.macros.carbs}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Fat</span>
                        <span className="font-medium text-yellow-600">{currentPlan.macros.fat}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Meal Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Breakfast */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                    Breakfast
                  </h3>
                  <p className="text-gray-700">{currentPlan.meals.breakfast}</p>
                </div>

                {/* Lunch */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-orange-400 rounded-full mr-2"></span>
                    Lunch
                  </h3>
                  <p className="text-gray-700">{currentPlan.meals.lunch}</p>
                </div>

                {/* Dinner */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-purple-400 rounded-full mr-2"></span>
                    Dinner
                  </h3>
                  <p className="text-gray-700">{currentPlan.meals.dinner}</p>
                </div>

                {/* Snacks */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                    Snacks
                  </h3>
                  <ul className="space-y-2">
                    {currentPlan.meals.snacks.map((snack, index) => (
                      <li key={index} className="text-gray-700 flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                        {snack}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Personalized Recommendations */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalized Recommendations</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ul className="space-y-2 text-blue-800">
                    {user?.diseases && user.diseases.length > 0 && (
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                        <span>This plan is designed considering your health conditions: {user.diseases.join(', ')}</span>
                      </li>
                    )}
                    {user?.allergies && user.allergies.length > 0 && (
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                        <span>Avoided allergens: {user.allergies.join(', ')}</span>
                      </li>
                    )}
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                      <span>Drink at least 8-10 glasses of water throughout the day</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                      <span>Take meals at regular intervals to maintain stable energy levels</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                      <span>Adjust portion sizes based on your hunger and activity level</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                      <span>Consult with your healthcare provider before making significant dietary changes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Apple className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No Diet Plan Generated</h2>
              <p className="text-gray-500 mb-6">Generate your first personalized meal plan based on your health profile</p>
              <button
                onClick={handleGeneratePlan}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Generate Diet Plan</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DietPlanner;