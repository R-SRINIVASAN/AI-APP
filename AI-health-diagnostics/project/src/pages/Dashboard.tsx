import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HealthVital } from '../types';
import { 
  Heart, 
  Droplets, 
  Activity, 
  Thermometer,
  TrendingUp,
  Calendar,
  Stethoscope,
  FileText,
  Apple,
  MessageCircle,
  Download,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
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
import { PDFExportUtil } from '../utils/pdfExport';

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

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<HealthVital[]>([]);
  const [latestVitals, setLatestVitals] = useState<HealthVital | null>(null);

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
        setLatestVitals(parsedVitals[0] || null);
      }
    }
  }, [user]);

  const quickActions = [
    {
      title: 'Check Symptoms',
      description: 'AI-powered symptom analysis',
      icon: Stethoscope,
      link: '/symptoms',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    },
    {
      title: 'Add Vitals',
      description: 'Record your health metrics',
      icon: Activity,
      link: '/vitals',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'View Diet',
      description: 'Personalized meal plans',
      icon: Apple,
      link: '/diet',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'Ask Dr. Bot',
      description: 'Health questions & advice',
      icon: MessageCircle,
      link: '/chat',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    }
  ];

  const chartData = vitals.length > 0 ? {
    labels: vitals.slice(0, 7).reverse().map(v => new Date(v.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Systolic BP',
        data: vitals.slice(0, 7).reverse().map(v => v.bloodPressureSystolic),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Heart Rate',
        data: vitals.slice(0, 7).reverse().map(v => v.heartRate),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Blood Sugar',
        data: vitals.slice(0, 7).reverse().map(v => v.bloodSugar),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Health Trends (Last 7 Days)'
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
      await PDFExportUtil.generatePDF('dashboard-content', 'Health Dashboard Summary');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const calculateBMI = () => {
    if (user && user.height > 0 && user.weight > 0) {
      const heightInMeters = user.height / 100;
      return (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return 'N/A';
  };

  const getBMIStatus = (bmi: string) => {
    const bmiValue = parseFloat(bmi);
    if (isNaN(bmiValue)) return 'Unknown';
    if (bmiValue < 18.5) return 'Underweight';
    if (bmiValue < 25) return 'Normal';
    if (bmiValue < 30) return 'Overweight';
    return 'Obese';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">Here's your personalized health overview</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </button>
      </div>

      <div id="dashboard-content" className="space-y-8">
        {/* Profile Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Health Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Age</p>
              <p className="text-2xl font-bold text-gray-900">{user?.age || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">BMI</p>
              <p className="text-2xl font-bold text-gray-900">{calculateBMI()}</p>
              <p className="text-xs text-gray-500">{getBMIStatus(calculateBMI())}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Blood Group</p>
              <p className="text-2xl font-bold text-gray-900">{user?.bloodGroup || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Exercise Level</p>
              <p className="text-lg font-bold text-gray-900 capitalize">
                {user?.exerciseFrequency?.replace('_', ' ') || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Current Vitals */}
        {latestVitals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Blood Pressure</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}
                  </p>
                  <p className="text-xs text-gray-500">mmHg</p>
                </div>
                <Heart className="h-12 w-12 text-red-500 opacity-20" />
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Latest reading</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Oxygen Saturation</p>
                  <p className="text-2xl font-bold text-gray-900">{latestVitals.oxygenSaturation}%</p>
                  <p className="text-xs text-gray-500">SpO2</p>
                </div>
                <Droplets className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Latest reading</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Heart Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{latestVitals.heartRate}</p>
                  <p className="text-xs text-gray-500">bpm</p>
                </div>
                <Activity className="h-12 w-12 text-green-500 opacity-20" />
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Latest reading</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Blood Sugar</p>
                  <p className="text-2xl font-bold text-gray-900">{latestVitals.bloodSugar}</p>
                  <p className="text-xs text-gray-500">mg/dL</p>
                </div>
                <Thermometer className="h-12 w-12 text-orange-500 opacity-20" />
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Latest reading</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Vitals Recorded</h3>
            <p className="text-gray-500 mb-4">Start tracking your health by adding your first vital signs</p>
            <Link
              to="/vitals"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vitals</span>
            </Link>
          </div>
        )}

        {/* Health Trends Chart */}
        {chartData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Health Trends</h2>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} ${action.hoverColor} transition-colors`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Health Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Health Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Current Conditions</h3>
              <div className="space-y-2">
                {user?.diseases && user.diseases.length > 0 ? (
                  user.diseases.map((disease, index) => (
                    <span
                      key={index}
                      className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2"
                    >
                      {disease}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No conditions recorded</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Allergies</h3>
              <div className="space-y-2">
                {user?.allergies && user.allergies.length > 0 ? (
                  user.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2"
                    >
                      {allergy}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No allergies recorded</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Current Medications</h3>
              <div className="space-y-2">
                {user?.medications && user.medications.length > 0 ? (
                  user.medications.map((medication, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2"
                    >
                      {medication}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No medications recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Health Alerts */}
        {user?.diseases && user.diseases.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Health Reminders</h3>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  {user.diseases.includes('Diabetes') && (
                    <li>• Monitor blood sugar levels regularly and maintain a balanced diet</li>
                  )}
                  {user.diseases.includes('Hypertension') && (
                    <li>• Check blood pressure regularly and limit sodium intake</li>
                  )}
                  <li>• Schedule regular check-ups with your healthcare provider</li>
                  <li>• Take medications as prescribed and track your vitals</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;