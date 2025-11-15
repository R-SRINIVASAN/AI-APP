import React, { useState, useEffect } from 'react';
import { Activity, Plus, TrendingUp, Download, Calendar, Filter, Lightbulb } from 'lucide-react'; // Added Lightbulb icon
import { useAuth } from '../contexts/AuthContext';
import { HealthVital } from '../types';
import { Line } from 'react-chartjs-2';
import { PDFExportUtil } from '../utils/pdfExport';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Helper Functions for WHO Norms (unchanged) ---

// Define categories and their corresponding Tailwind CSS classes for styling
const HEALTH_STATUS_CLASSES = {
  NORMAL: 'text-green-600',
  ELEVATED: 'text-yellow-600',
  HIGH: 'text-orange-600',
  DANGER: 'text-red-600 font-semibold',
  LOW: 'text-blue-600', // For low heart rate, SpO2, etc.
  CRITICAL: 'text-purple-600 font-bold', // For very low SpO2 or crisis BP
  GOOD: 'text-green-600',
  RISK: 'text-yellow-600',
  DIABETES: 'text-red-600',
  FEVER: 'text-red-600',
  HYPOTHERMIA: 'text-blue-600',
  OVERWEIGHT: 'text-orange-600',
  OBESE: 'text-red-600'
};

const getBpCategory = (systolic: number, diastolic: number): { status: string; className: string } => {
  if (systolic > 180 || diastolic > 120) {
    return { status: 'Hypertensive Crisis', className: HEALTH_STATUS_CLASSES.CRITICAL };
  } else if (systolic >= 140 || diastolic >= 90) {
    return { status: 'Hypertension Stage 2', className: HEALTH_STATUS_CLASSES.DANGER };
  } else if (systolic >= 130 || diastolic >= 80) {
    return { status: 'Hypertension Stage 1', className: HEALTH_STATUS_CLASSES.HIGH };
  } else if (systolic >= 120 && diastolic < 80) {
    return { status: 'Elevated', className: HEALTH_STATUS_CLASSES.ELEVATED };
  } else if (systolic < 120 && diastolic < 80) {
    return { status: 'Normal', className: HEALTH_STATUS_CLASSES.NORMAL };
  }
  return { status: 'N/A', className: 'text-gray-900' };
};

const getHeartRateCategory = (heartRate: number): { status: string; className: string } => {
  if (heartRate < 60) {
    return { status: 'Bradycardia (Low)', className: HEALTH_STATUS_CLASSES.LOW };
  } else if (heartRate > 100) {
    return { status: 'Tachycardia (High)', className: HEALTH_STATUS_CLASSES.HIGH };
  } else {
    return { status: 'Normal', className: HEALTH_STATUS_CLASSES.NORMAL };
  }
};

const getOxygenSaturationCategory = (spO2: number): { status: string; className: string } => {
  if (spO2 < 85) {
    return { status: 'Severe Hypoxemia', className: HEALTH_STATUS_CLASSES.CRITICAL };
  } else if (spO2 >= 85 && spO2 <= 89) {
    return { status: 'Moderate Hypoxemia', className: HEALTH_STATUS_CLASSES.DANGER };
  } else if (spO2 >= 90 && spO2 <= 94) {
    return { status: 'Mild Hypoxemia', className: HEALTH_STATUS_CLASSES.ELEVATED };
  } else if (spO2 >= 95 && spO2 <= 100) {
    return { status: 'Normal', className: HEALTH_STATUS_CLASSES.NORMAL };
  }
  return { status: 'N/A', className: 'text-gray-900' };
};

const getBloodSugarCategory = (bloodSugar: number): { status: string; className: string } => {
  // Assuming fasting blood sugar for these categories
  if (bloodSugar < 70) {
    return { status: 'Hypoglycemia (Low)', className: HEALTH_STATUS_CLASSES.LOW };
  } else if (bloodSugar >= 70 && bloodSugar <= 99) {
    return { status: 'Normal', className: HEALTH_STATUS_CLASSES.NORMAL };
  } else if (bloodSugar >= 100 && bloodSugar <= 125) {
    return { status: 'Pre-diabetes', className: HEALTH_STATUS_CLASSES.RISK };
  } else if (bloodSugar >= 126) {
    return { status: 'Diabetes', className: HEALTH_STATUS_CLASSES.DIABETES };
  }
  return { status: 'N/A', className: 'text-gray-900' };
};

const getTemperatureCategory = (temperature: number): { status: string; className: string } => {
  if (temperature >= 100.4) {
    return { status: 'Fever', className: HEALTH_STATUS_CLASSES.FEVER };
  } else if (temperature < 95.0) {
    return { status: 'Hypothermia', className: HEALTH_STATUS_CLASSES.HYPOTHERMIA };
  } else if (temperature >= 97.0 && temperature <= 99.6) {
    return { status: 'Normal', className: HEALTH_STATUS_CLASSES.NORMAL };
  }
  return { status: 'Abnormal', className: HEALTH_STATUS_CLASSES.ELEVATED };
};

const getWeightCategory = (weight: number, heightCm: number): { status: string; className: string } => {
  if (!heightCm || heightCm === 0) {
    return { status: 'No Height Data', className: 'text-gray-500' };
  }
  const heightM = heightCm / 100; // Convert cm to meters
  const bmi = weight / (heightM * heightM);

  if (bmi < 18.5) {
    return { status: `Underweight (BMI: ${bmi.toFixed(1)})`, className: HEALTH_STATUS_CLASSES.LOW };
  } else if (bmi >= 18.5 && bmi <= 24.9) {
    return { status: `Normal Weight (BMI: ${bmi.toFixed(1)})`, className: HEALTH_STATUS_CLASSES.NORMAL };
  } else if (bmi >= 25.0 && bmi <= 29.9) {
    return { status: `Overweight (BMI: ${bmi.toFixed(1)})`, className: HEALTH_STATUS_CLASSES.OVERWEIGHT };
  } else if (bmi >= 30.0) {
    return { status: `Obese (BMI: ${bmi.toFixed(1)})`, className: HEALTH_STATUS_CLASSES.OBESE };
  }
  return { status: 'N/A', className: 'text-gray-900' };
};


// --- HealthVitals Component ---
const HealthVitals: React.FC = () => {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<HealthVital[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    oxygenSaturation: '',
    bloodSugar: '',
    temperature: '',
    weight: '',
    notes: ''
  });

  // Load user's vitals from localStorage
  useEffect(() => {
    if (user) {
      const userVitals = localStorage.getItem(`vitals_${user.id}`);
      if (userVitals) {
        const parsedVitals = JSON.parse(userVitals).map((vital: any) => ({
          ...vital,
          date: new Date(vital.date)
        }));
        setVitals(parsedVitals);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newVital: HealthVital = {
      id: Date.now().toString(),
      userId: user?.id || '1',
      date: new Date(),
      bloodPressureSystolic: parseInt(formData.bloodPressureSystolic),
      bloodPressureDiastolic: parseInt(formData.bloodPressureDiastolic),
      heartRate: parseInt(formData.heartRate),
      oxygenSaturation: parseInt(formData.oxygenSaturation),
      bloodSugar: parseInt(formData.bloodSugar),
      temperature: parseFloat(formData.temperature),
      weight: parseFloat(formData.weight),
      notes: formData.notes
    };

    const updatedVitals = [newVital, ...vitals];
    setVitals(updatedVitals);
    
    // Save to localStorage
    if (user) {
      localStorage.setItem(`vitals_${user.id}`, JSON.stringify(updatedVitals));
    }
    
    setFormData({
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      oxygenSaturation: '',
      bloodSugar: '',
      temperature: '',
      weight: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  const getChartData = () => {
    const last30Days = vitals.slice(0, 30).reverse();
    const labels = last30Days.map(v => new Date(v.date).toLocaleDateString());

    const datasets = [];

    if (selectedMetric === 'all' || selectedMetric === 'bloodPressure') {
      datasets.push({
        label: 'Systolic BP',
        data: last30Days.map(v => v.bloodPressureSystolic),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4
      });
      if (selectedMetric === 'all') { // Only show diastolic if 'all' is selected for clarity
        datasets.push({
          label: 'Diastolic BP',
          data: last30Days.map(v => v.bloodPressureDiastolic),
          borderColor: 'rgb(255, 159, 64)', // Different color for diastolic
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          fill: false,
          tension: 0.4
        });
      }
    }

    if (selectedMetric === 'all' || selectedMetric === 'heartRate') {
      datasets.push({
        label: 'Heart Rate',
        data: last30Days.map(v => v.heartRate),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4
      });
    }

    if (selectedMetric === 'all' || selectedMetric === 'bloodSugar') {
      datasets.push({
        label: 'Blood Sugar',
        data: last30Days.map(v => v.bloodSugar),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4
      });
    }

    if (selectedMetric === 'all' || selectedMetric === 'oxygenSaturation') {
      datasets.push({
        label: 'Oxygen Saturation',
        data: last30Days.map(v => v.oxygenSaturation),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: false,
        tension: 0.4
      });
    }

    if (selectedMetric === 'all' || selectedMetric === 'temperature') {
      datasets.push({
        label: 'Temperature (°F)',
        data: last30Days.map(v => v.temperature),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: false,
        tension: 0.4
      });
    }

    if (selectedMetric === 'all' || selectedMetric === 'weight') {
      datasets.push({
        label: 'Weight (kg)',
        data: last30Days.map(v => v.weight),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: false,
        tension: 0.4
      });
    }

    return { labels, datasets };
  };

  const calculateStats = () => {
    if (vitals.length === 0) return null;

    const last7Days = vitals.slice(0, 7);
    
    // Check if last7Days is empty to avoid division by zero
    if (last7Days.length === 0) return null;

    const avgBP = {
      systolic: Math.round(last7Days.reduce((sum, v) => sum + v.bloodPressureSystolic, 0) / last7Days.length),
      diastolic: Math.round(last7Days.reduce((sum, v) => sum + v.bloodPressureDiastolic, 0) / last7Days.length)
    };

    const avgHeartRate = Math.round(last7Days.reduce((sum, v) => sum + v.heartRate, 0) / last7Days.length);
    const maxSpO2 = Math.max(...last7Days.map(v => v.oxygenSaturation));
    const minSpO2 = Math.min(...last7Days.map(v => v.oxygenSaturation));
    const avgBloodSugar = Math.round(last7Days.reduce((sum, v) => sum + v.bloodSugar, 0) / last7Days.length);
    const avgTemperature = parseFloat((last7Days.reduce((sum, v) => sum + v.temperature, 0) / last7Days.length).toFixed(1));
    const avgWeight = parseFloat((last7Days.reduce((sum, v) => sum + v.weight, 0) / last7Days.length).toFixed(1));


    return { avgBP, avgHeartRate, maxSpO2, minSpO2, avgBloodSugar, avgTemperature, avgWeight };
  };

  const stats = calculateStats();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows the chart to fill the container height
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Health Vitals Trends (Last 30 Days)'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await PDFExportUtil.generatePDF('vitals-content', 'Health Vitals Report');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // --- Prediction Logic ---
  const getHealthPredictions = (): string[] => {
    const predictions: string[] = [];
    if (vitals.length < 3) {
      predictions.push('Add more vital entries to enable detailed health trend predictions.');
      return predictions;
    }

    const latestVitals = vitals[0];
    const previousVitals = vitals[1]; // One entry before latest
    const olderVitals = vitals[2]; // Two entries before latest

    // Blood Pressure Prediction
    const latestBpCategory = getBpCategory(latestVitals.bloodPressureSystolic, latestVitals.bloodPressureDiastolic);
    if (latestBpCategory.status.includes('Hypertension') || latestBpCategory.status.includes('Crisis')) {
      predictions.push(`Your blood pressure is currently **${latestBpCategory.status}**. Consult a doctor.`);
    } else if (latestBpCategory.status.includes('Elevated')) {
      predictions.push(`Your blood pressure is **${latestBpCategory.status}**. Consider lifestyle changes.`);
    }

    // Trend analysis for Blood Pressure
    if (vitals.length >= 3) {
      const systolicTrend = latestVitals.bloodPressureSystolic - previousVitals.bloodPressureSystolic;
      const diastolicTrend = latestVitals.bloodPressureDiastolic - previousVitals.bloodPressureDiastolic;

      if (systolicTrend > 5 && diastolicTrend > 3 && getBpCategory(previousVitals.bloodPressureSystolic, previousVitals.bloodPressureDiastolic).status.includes('Normal')) {
        predictions.push('Your blood pressure shows an **upward trend**. Monitor closely.');
      } else if (systolicTrend < -5 && diastolicTrend < -3 && getBpCategory(previousVitals.bloodPressureSystolic, previousVitals.bloodPressureDiastolic).status.includes('High')) {
        predictions.push('Your blood pressure shows a **downward trend**. Good progress!');
      }
    }


    // Heart Rate Prediction
    const latestHeartRateCategory = getHeartRateCategory(latestVitals.heartRate);
    if (latestHeartRateCategory.status.includes('Tachycardia')) {
      predictions.push(`Your heart rate is **${latestHeartRateCategory.status}**. It's advisable to check with a healthcare provider.`);
    } else if (latestHeartRateCategory.status.includes('Bradycardia')) {
      predictions.push(`Your heart rate is **${latestHeartRateCategory.status}**. Consult a doctor if you feel unwell.`);
    }

    // Blood Sugar Prediction
    const latestBsCategory = getBloodSugarCategory(latestVitals.bloodSugar);
    if (latestBsCategory.status.includes('Diabetes') || latestBsCategory.status.includes('Pre-diabetes')) {
      predictions.push(`Your blood sugar indicates **${latestBsCategory.status}**. Regular monitoring and medical advice are recommended.`);
    }

    // Oxygen Saturation Prediction
    const latestSpO2Category = getOxygenSaturationCategory(latestVitals.oxygenSaturation);
    if (latestSpO2Category.status.includes('Hypoxemia')) {
      predictions.push(`Your oxygen saturation is **${latestSpO2Category.status}**. Seek immediate medical attention.`);
    }

    // Weight Trend Prediction
    if (user?.heightCm && vitals.length >= 3) {
      const latestBmiStatus = getWeightCategory(latestVitals.weight, user.heightCm).status;
      const previousBmiStatus = getWeightCategory(previousVitals.weight, user.heightCm).status;
      const olderBmiStatus = getWeightCategory(olderVitals.weight, user.heightCm).status;

      const weightChangeRecent = latestVitals.weight - previousVitals.weight;
      const weightChangeOverall = latestVitals.weight - olderVitals.weight; // Consider a slightly longer trend

      if (weightChangeOverall > 1 && latestBmiStatus.includes('Overweight')) {
        predictions.push(`You've gained weight recently. Your BMI is **${latestBmiStatus}**. Consider increasing physical activity.`);
      } else if (weightChangeOverall > 2 && latestBmiStatus.includes('Obese')) {
        predictions.push(`Your weight is trending up and your BMI is **${latestBmiStatus}**. It's crucial to address this with diet and exercise.`);
      } else if (weightChangeOverall < -1 && latestBmiStatus.includes('Underweight')) {
        predictions.push(`You've lost weight recently and your BMI is **${latestBmiStatus}**. Ensure adequate caloric intake.`);
      } else if (weightChangeOverall < -1 && latestBmiStatus.includes('Normal Weight')) {
        predictions.push(`You've shown a small recent weight loss. Keep maintaining a healthy weight.`);
      }
    }

    // Temperature Prediction
    const latestTempCategory = getTemperatureCategory(latestVitals.temperature);
    if (latestTempCategory.status.includes('Fever')) {
        predictions.push(`Your temperature indicates a **Fever**. Rest and consider hydration.`);
    } else if (latestTempCategory.status.includes('Hypothermia')) {
        predictions.push(`Your temperature indicates **Hypothermia**. Seek medical advice immediately.`);
    }


    return predictions.length > 0 ? predictions : ['Your recent vital signs look stable. Keep up the good work!'];
  };

  const healthPredictions = getHealthPredictions();


  return (
    <div className="space-y-8 p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <Activity className="h-10 w-10 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health Vitals</h1>
            <p className="text-gray-600">Track and monitor your health metrics</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center sm:justify-end gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vitals</span>
          </button>
          {vitals.length > 0 && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>Download Report</span>
            </button>
          )}
        </div>
      </div>

      <div id="vitals-content" className="space-y-8">
        {vitals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Vitals Recorded</h2>
            <p className="text-gray-500 mb-6">Start tracking your health by adding your first vital signs</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Vitals</span>
            </button>
          </div>
        ) : (
          <>
            {/* Health Predictions/Insights */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Lightbulb className="h-6 w-6 text-yellow-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Health Insights & Predictions</h2>
                </div>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {healthPredictions.map((prediction, index) => (
                        <li key={index} className="flex items-start">
                            <span className="mr-2 text-yellow-500">•</span>
                            <p dangerouslySetInnerHTML={{ __html: prediction }}></p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Summary Statistics */}
            {stats && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7-Day Averages & Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 flex flex-col justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg. Blood Pressure</h3>
                    <p className={`text-3xl font-bold ${getBpCategory(stats.avgBP.systolic, stats.avgBP.diastolic).className}`}>
                      {stats.avgBP.systolic}/{stats.avgBP.diastolic} <span className="text-xl">mmHg</span>
                    </p>
                    <p className="text-sm text-gray-500">{getBpCategory(stats.avgBP.systolic, stats.avgBP.diastolic).status}</p>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 flex flex-col justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg. Heart Rate</h3>
                    <p className={`text-3xl font-bold ${getHeartRateCategory(stats.avgHeartRate).className}`}>
                      {stats.avgHeartRate} <span className="text-xl">bpm</span>
                    </p>
                    <p className="text-sm text-gray-500">{getHeartRateCategory(stats.avgHeartRate).status}</p>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 flex flex-col justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">SpO2 Range</h3>
                    <p className={`text-3xl font-bold ${getOxygenSaturationCategory(stats.minSpO2).className}`}>
                      {stats.minSpO2}-{stats.maxSpO2}%
                    </p>
                    <p className="text-sm text-gray-500">
                      Lowest: {getOxygenSaturationCategory(stats.minSpO2).status}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 flex flex-col justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg. Blood Sugar</h3>
                    <p className={`text-3xl font-bold ${getBloodSugarCategory(stats.avgBloodSugar).className}`}>
                      {stats.avgBloodSugar} <span className="text-xl">mg/dL</span>
                    </p>
                    <p className="text-sm text-gray-500">{getBloodSugarCategory(stats.avgBloodSugar).status}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pink-500 flex flex-col justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg. Temperature</h3>
                    <p className={`text-3xl font-bold ${getTemperatureCategory(stats.avgTemperature).className}`}>
                      {stats.avgTemperature.toFixed(1)} <span className="text-xl">°F</span>
                    </p>
                    <p className="text-sm text-gray-500">{getTemperatureCategory(stats.avgTemperature).status}</p>
                  </div>

                  {user?.heightCm && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 flex flex-col justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg. Weight / BMI</h3>
                      <p className={`text-3xl font-bold ${getWeightCategory(stats.avgWeight, user.heightCm).className}`}>
                        {stats.avgWeight.toFixed(1)} <span className="text-xl">kg</span>
                      </p>
                      <p className="text-sm text-gray-500">{getWeightCategory(stats.avgWeight, user.heightCm).status}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Chart Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">Trends Chart</h2>
                <div className="flex items-center space-x-4">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">All Metrics</option>
                    <option value="bloodPressure">Blood Pressure</option>
                    <option value="heartRate">Heart Rate</option>
                    <option value="bloodSugar">Blood Sugar</option>
                    <option value="oxygenSaturation">Oxygen Saturation</option>
                    <option value="temperature">Temperature</option>
                    <option value="weight">Weight</option>
                  </select>
                </div>
              </div>
              
              <div className="h-96 w-full"> {/* Ensure width is also 100% */}
                <Line data={getChartData()} options={chartOptions} />
              </div>
            </div>

            {/* Recent Vitals Table */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Measurements</h2>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Pressure</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heart Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SpO2</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Sugar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vitals.slice(0, 10).map((vital) => (
                      <tr key={vital.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(vital.date).toLocaleDateString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getBpCategory(vital.bloodPressureSystolic, vital.bloodPressureDiastolic).className}`}>
                          {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic} mmHg
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getHeartRateCategory(vital.heartRate).className}`}>
                          {vital.heartRate} bpm
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getOxygenSaturationCategory(vital.oxygenSaturation).className}`}>
                          {vital.oxygenSaturation}%
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getBloodSugarCategory(vital.bloodSugar).className}`}>
                          {vital.bloodSugar} mg/dL
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTemperatureCategory(vital.temperature).className}`}>
                          {vital.temperature.toFixed(1)} °F
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getWeightCategory(vital.weight, user?.heightCm || 0).className}`}>
                          {vital.weight.toFixed(1)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Vitals Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100 opacity-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Add New Vitals</h2>
            <p className="text-sm text-gray-600 mb-4">Fields marked with * are required.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="systolic" className="block text-sm font-medium text-gray-700 mb-1">
                    Systolic BP (mmHg) *
                  </label>
                  <input
                    id="systolic"
                    type="number"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => setFormData(prev => ({ ...prev, bloodPressureSystolic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., 120"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="diastolic" className="block text-sm font-medium text-gray-700 mb-1">
                    Diastolic BP (mmHg) *
                  </label>
                  <input
                    id="diastolic"
                    type="number"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => setFormData(prev => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., 80"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate (bpm) *
                </label>
                <input
                  id="heartRate"
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, heartRate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., 72"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="oxygenSaturation" className="block text-sm font-medium text-gray-700 mb-1">
                  Oxygen Saturation (%) *
                </label>
                <input
                  id="oxygenSaturation"
                  type="number"
                  value={formData.oxygenSaturation}
                  onChange={(e) => setFormData(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., 97"
                  min="70"
                  max="100"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="bloodSugar" className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Sugar (mg/dL) *
                </label>
                <input
                  id="bloodSugar"
                  type="number"
                  value={formData.bloodSugar}
                  onChange={(e) => setFormData(prev => ({ ...prev, bloodSugar: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., 110"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°F) *
                </label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., 98.6"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg) *
                </label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder={user?.weight?.toString() || "e.g., 70.0"}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows={2}
                  placeholder="Any additional notes about your health today..."
                />
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthVitals;