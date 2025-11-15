import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileSetup from './components/ProfileSetup';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import SymptomChecker from './pages/SymptomChecker';
import HealthVitals from './pages/HealthVitals';
import LungCancerPredictor from './pages/LungCancerPredictor';
import DietPlanner from './pages/DietPlanner';
import MediBot from './pages/MediBot';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profile-setup" element={
            <ProtectedRoute>
              <ProfileSetupWrapper />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainAppWrapper />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard\" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="symptoms" element={<SymptomChecker />} />
            <Route path="vitals" element={<HealthVitals />} />
            <Route path="lung" element={<LungCancerPredictor />} />
            <Route path="diet" element={<DietPlanner />} />
            <Route path="chat" element={<MediBot />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Wrapper to handle profile completion check
const ProfileSetupWrapper: React.FC = () => {
  const [showSetup, setShowSetup] = React.useState(true);
  
  return showSetup ? (
    <ProfileSetup onComplete={() => setShowSetup(false)} />
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

// Wrapper to handle profile completion redirect
const MainAppWrapper: React.FC = () => {
  const { user } = React.useContext(AuthContext);
  
  if (user && !user.profileCompleted) {
    return <Navigate to="/profile-setup\" replace />;
  }
  
  return <Layout />;
};

export default App;