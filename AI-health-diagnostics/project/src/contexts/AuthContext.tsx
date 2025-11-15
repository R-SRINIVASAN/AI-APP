import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false); // set false immediately since there's no async

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (!email || !password) return false;

      // Simulated login – no token, no localStorage
      let userData: User;

      // Simulate checking "registered users" (could be fetched from API in real app)
      const name = email.split('@')[0];
      userData = {
        id: Date.now().toString(),
        name,
        email,
        age: 0,
        gender: 'Prefer not to say',
        height: 0,
        weight: 0,
        bloodGroup: '',
        emergencyContact: '',
        medications: [],
        smokingStatus: 'never',
        alcoholConsumption: 'never',
        exerciseFrequency: 'moderate',
        dietaryPreferences: [],
        familyHistory: [],
        occupation: '',
        createdAt: new Date(),
        profileCompleted: false,
      };

      // Only set user in memory
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    try {
      if (!user) return false;
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null); // clear only in-memory user
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    updateProfile,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};